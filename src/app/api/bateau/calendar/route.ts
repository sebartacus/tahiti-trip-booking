import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isIsoDate } from "@/lib/boat-calendar";

const SELECT_FIELDS =
  "id,date,slot,status,activity,reservation_id,reservation_table,blocked_reason,blocked_by,blocked_at,expires_at,created_at,updated_at";

type BoatCalendarSlot = {
  id: string;
  date: string;
  slot: string;
  status: "available" | "hold" | "reserved" | "blocked";
  activity: string | null;
  reservation_id: string | null;
  reservation_table: string | null;
  blocked_reason: string | null;
  blocked_by: string | null;
  blocked_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReservationPaymentState = {
  id: string;
  statut_paiement: string | null;
  paye: boolean | null;
};

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

function isPaidReservation(reservation: ReservationPaymentState | undefined) {
  const status = String(reservation?.statut_paiement || "").toLowerCase();

  return reservation?.paye === true || status === "paid" || status === "paye";
}

async function getPaidReservationIds(
  table: "reservations_peche" | "reservations_baleines",
  ids: string[]
) {
  if (ids.length === 0) return new Set<string>();

  const { data, error } = await supabase
    .from(table)
    .select("id,statut_paiement,paye")
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    ((data || []) as ReservationPaymentState[])
      .filter(isPaidReservation)
      .map((reservation) => String(reservation.id))
  );
}

async function filterPublicCalendarSlots(slots: BoatCalendarSlot[]) {
  const pecheHoldIds = slots
    .filter(
      (slot) =>
        slot.status === "hold" &&
        slot.reservation_table === "reservations_peche" &&
        slot.reservation_id
    )
    .map((slot) => String(slot.reservation_id));
  const baleinesHoldIds = slots
    .filter(
      (slot) =>
        slot.status === "hold" &&
        slot.reservation_table === "reservations_baleines" &&
        slot.reservation_id
    )
    .map((slot) => String(slot.reservation_id));

  const [paidPecheIds, paidBaleinesIds] = await Promise.all([
    getPaidReservationIds("reservations_peche", [...new Set(pecheHoldIds)]),
    getPaidReservationIds("reservations_baleines", [
      ...new Set(baleinesHoldIds),
    ]),
  ]);

  return slots.filter((slot) => {
    if (slot.status !== "hold") return true;

    if (slot.reservation_table === "reservations_peche") {
      return Boolean(
        slot.reservation_id && paidPecheIds.has(String(slot.reservation_id))
      );
    }

    if (slot.reservation_table === "reservations_baleines") {
      return Boolean(
        slot.reservation_id && paidBaleinesIds.has(String(slot.reservation_id))
      );
    }

    return false;
  });
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

  try {
    const publicSlots = await filterPublicCalendarSlots(
      ((data || []) as BoatCalendarSlot[])
    );

    return NextResponse.json({ slots: publicSlots });
  } catch {
    return NextResponse.json(
      { error: "Impossible de filtrer le calendrier public." },
      { status: 500 }
    );
  }
}
