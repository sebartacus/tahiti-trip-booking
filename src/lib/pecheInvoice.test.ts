import assert from "node:assert/strict";
import test from "node:test";
import { buildPecheInvoicePdf } from "./pecheInvoice";
import { calculateSalonTax } from "./salonTax";

test("facture Salon Pêche calcule la TVA à 5 %", () => {
  assert.deepEqual(calculateSalonTax(79_000), { ht: 75_238, tva: 3_762, ttc: 79_000, tauxTva: 0.05 });
  const invoice = buildPecheInvoicePdf({ id: "sale-test", date_sortie: null, formule: "morning", slots: null, nombre_personnes: 4, responsable_prenom: "Test", responsable_nom: "Salon", responsable_email: null, responsable_telephone: "000", montant_paye: 79_000 }, new Date("2026-08-25T00:00:00Z"), { designation: "Privatisation du bateau — demi-journée", paymentMethod: "TPE", validUntil: "2027-01-31" });
  const pdf = invoice.pdf.toString("latin1");
  assert.match(pdf, /TVA 5 %/); assert.match(pdf, /79 000/); assert.match(pdf, /31\/01\/2027/);
  assert.match(pdf, /\/Encoding \/WinAnsiEncoding/);
  assert.match(pdf, /Numéro/);
  assert.match(pdf, /Prénom/);
  assert.match(pdf, /Téléphone/);
  assert.match(pdf, /Désignation/);
  assert.match(pdf, /Quantité/);
  assert.match(pdf, /demi-journée/);
  assert.match(pdf, /Tous les montants sont exprimés en F CFP\./);
  assert.match(pdf, /Date de sortie : À fixer/);
  assert.doesNotMatch(pdf, /Créneau : -/);
  assert.match(pdf, /Mode de règlement/);
  assert.match(pdf, /Montant payé/);
  assert.match(pdf, /Validité de l\\222offre/);
});

test("facture privatisation Pêche avec acompte",()=>{const invoice=buildPecheInvoicePdf({id:"deposit",date_sortie:null,formule:"morning",slots:null,nombre_personnes:4,responsable_prenom:"A",responsable_nom:"B",responsable_email:null,responsable_telephone:"1",montant_paye:23700},new Date(),{designation:"Privatisation",totalTtc:79000,amountPaid:23700,balance:55300});const pdf=invoice.pdf.toString("latin1");assert.match(pdf,/79 000/);assert.match(pdf,/23 700/);assert.match(pdf,/55 300/);assert.match(pdf,/Solde à régler/)});

test("facture Pêche réservée conserve la date et le créneau", () => {
  const invoice = buildPecheInvoicePdf({ id: "reserved-test", date_sortie: "2026-12-10", formule: "afternoon", slots: ["afternoon"], nombre_personnes: 1, responsable_prenom: "Élodie", responsable_nom: "Test", responsable_email: null, responsable_telephone: "000", montant_paye: 33_000 });
  const pdf = invoice.pdf.toString("latin1");
  assert.match(pdf, /Date de sortie : 2026-12-10/);
  assert.match(pdf, /Créneau : Après-midi/);
  assert.doesNotMatch(pdf, /À fixer/);
});
