import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isBoatActivity, isIsoDate } from "@/lib/boat-calendar";

type HoldBody = {
  date?: unknown;
  activity?: unknown;
  reservationId?: unknown;
  reservationTable?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json()) as HoldBody;
  const { date, activity, reservationId, reservationTable } = body;

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

  if (typeof reservationTable !== "string" || !reservationTable.trim()) {
    return NextResponse.json(
      { error: "reservationTable requis." },
      { status: 400 }
    );
  }

  const payload = {
    date,
    status: "hold",
    activity,
    reservation_id: reservationId,
    reservation_table: reservationTable,
  };

  const inserted = await supabase
    .from("boat_calendar_days")
    .insert(payload)
    .select(
      "id,date,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,created_at,updated_at"
    )
    .single();

  if (!inserted.error) {
    return NextResponse.json({ day: inserted.data }, { status: 201 });
  }

  if (inserted.error.code !== "23505") {
    return NextResponse.json(
      {
        error: "Impossible de poser le hold bateau.",
        details: inserted.error.message,
        code: inserted.error.code,
      },
      { status: 500 }
    );
  }

  const existing = await supabase
    .from("boat_calendar_days")
    .select("date,status,activity,reservation_id,reservation_table")
    .eq("date", date)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json(
      { error: "Impossible de verifier la disponibilite bateau." },
      { status: 500 }
    );
  }

  if (!existing.data || existing.data.status !== "available") {
    return NextResponse.json(
      {
        error: "Date bateau indisponible.",
        day: existing.data,
      },
      { status: 409 }
    );
  }

  const updated = await supabase
    .from("boat_calendar_days")
    .update(payload)
    .eq("date", date)
    .eq("status", "available")
    .select(
      "id,date,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,created_at,updated_at"
    )
    .single();

  if (updated.error) {
    return NextResponse.json(
      { error: "Impossible de poser le hold bateau." },
      { status: 409 }
    );
  }

  return NextResponse.json({ day: updated.data });
}
