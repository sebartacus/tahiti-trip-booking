import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isBoatSlot, isIsoDate } from "@/lib/boat-calendar";

type UnblockBody = {
  date?: unknown;
  slot?: unknown;
};

const SELECT_FIELDS =
  "id,date,slot,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,created_at,updated_at";

export async function POST(request: Request) {
  const body = (await request.json()) as UnblockBody;
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

  if (!existing.data || existing.data.status === "available") {
    return NextResponse.json({ slot: null, status: "available" });
  }

  if (existing.data.status === "reserved") {
    return NextResponse.json(
      { error: "Impossible de debloquer un creneau reserve." },
      { status: 409 }
    );
  }

  if (existing.data.status !== "blocked") {
    return NextResponse.json(
      { error: "Seul un creneau bloque peut etre debloque." },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("boat_calendar_slots")
    .update({
      status: "available",
      activity: null,
      reservation_id: null,
      reservation_table: null,
      blocked_reason: null,
      blocked_by: null,
      blocked_at: null,
    })
    .eq("date", date)
    .eq("slot", slot)
    .eq("status", "blocked")
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Impossible de debloquer le creneau bateau." },
      { status: 500 }
    );
  }

  return NextResponse.json({ slot: data });
}
