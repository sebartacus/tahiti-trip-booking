import { getCharterPaymentAmounts, getCharterPrice, validateCharterBooking } from "./charter-pricing";

function assertEqual(actual: number, expected: number, message: string) {
  if (actual !== expected) throw new Error(`${message}: ${actual} !== ${expected}`);
}

const beforeSalon = new Date("2026-09-02T12:00:00-10:00");

assertEqual(getCharterPrice("tetiaroa_2j_1n", 2, false, beforeSalon), 310000, "Tetiaroa 2 personnes");
assertEqual(getCharterPrice("tetiaroa_2j_1n", 9, false, beforeSalon), 310000, "Tetiaroa 9 personnes");
assertEqual(getCharterPrice("moorea_matin", 4), 95000, "Moorea matin 4 personnes");
assertEqual(getCharterPrice("moorea_matin", 5), 100000, "Moorea matin 5 personnes");
assertEqual(getCharterPrice("moorea_matin", 12), 135000, "Moorea matin 12 personnes");
assertEqual(getCharterPrice("moorea_journee", 6), 145000, "Moorea journee 6 personnes");
assertEqual(getCharterPrice("moorea_journee", 7), 150000, "Moorea journee 7 personnes");
assertEqual(getCharterPrice("moorea_journee", 12), 175000, "Moorea journee 12 personnes");
assertEqual(getCharterPrice("sunset", 2), 75000, "Sunset 2 personnes vin");
assertEqual(getCharterPrice("sunset", 2, false), 75000, "Sunset 2 personnes champagne inclus");
assertEqual(getCharterPrice("sunset", 4), 85000, "Sunset 4 personnes vin");
assertEqual(getCharterPrice("sunset", 4, true), 100000, "Sunset 4 personnes champagne");

const deposit = getCharterPaymentAmounts(310000, "deposit");
assertEqual(deposit.deposit, 93000, "Acompte 30 pour cent");
assertEqual(deposit.balance, 217000, "Solde apres acompte");
assertEqual(deposit.amountToPay, 93000, "Montant acompte a payer");
assertEqual(
  getCharterPaymentAmounts(310000, "full").amountToPay,
  310000,
  "Paiement integral"
);
assertEqual(getCharterPaymentAmounts(310000, "full").balance, 0, "Solde paiement integral");

const validNine = {
  formula: "tetiaroa_2j_1n" as const,
  firstName: "Maui",
  lastName: "Test",
  phone: "87 00 00 00",
  email: "maui@example.com",
  participants: 9,
  sunsetDrinkSelected: false,
  sleepingAccepted: true,
  conditionsAccepted: true,
};
if (validateCharterBooking(validNine) !== "") throw new Error("Tetiaroa 9 confirme doit etre valide.");
if (!validateCharterBooking({ ...validNine, sleepingAccepted: false }).includes("couchages")) {
  throw new Error("Tetiaroa 9 sans confirmation doit etre refuse.");
}
