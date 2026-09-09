import { buildPermisInvoicePdf, getPermisInvoiceNumber } from "./permisInvoice";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const paidAt = new Date("2026-08-15T12:00:00-10:00");
const invoiceNumber = getPermisInvoiceNumber(1, paidAt);
assert(
  invoiceNumber === "PER-2026-000001",
  "Le numero de facture doit etre sequentiel.",
);

const { pdf } = buildPermisInvoicePdf(
  {
    id: 1,
    prenom: "Moana",
    nom: "Test",
    telephone: "+68987290700",
    email: "client@example.com",
    formule: "Classique",
    pricing_type: "promo_internet",
    pricing_amount: 19000,
  },
  paidAt,
);

const content = pdf.toString("latin1");
assert(content.startsWith("%PDF-1.4"), "La facture doit etre un PDF.");
assert(
  (content.match(/\/Type \/Page\b/g) || []).length === 1,
  "La facture doit tenir sur une seule page.",
);
assert(
  content.includes("PER-2026-000001"),
  "Le PDF doit contenir le numero de facture.",
);
assert(
  !content.includes("Validite de l'offre"),
  "La facture Permis normale ne doit pas afficher de validite Salon.",
);

for (const salonCase of [
  { formule: "Classique", amount: 20900, payment: "tpe" },
  { formule: "Sérénité", amount: 28900, payment: "virement" },
]) {
  const salonInvoice = buildPermisInvoicePdf(
    {
      id: salonCase.amount,
      prenom: "Client",
      nom: "Salon",
      telephone: "+68987000000",
      email: null,
      formule: salonCase.formule,
      pricing_type: "salon_tourisme",
      pricing_amount: salonCase.amount,
      mode_paiement: salonCase.payment,
    },
    paidAt,
    { validUntil: "2027-01-31" },
  ).pdf.toString("latin1");
  assert(
    salonInvoice.includes(salonCase.amount === 20900 ? "20 900" : "28 900"),
    `Le tarif ${salonCase.formule} doit être conservé.`,
  );
  assert(
    salonInvoice.includes(
      salonCase.payment === "tpe" ? "Carte bancaire - TPE" : "Virement",
    ),
    `Le paiement ${salonCase.payment} doit apparaître.`,
  );
  assert(
    salonInvoice.includes("Validite de l'offre : jusqu'au 31 janvier 2027"),
    `La validité ${salonCase.formule} doit apparaître.`,
  );
  const expected =
    salonCase.amount === 20900
      ? { ht: "19 905", tva: "995" }
      : { ht: "19 905", tva: "995" };
  assert(
    salonInvoice.includes(expected.ht),
    `Le HT ${salonCase.formule} est incorrect.`,
  );
  assert(
    salonInvoice.includes(expected.tva),
    `La TVA ${salonCase.formule} est incorrecte.`,
  );
}

function pdfCell(pdf: string, x: number, y: number) {
  const line = pdf.split("\n").find(line => line.includes(` ${x} ${y} Td (`));
  assert(!!line, `Cellule absente : ${x},${y}`);
  return line!.split(" Td (")[1].split(") Tj")[0];
}
const invoiceCases = [
  { formula: "Classique", type: "normal", total: 25000, service: 25000, ht: 23810, vat: 1190, stamps: 0 },
  { formula: "Sérénité", type: "normal", total: 33000, service: 25000, ht: 23810, vat: 1190, stamps: 8000 },
  { formula: "Classique", type: "salon_tourisme", total: 20900, service: 20900, ht: 19905, vat: 995, stamps: 0 },
  { formula: "Sérénité", type: "salon_tourisme", total: 28900, service: 20900, ht: 19905, vat: 995, stamps: 8000 },
  { formula: "Sérénité", type: "promo_internet", total: 27000, service: 19000, ht: 18095, vat: 905, stamps: 8000 },
];
for (const expected of invoiceCases) {
  for (const validUntil of [undefined, "2027-01-31"]) {
    const reservation = { id: 123, prenom: "Fictif", nom: "Controle", telephone: null, email: null,
      formule: expected.formula, pricing_type: expected.type, pricing_amount: expected.total };
    const pdf = buildPermisInvoicePdf(reservation, paidAt, { validUntil }).pdf.toString("latin1");
    const y = expected.stamps ? 566 : 558;
    const numberAt = (x: number, y: number) => Number(pdfCell(pdf, x, y).replace(/ /g, ""));
    const ht = numberAt(354, y), vat = numberAt(443, y);
    assert(ht === expected.ht && vat === expected.vat, "HT/TVA incorrects pour " + expected.total);
    assert(numberAt(505, y) === expected.service, "TTC prestation incorrect");
    assert((pdf.match(/\/Type \/Page\b/g) || []).length === 1, "PDF sur une page");
    assert(pdf.startsWith("%PDF-1.4") && pdf.endsWith("%%EOF"), "PDF invalide");
    assert(pdf.includes("PER-2026-000123"), "Numéro conservé");
    const money = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    assert(pdf.includes(`(Montant paye : ${money(expected.total)} F CFP)`), "Total payé incorrect");
    let stamps = 0;
    if (expected.stamps) {
      assert(pdfCell(pdf, 54, 542) === "Timbres fiscaux", "Ligne timbres absente");
      assert(pdfCell(pdf, 54, 531) === "Non soumis a TVA", "Mention fiscale absente");
      assert(numberAt(443, 542) === 0, "Timbres taxés");
      stamps = numberAt(505, 542);
      assert(stamps === 8000, "Timbres incorrects");
      assert(pdfCell(pdf, 42, 382) === `HT prestation taxable : ${money(ht)} F CFP`, "Récapitulatif HT");
      assert(pdfCell(pdf, 42, 368) === `TVA 5 % : ${money(vat)} F CFP`, "Récapitulatif TVA");
      assert(pdfCell(pdf, 42, 354) === "Timbres fiscaux non soumis a TVA : 8 000 F CFP", "Récapitulatif timbres");
      assert(pdfCell(pdf, 42, 340) === `TOTAL TTC paye : ${money(expected.total)} F CFP`, "Récapitulatif total");
    } else {
      // The unchanged document checklist can mention stamps, but no financial row may bill them.
      assert(!pdf.includes("(Timbres fiscaux) Tj"), "Timbres facturés en Classique");
      assert(!pdf.includes("(Non soumis a TVA) Tj"), "Ligne supplémentaire en Classique");
    }
    assert(ht + vat + stamps === reservation.pricing_amount, "HT + TVA + timbres = total payé");
    assert(reservation.pricing_amount === expected.total, "Montant source inchangé");
  }
}
console.log("Factures Permis : 5 tarifs, 2 modes de validité, lignes PDF et totaux validés.");
