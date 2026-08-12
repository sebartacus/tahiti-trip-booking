import { buildCharterInvoicePdf } from "./charterInvoice";

const result = buildCharterInvoicePdf({
  id: "00000000-0000-0000-0000-000000000123",
  date_debut: "2026-08-15", date_fin: "2026-08-16", formule: "tetiaroa_2j_1n",
  nombre_personnes: 9, responsable_prenom: "Maui", responsable_nom: "Test",
  responsable_email: "maui@example.com", responsable_tel: "87 00 00 00",
  montant_total: 310000, montant_paye: 93000, montant_solde: 217000,
  type_paiement: "deposit", sunset_drink: null, champagne_supplement: false,
}, new Date("2026-08-11T12:00:00Z"));

if (!result.pdf.toString("latin1").startsWith("%PDF-1.4")) throw new Error("Facture Charter PDF invalide.");
if (!result.pdf.toString("latin1").includes("CHA-2026-")) throw new Error("Numéro de facture absent.");
if (!result.pdf.toString("latin1").includes("217 000 F CFP")) throw new Error("Solde absent de la facture.");
