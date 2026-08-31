import crypto from "crypto";

type PaymentIntent = { reservationId: string; reservationTable: string; amount: number };

function secret() {
  const value = process.env.PAYMENT_INTENT_SECRET || process.env.PAYZEN_PRODUCTION_KEY || process.env.PAYZEN_TEST_KEY;
  if (!value) throw new Error("Secret de paiement serveur manquant.");
  return value;
}

function signature(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload, "utf8").digest("base64url");
}

export function createPaymentIntentToken(intent: PaymentIntent) {
  const payload = Buffer.from(JSON.stringify(intent), "utf8").toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyPaymentIntentToken(token: unknown, expected: PaymentIntent) {
  if (typeof token !== "string") return false;
  const [payload, received, extra] = token.split(".");
  if (!payload || !received || extra) return false;
  const calculated = signature(payload);
  const left = Buffer.from(received), right = Buffer.from(calculated);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PaymentIntent;
    return decoded.reservationId === expected.reservationId && decoded.reservationTable === expected.reservationTable && decoded.amount === expected.amount;
  } catch { return false; }
}
