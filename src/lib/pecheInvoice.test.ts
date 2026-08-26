import assert from "node:assert/strict";
import test from "node:test";
import { buildPecheInvoicePdf } from "./pecheInvoice";
import { calculateSalonTax } from "./salonTax";

test("facture Salon Pêche calcule la TVA à 5 %", () => {
  assert.deepEqual(calculateSalonTax(79_000), { ht: 75_238, tva: 3_762, ttc: 79_000, tauxTva: 0.05 });
  const invoice = buildPecheInvoicePdf({ id: "sale-test", date_sortie: null, formule: "morning", slots: null, nombre_personnes: 4, responsable_prenom: "Test", responsable_nom: "Salon", responsable_email: null, responsable_telephone: "000", montant_paye: 79_000 }, new Date("2026-08-25T00:00:00Z"), { designation: "Privatisation du bateau — demi-journée", paymentMethod: "TPE", validUntil: "2027-01-31" });
  const pdf = invoice.pdf.toString("latin1");
  assert.match(pdf, /TVA 5 %/); assert.match(pdf, /79 000/); assert.match(pdf, /31\/01\/2027/);
});
