import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  isBoatActivity,
  isIsoDate,
  normalizeBoatSlots,
} from "@/lib/boat-calendar";
import {
  getPaymentDisplayStatus,
  releaseBoatHoldsForReservation,
  type PaymentReservationTable,
} from "@/lib/paymentReturn";

type HoldBody = {
  date?: unknown;
  slots?: unknown;
  slot?: unknown;
  activity?: unknown;
  reservationId?: unknown;
  reservationTable?: unknown;
};

const SELECT_FIELDS =
  "id,date,slot,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,expires_at,created_at,updated_at";

const HOLD_DURATION_MINUTES = 30;

function isPaymentReservationTable(
  value: unknown
): value is PaymentReservationTable {
  return value === "reservations_peche" || value === "reservations_baleines";
}

async function isUnpaidReservation(
  reservationTable: PaymentReservationTable,
  reservationId: string
) {
  const { data, error } = await supabase
    .from(reservationTable)
    .select("statut_paiement,paye")
    .eq("id", reservationId)
    .maybeSingle();

  if (error || !data) return false;

  return getPaymentDisplayStatus(data) !== "confirmed";
}

async function releaseExpiredHolds(nowIso: string) {
  return supabase
    .from("boat_calendar_slots")
    .update({
      status: "available",
      activity: null,
      reservation_id: null,
      reservation_table: null,
      blocked_reason: null,
      blocked_by: null,
      blocked_at: null,
      expires_at: null,
    })
    .eq("status", "hold")
    .lte("expires_at", nowIso);
}

export async function POST(request: Request) {
  const body = (await request.json()) as HoldBody;
  const { date, activity, reservationId, reservationTable } = body;
  const slots = normalizeBoatSlots(body.slots ?? body.slot);
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + HOLD_DURATION_MINUTES * 60 * 1000
  ).toISOString();

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

  const cleanup = await releaseExpiredHolds(nowIso);

  if (cleanup.error) {
    return NextResponse.json(
      { error: "Impossible de liberer les holds expires." },
      { status: 500 }
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

  const releasedHoldIds = new Set<string>();

  await Promise.all(
    (existing.data || []).map(async (calendarSlot) => {
      if (
        calendarSlot.status !== "hold" ||
        !isPaymentReservationTable(calendarSlot.reservation_table) ||
        !calendarSlot.reservation_id
      ) {
        return;
      }

      const reservationId = String(calendarSlot.reservation_id);
      const isUnpaid = await isUnpaidReservation(
        calendarSlot.reservation_table,
        reservationId
      );

      if (!isUnpaid) return;

      const releaseError = await releaseBoatHoldsForReservation(
        calendarSlot.reservation_table,
        reservationId
      );

      if (!releaseError) {
        releasedHoldIds.add(String(calendarSlot.id));
      }
    })
  );

  const conflicts = (existing.data || []).filter((calendarSlot) => {
    if (releasedHoldIds.has(String(calendarSlot.id))) return false;

    return calendarSlot.status !== "available";
  });

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
        expires_at: expiresAt,
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
