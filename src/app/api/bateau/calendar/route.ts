import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isIsoDate } from "@/lib/boat-calendar";

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

  const { data, error } = await supabase
    .from("boat_calendar_days")
    .select(
      "id,date,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,created_at,updated_at"
    )
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Impossible de charger le calendrier bateau." },
      { status: 500 }
    );
  }

  return NextResponse.json({ days: data || [] });
}
