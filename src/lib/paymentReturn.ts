import { supabase } from "@/lib/supabase";

export type PaymentDisplayStatus = "confirmed" | "pending" | "failed";

export type PaymentReservationTable =
  | "reservations_peche"
  | "reservations_baleines";

const PAID_STATUSES = new Set(["paid", "paye"]);
const FAILED_STATUSES = new Set([
  "cancelled",
  "canceled",
  "failed",
  "refused",
  "abandoned",
  "unpaid",
]);
const ACCEPTED_PAYZEN_STATUSES = new Set(["AUTHORISED"]);

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getReturnReservationId(
  params: Record<string, string | string[] | undefined>
) {
  return (
    firstParam(params.vads_order_id) ||
    firstParam(params.reservationId) ||
    firstParam(params.reservation_id) ||
    firstParam(params.id) ||
    ""
  );
}

export function getPayzenReturnStatus(
  params: Record<string, string | string[] | undefined>
) {
  return firstParam(params.vads_trans_status) || "";
}

export function isExplicitPayzenFailure(status: string) {
  return Boolean(status) && !ACCEPTED_PAYZEN_STATUSES.has(status);
}

export function getPaymentDisplayStatus(reservation: {
  statut_paiement?: string | null;
  paye?: boolean | null;
}) {
  const statut = String(reservation.statut_paiement || "").toLowerCase();

  if (reservation.paye === true || PAID_STATUSES.has(statut)) {
    return "confirmed";
  }

  if (FAILED_STATUSES.has(statut)) {
    return "failed";
  }

  return "pending";
}

export async function releaseBoatHoldsForReservation(
  reservationTable: PaymentReservationTable,
  reservationId: string
) {
  if (!reservationId) return "";

  const { error } = await supabase
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
    .eq("reservation_table", reservationTable)
    .eq("reservation_id", reservationId);

  return error?.message || "";
}

export async function releaseUnpaidBoatHoldsForReservation(
  reservationTable: PaymentReservationTable,
  reservationId: string
) {
  if (!reservationId) return "";

  const current = await supabase
    .from(reservationTable)
    .select("statut_paiement,paye")
    .eq("id", reservationId)
    .maybeSingle();

  if (current.error) return current.error.message;
  if (!current.data) return "";
  if (getPaymentDisplayStatus(current.data) === "confirmed") return "";

  return releaseBoatHoldsForReservation(reservationTable, reservationId);
}

export async function markReservationPaymentFailed(
  reservationTable: PaymentReservationTable,
  reservationId: string
) {
  if (!reservationId) return "";

  const current = await supabase
    .from(reservationTable)
    .select("statut_paiement,paye")
    .eq("id", reservationId)
    .maybeSingle();

  if (current.error) return current.error.message;
  if (!current.data) return "";
  if (getPaymentDisplayStatus(current.data) === "confirmed") return "";

  const { error } = await supabase
    .from(reservationTable)
    .update({
      statut_paiement: "failed",
      paye: false,
    })
    .eq("id", reservationId);

  if (error) return error.message;

  return releaseBoatHoldsForReservation(reservationTable, reservationId);
}
