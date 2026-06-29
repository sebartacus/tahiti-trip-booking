import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isBoatSlot, isIsoDate } from "@/lib/boat-calendar";

type BlockBody = {
  date?: unknown;
  slot?: unknown;
  reason?: unknown;
  blockedBy?: unknown;
};

const SELECT_FIELDS =
  "id,date,slot,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,created_at,updated_at";

export async function POST(request: Request) {
  const body = (await request.json()) as BlockBody;
  const { date, slot } = body;

  if (!isIsoDate(date) || !isBoatSlot(slot)) {
    return NextResponse.json(
      { error: "Date ou creneau invalide." },
      { status: 400 }
    );
  }

  const existing = await supabase
    .from("boat_calendar_slots")
    .select(SELECT_FIELDS)
    .eq("date", date)
    .eq("slot", slot)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json(
      { error: "Impossible de verifier le creneau bateau." },
      { status: 500 }
    );
  }

  if (existing.data?.status === "reserved") {
    return NextResponse.json(
      { error: "Impossible de bloquer un creneau deja reserve." },
      { status: 409 }
    );
  }

  const payload = {
    date,
    slot,
    status: "blocked",
    activity: null,
    reservation_id: null,
    reservation_table: null,
    blocked_reason:
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "Blocage manuel admin",
    blocked_by:
      typeof body.blockedBy === "string" && body.blockedBy.trim()
        ? body.blockedBy.trim()
        : "admin",
    blocked_at: new Date().toISOString(),
  };

  if (!existing.data) {
    const { data, error } = await supabase
      .from("boat_calendar_slots")
      .insert(payload)
      .select(SELECT_FIELDS)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Impossible de bloquer le creneau bateau." },
        { status: 500 }
      );
    }

    return NextResponse.json({ slot: data }, { status: 201 });
  }

  const { data, error } = await supabase
    .from("boat_calendar_slots")
    .update(payload)
    .eq("date", date)
    .eq("slot", slot)
    .neq("status", "reserved")
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Impossible de bloquer le creneau bateau." },
      { status: 500 }
    );
  }

  return NextResponse.json({ slot: data });
}
