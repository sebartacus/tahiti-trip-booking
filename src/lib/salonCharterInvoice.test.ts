import assert from "node:assert/strict";
import test from "node:test";
import { buildCharterInvoicePdf } from "./charterInvoice";
import { calculateSalonTax } from "./salonTax";

const base = {
  id: "salon-charter",
  date_debut: "Date à fixer",
  date_fin: "Date à fixer",
  formule: "tetiaroa_2j_1n",
  nombre_personnes: 9,
  responsable_prenom: "Maui",
  responsable_nom: "Test",
  responsable_email: "client@example.com",
  responsable_tel: "87 00 00 00",
  montant_total: 290000,
  montant_paye: 290000,
  montant_solde: 0,
  type_paiement: "full" as const,
  sunset_drink: null,
  champagne_supplement: false,
};

function yCoordinate(pdf: string, text: string) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = pdf.match(new RegExp(`Tf 54 (\\d+) Td \\(${escaped}`));
  assert.ok(match, `Ligne PDF introuvable : ${text}`);
  return Number(match[1]);
}

test("facture Charter Salon avec accents, TVA 5 % et date à fixer", () => {
  assert.deepEqual(calculateSalonTax(290000), {
    ht: 276190,
    tva: 13810,
    ttc: 290000,
    tauxTva: 0.05,
  });
  const pdf = buildCharterInvoicePdf(base, new Date("2026-08-25"), {
    salon: true,
    paymentMethod: "TPE",
    validUntil: "2027-01-31",
    showSalonBookingAccess: true,
  }).pdf.toString("latin1");

  assert.match(pdf, /\/Encoding \/WinAnsiEncoding/);
  assert.match(pdf, /Numéro/);
  assert.match(pdf, /Prénom/);
  assert.match(pdf, /Téléphone/);
  assert.match(pdf, /Catamaran privatisé/);
  assert.match(pdf, /Date de sortie : À fixer/);
  assert.match(pdf, /Mode de paiement : TPE/);
  assert.match(pdf, /Validité de l\\222offre : jusqu\\222au 31 janvier 2027/);
  assert.match(pdf, /Tous les montants sont exprimés en F CFP\./);
  assert.doesNotMatch(pdf, /Acompte encaissé/);
  assert.doesNotMatch(pdf, /Solde restant/);
  assert.doesNotMatch(pdf, /310 000/);
  assert.doesNotMatch(pdf, /PayZen/);
  assert.match(pdf,/42 194 511 80 re f/);assert.match(pdf,/42 170 511 1 re f/);assert.match(pdf,/42 144 Td \(Merci pour votre confiance\./);assert.match(pdf,/42 124 Td \(Tahiti Trip Fishing\)/);
});

test("facture Charter Salon avec dates réservées", () => {
  const pdf = buildCharterInvoicePdf(
    { ...base, date_debut: "2026-12-10", date_fin: "2026-12-11" },
    new Date("2026-08-25"),
    { salon: true, paymentMethod: "Espèces", validUntil: "31 janvier 2027" },
  ).pdf.toString("latin1");

  assert.match(pdf, /Date de sortie : 2026-12-10 au 2026-12-11/);
  assert.doesNotMatch(pdf, /Date de sortie : À fixer/);
  assert.doesNotMatch(pdf,/reprendre-offre/);
});

test("facture Charter Salon avec acompte sans chevauchement vertical", () => {
  const pdf = buildCharterInvoicePdf(
    {
      ...base,
      montant_paye: 87000,
      montant_solde: 203000,
      type_paiement: "deposit",
    },
    new Date("2026-08-25"),
    { salon: true, paymentMethod: "TPE", validUntil: "31 janvier 2027", showSalonBookingAccess: true },
  ).pdf.toString("latin1");

  assert.match(pdf, /Acompte encaissé : 87 000 F CFP/);
  assert.match(pdf, /Solde restant : 203 000 F CFP/);
  assert.match(pdf, /Solde à régler au plus tard la veille du départ\./);

  const verticalPositions = [
    "Total HT :",
    "TVA 5 % :",
    "Total TTC :",
    "Acompte encaissé :",
    "Solde restant :",
    "Solde à régler",
    "Mode de paiement :",
    "Validité de l\\222offre :",
    "Tous les montants",
  ].map((label) => yCoordinate(pdf, label));

  assert.equal(new Set(verticalPositions).size, verticalPositions.length);
  assert.deepEqual(
    verticalPositions,
    [...verticalPositions].sort((left, right) => right - left),
  );
  assert.match(pdf,/42 104 511 80 re f/);assert.match(pdf,/42 80 511 1 re f/);assert.match(pdf,/42 54 Td \(Merci pour votre confiance\./);assert.match(pdf,/42 34 Td \(Tahiti Trip Fishing\)/);
});
