import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isBoatActivity, isIsoDate, normalizeBoatSlots } from "@/lib/boat-calendar";

type ConfirmBody = {
  date?: unknown;
  slots?: unknown;
  slot?: unknown;
  activity?: unknown;
  reservationId?: unknown;
};

const SELECT_FIELDS =
  "id,date,slot,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,created_at,updated_at";

export async function POST(request: Request) {
  const body = (await request.json()) as ConfirmBody;
  const { date, activity, reservationId } = body;
  const slots = normalizeBoatSlots(body.slots ?? body.slot);

  if (typeof reservationId !== "string" || !reservationId.trim()) {
    return NextResponse.json(
      { error: "reservationId requis." },
      { status: 400 }
    );
  }

  let query = supabase
    .from("boat_calendar_slots")
    .update({ status: "reserved" })
    .eq("status", "hold")
    .eq("reservation_id", reservationId);

  if (isIsoDate(date)) {
    query = query.eq("date", date);
  }

  if (isBoatActivity(activity)) {
    query = query.eq("activity", activity);
  }

  if (slots.length > 0) {
    query = query.in("slot", slots);
  }

  const { data, error } = await query
    .select(SELECT_FIELDS)
    .order("date", { ascending: true })
    .order("slot", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Impossible de confirmer la reservation bateau." },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Aucun hold bateau correspondant a confirmer." },
      { status: 409 }
    );
  }

  return NextResponse.json({ slots: data });
}
