import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  isBoatActivity,
  isIsoDate,
  normalizeBoatSlots,
} from "@/lib/boat-calendar";

type ConfirmBody = {
  date?: unknown;
  slots?: unknown;
  slot?: unknown;
  activity?: unknown;
  reservationId?: unknown;
  reservationTable?: unknown;
};

const SELECT_FIELDS =
  "id,date,slot,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,expires_at,created_at,updated_at";

function departToSlot(depart: unknown) {
  if (depart === "07:00") return "morning";
  if (depart === "13:15") return "afternoon";
  return "";
}

function normalizeStoredSlots(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (slot): slot is "morning" | "afternoon" =>
      slot === "morning" || slot === "afternoon"
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as ConfirmBody;
  const { date, activity, reservationId, reservationTable } = body;
  const slots = normalizeBoatSlots(body.slots ?? body.slot);
  const nowIso = new Date().toISOString();

  if (typeof reservationId !== "string" || !reservationId.trim()) {
    return NextResponse.json(
      { error: "reservationId requis." },
      { status: 400 }
    );
  }

  let query = supabase
    .from("boat_calendar_slots")
    .update({ status: "reserved", expires_at: null })
    .eq("status", "hold")
    .eq("reservation_id", reservationId)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (typeof reservationTable === "string" && reservationTable.trim()) {
    query = query.eq("reservation_table", reservationTable.trim());
  }

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
    let expiredQuery = supabase
      .from("boat_calendar_slots")
      .select(SELECT_FIELDS)
      .eq("status", "hold")
      .eq("reservation_id", reservationId)
      .lte("expires_at", nowIso);

    if (typeof reservationTable === "string" && reservationTable.trim()) {
      expiredQuery = expiredQuery.eq("reservation_table", reservationTable.trim());
    }

    if (isIsoDate(date)) {
      expiredQuery = expiredQuery.eq("date", date);
    }

    if (isBoatActivity(activity)) {
      expiredQuery = expiredQuery.eq("activity", activity);
    }

    if (slots.length > 0) {
      expiredQuery = expiredQuery.in("slot", slots);
    }

    const expired = await expiredQuery;

    if (expired.error) {
      return NextResponse.json(
        { error: "Impossible de verifier l'expiration du hold bateau." },
        { status: 500 }
      );
    }

    if (expired.data && expired.data.length > 0) {
      return NextResponse.json(
        { error: "Le hold bateau a expire. Le creneau doit etre reserve a nouveau." },
        { status: 409 }
      );
    }

    let reservedQuery = supabase
      .from("boat_calendar_slots")
      .select(SELECT_FIELDS)
      .eq("status", "reserved")
      .eq("reservation_id", reservationId);

    if (typeof reservationTable === "string" && reservationTable.trim()) {
      reservedQuery = reservedQuery.eq("reservation_table", reservationTable.trim());
    }

    if (isIsoDate(date)) {
      reservedQuery = reservedQuery.eq("date", date);
    }

    if (isBoatActivity(activity)) {
      reservedQuery = reservedQuery.eq("activity", activity);
    }

    if (slots.length > 0) {
      reservedQuery = reservedQuery.in("slot", slots);
    }

    const reserved = await reservedQuery
      .order("date", { ascending: true })
      .order("slot", { ascending: true });

    if (reserved.error) {
      return NextResponse.json(
        { error: "Impossible de verifier le creneau deja confirme." },
        { status: 500 }
      );
    }

    if (reserved.data && reserved.data.length > 0) {
      return NextResponse.json({ slots: reserved.data });
    }

    const pecheReservation = await supabase
      .from("reservations_peche")
      .select("date_sortie,slots")
      .eq("id", reservationId)
      .maybeSingle();

    if (pecheReservation.error) {
      return NextResponse.json(
        { error: "Impossible de retrouver la reservation Peche." },
        { status: 500 }
      );
    }

    const pecheSlots = normalizeStoredSlots(pecheReservation.data?.slots);

    if (pecheReservation.data?.date_sortie && pecheSlots.length > 0) {
      const pecheFallback = await supabase
        .from("boat_calendar_slots")
        .update({ status: "reserved", expires_at: null })
        .eq("date", pecheReservation.data.date_sortie)
        .eq("activity", "peche")
        .in("slot", pecheSlots)
        .eq("status", "hold")
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .select(SELECT_FIELDS);

      if (pecheFallback.error) {
        return NextResponse.json(
          { error: "Impossible de confirmer le creneau Peche." },
          { status: 500 }
        );
      }

      if (pecheFallback.data && pecheFallback.data.length > 0) {
        return NextResponse.json({ slots: pecheFallback.data });
      }

      return NextResponse.json(
        { error: "Le hold bateau a expire. Le creneau doit etre reserve a nouveau." },
        { status: 409 }
      );
    }

    const reservation = await supabase
      .from("reservations_baleines")
      .select("date_sortie,depart")
      .eq("id", reservationId)
      .maybeSingle();

    if (reservation.error) {
      return NextResponse.json(
        { error: "Impossible de retrouver la reservation Baleines." },
        { status: 500 }
      );
    }

    const fallbackSlot = departToSlot(reservation.data?.depart);

    if (!reservation.data?.date_sortie || !fallbackSlot) {
      return NextResponse.json(
        { error: "Aucun hold bateau correspondant a confirmer." },
        { status: 409 }
      );
    }

    const fallback = await supabase
      .from("boat_calendar_slots")
      .update({ status: "reserved", expires_at: null })
      .eq("date", reservation.data.date_sortie)
      .eq("slot", fallbackSlot)
      .eq("activity", "baleines")
      .eq("status", "hold")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .select(SELECT_FIELDS);

    if (fallback.error) {
      return NextResponse.json(
        { error: "Impossible de confirmer le creneau Baleines." },
        { status: 500 }
      );
    }

    if (!fallback.data || fallback.data.length === 0) {
      return NextResponse.json(
        { error: "Le hold bateau a expire. Le creneau doit etre reserve a nouveau." },
        { status: 409 }
      );
    }

    return NextResponse.json({ slots: fallback.data });
  }

  return NextResponse.json({ slots: data });
}
