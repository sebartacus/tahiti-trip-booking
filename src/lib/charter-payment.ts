import crypto from "crypto";
import { isCharterFormula } from "./charter-availability";
import { getCharterPaymentAmounts, getCharterPrice } from "./charter-pricing";

export const PAYZEN_ACCEPTED_STATUS = "AUTHORISED";

export type CharterPaymentReservation = {
  id: string;
  formule: unknown;
  nombre_personnes: unknown;
  montant_total: unknown;
  montant_paye: unknown;
  montant_solde: unknown;
  type_paiement: unknown;
  statut_paiement: unknown;
  paye: unknown;
  champagne_supplement: unknown;
};

export function getExpectedCharterPayment(reservation: CharterPaymentReservation) {
  if (!isCharterFormula(reservation.formule)) {
    throw new Error("Formule Charter invalide.");
  }
  if (reservation.type_paiement !== "deposit" && reservation.type_paiement !== "full") {
    throw new Error("Type de paiement Charter invalide.");
  }

  const participants = Number(reservation.nombre_personnes);
  const normalTotal = getCharterPrice(
    reservation.formule,
    participants,
    reservation.champagne_supplement === true,
    new Date("2026-01-01T00:00:00Z")
  );
  const storedTotal = Number(reservation.montant_total);
  const salonTotal = reservation.formule === "tetiaroa_2j_1n" ? 290000 : normalTotal;
  if (storedTotal !== normalTotal && storedTotal !== salonTotal) throw new Error("Montant total Charter invalide.");
  const total = storedTotal;
  const payment = getCharterPaymentAmounts(total, reservation.type_paiement);

  if (
    Number(reservation.montant_total) !== total ||
    Number(reservation.montant_paye) !== payment.amountToPay ||
    Number(reservation.montant_solde) !== payment.balance
  ) {
    throw new Error("Montants Charter incohérents.");
  }

  return { formula: reservation.formule, total, ...payment };
}

export function signPayzen(fields: Record<string, string>, key: string) {
  const chain =
    Object.keys(fields)
      .filter((name) => name.startsWith("vads_"))
      .sort()
      .map((name) => fields[name])
      .join("+") +
    "+" +
    key;

  return crypto.createHmac("sha256", key).update(chain, "utf8").digest("base64");
}

export function verifyPayzenSignature(
  fields: Record<string, string>,
  receivedSignature: string,
  key: string
) {
  const expected = Buffer.from(signPayzen(fields, key));
  const received = Buffer.from(receivedSignature);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export function formatPayzenDate(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
  ].join("");
}

export function getPayzenKey(contextMode: string) {
  return contextMode === "PRODUCTION"
    ? process.env.PAYZEN_PRODUCTION_KEY
    : process.env.PAYZEN_TEST_KEY;
}

export function getPayzenTransactionReference(fields: Record<string, string>) {
  const uuid = fields.vads_trans_uuid?.trim();
  return uuid || `${fields.vads_trans_date || ""}-${fields.vads_trans_id || ""}`;
}

export function getRequestBaseUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
  return host ? `${protocol}://${host}` : requestUrl.origin;
}
