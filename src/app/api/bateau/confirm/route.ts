import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isBoatActivity, isIsoDate } from "@/lib/boat-calendar";

type ConfirmBody = {
  date?: unknown;
  activity?: unknown;
  reservationId?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ConfirmBody;
  const { date, activity, reservationId } = body;

  if (!isIsoDate(date) || !isBoatActivity(activity)) {
    return NextResponse.json(
      { error: "Date ou activite bateau invalide." },
      { status: 400 }
    );
  }

  if (typeof reservationId !== "string" || !reservationId.trim()) {
    return NextResponse.json(
      { error: "reservationId requis." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("boat_calendar_days")
    .update({ status: "reserved" })
    .eq("date", date)
    .eq("status", "hold")
    .eq("activity", activity)
    .eq("reservation_id", reservationId)
    .select(
      "id,date,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,created_at,updated_at"
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Impossible de confirmer la reservation bateau." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Aucun hold bateau correspondant a confirmer." },
      { status: 409 }
    );
  }

  return NextResponse.json({ day: data });
}
