import assert from "node:assert/strict";
import test from "node:test";
import { createPaymentIntentToken, verifyPaymentIntentToken } from "./payment-intent";

test("le jeton verrouille réservation, table et montant", () => {
  process.env.PAYMENT_INTENT_SECRET = "test-secret";
  const intent = { reservationId: "abc", reservationTable: "reservations_peche", amount: 79000 };
  const token = createPaymentIntentToken(intent);
  assert.equal(verifyPaymentIntentToken(token, intent), true);
  assert.equal(verifyPaymentIntentToken(token, { ...intent, amount: 1 }), false);
  assert.equal(verifyPaymentIntentToken(`${token}x`, intent), false);
});
