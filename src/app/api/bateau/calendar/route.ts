import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isIsoDate } from "@/lib/boat-calendar";

const SELECT_FIELDS =
  "id,date,slot,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,expires_at,created_at,updated_at";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!isIsoDate(from) || !isIsoDate(to)) {
    return NextResponse.json(
      { error: "Parametres from et to requis au format YYYY-MM-DD." },
      { status: 400 }
    );
  }

  if (from > to) {
    return NextResponse.json(
      { error: "La date from doit etre avant la date to." },
      { status: 400 }
    );
  }

  const cleanup = await releaseExpiredHolds(new Date().toISOString());

  if (cleanup.error) {
    return NextResponse.json(
      { error: "Impossible de liberer les holds expires." },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("boat_calendar_slots")
    .select(SELECT_FIELDS)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true })
    .order("slot", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Impossible de charger le calendrier bateau." },
      { status: 500 }
    );
  }

  return NextResponse.json({ slots: data || [] });
}
