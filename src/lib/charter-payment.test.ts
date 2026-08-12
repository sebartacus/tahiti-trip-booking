import {
  getExpectedCharterPayment,
  signPayzen,
  verifyPayzenSignature,
} from "./charter-payment";

function reservation(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    formule: "tetiaroa_2j_1n",
    nombre_personnes: 2,
    montant_total: 310000,
    montant_paye: 93000,
    montant_solde: 217000,
    type_paiement: "deposit",
    statut_paiement: "pending",
    paye: false,
    champagne_supplement: false,
    ...overrides,
  };
}

const deposit = getExpectedCharterPayment(reservation());
if (deposit.amountToPay !== 93000 || deposit.balance !== 217000) {
  throw new Error("Calcul PayZen acompte Tetiaroa incorrect.");
}

const full = getExpectedCharterPayment(
  reservation({ type_paiement: "full", montant_paye: 310000, montant_solde: 0 })
);
if (full.amountToPay !== 310000 || full.balance !== 0) {
  throw new Error("Calcul PayZen intégral Tetiaroa incorrect.");
}

const moorea = getExpectedCharterPayment(
  reservation({
    formule: "moorea_matin",
    nombre_personnes: 5,
    montant_total: 100000,
    montant_paye: 30000,
    montant_solde: 70000,
  })
);
if (moorea.amountToPay !== 30000) throw new Error("Acompte Moorea incorrect.");

const sunset = getExpectedCharterPayment(
  reservation({
    formule: "sunset",
    nombre_personnes: 4,
    champagne_supplement: true,
    montant_total: 100000,
    montant_paye: 30000,
    montant_solde: 70000,
  })
);
if (sunset.amountToPay !== 30000) throw new Error("Acompte Sunset incorrect.");

let falsifiedRejected = false;
try {
  getExpectedCharterPayment(reservation({ montant_paye: 1 }));
} catch {
  falsifiedRejected = true;
}
if (!falsifiedRejected) throw new Error("Un montant falsifié doit être rejeté.");

const fields = { vads_amount: "93000", vads_currency: "953", vads_site_id: "123" };
const signature = signPayzen(fields, "secret");
if (!verifyPayzenSignature(fields, signature, "secret")) throw new Error("Signature valide rejetée.");
if (verifyPayzenSignature(fields, signature, "other")) throw new Error("Signature invalide acceptée.");
