import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  isBoatActivity,
  isIsoDate,
  normalizeBoatSlots,
} from "@/lib/boat-calendar";

type HoldBody = {
  date?: unknown;
  slots?: unknown;
  slot?: unknown;
  activity?: unknown;
  reservationId?: unknown;
  reservationTable?: unknown;
};

const SELECT_FIELDS =
  "id,date,slot,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,created_at,updated_at";

export async function POST(request: Request) {
  const body = (await request.json()) as HoldBody;
  const { date, activity, reservationId, reservationTable } = body;
  const slots = normalizeBoatSlots(body.slots ?? body.slot);

  if (!isIsoDate(date) || !isBoatActivity(activity) || slots.length === 0) {
    return NextResponse.json(
      { error: "Date, activite ou creneau bateau invalide." },
      { status: 400 }
    );
  }

  if (typeof reservationId !== "string" || !reservationId.trim()) {
    return NextResponse.json(
      { error: "reservationId requis." },
      { status: 400 }
    );
  }

  if (typeof reservationTable !== "string" || !reservationTable.trim()) {
    return NextResponse.json(
      { error: "reservationTable requis." },
      { status: 400 }
    );
  }

  const existing = await supabase
    .from("boat_calendar_slots")
    .select(SELECT_FIELDS)
    .eq("date", date)
    .in("slot", slots);

  if (existing.error) {
    return NextResponse.json(
      { error: "Impossible de verifier la disponibilite bateau." },
      { status: 500 }
    );
  }

  const conflicts = (existing.data || []).filter(
    (calendarSlot) => calendarSlot.status !== "available"
  );

  if (conflicts.length > 0) {
    return NextResponse.json(
      {
        error: "Creneau bateau indisponible.",
        conflicts,
      },
      { status: 409 }
    );
  }

  const updates = await Promise.all(
    slots.map(async (slot) => {
      const existingSlot = (existing.data || []).find(
        (calendarSlot) => calendarSlot.slot === slot
      );

      const payload = {
        date,
        slot,
        status: "hold",
        activity,
        reservation_id: reservationId,
        reservation_table: reservationTable,
        blocked_reason: null,
        blocked_by: null,
        blocked_at: null,
      };

      if (!existingSlot) {
        return supabase
          .from("boat_calendar_slots")
          .insert(payload)
          .select(SELECT_FIELDS)
          .single();
      }

      return supabase
        .from("boat_calendar_slots")
        .update(payload)
        .eq("date", date)
        .eq("slot", slot)
        .eq("status", "available")
        .select(SELECT_FIELDS)
        .single();
    })
  );

  const failed = updates.find((result) => result.error);

  if (failed?.error) {
    return NextResponse.json(
      {
        error: "Impossible de poser le hold bateau.",
        details: failed.error.message,
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { slots: updates.map((result) => result.data) },
    { status: 201 }
  );
}
