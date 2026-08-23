import { buildBaleinesInvoicePdf } from "./baleinesInvoice";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}
const pdf = buildBaleinesInvoicePdf(
  {
    id: "salon-62500",
    date_sortie: "2026-10-10",
    depart: "07:00",
    responsable_prenom: "Client",
    responsable_nom: "Salon",
    responsable_email: null,
    responsable_telephone: null,
    participants: Array(6).fill({ role: "mise_eau" }),
    montant_total: 62_500,
    source_paiement: "salon_admin",
  },
  new Date("2026-08-25T12:00:00-10:00"),
  {
    salon: true,
    designation: "Offre Salon 5+1",
    composition: "6 mises à l'eau sur la même sortie",
    paymentMethod: "Carte bancaire - TPE",
    validUntil: "2026-11-20",
  },
).pdf.toString("latin1");
assert(pdf.includes("Offre Salon 5+1"), "Désignation 5+1 absente.");
assert(
  pdf.includes("6 mises a l'eau sur la meme sortie"),
  "Composition 5+1 absente.",
);
assert(pdf.includes("59 524"), "HT 5+1 incorrect.");
assert(pdf.includes("2 976"), "TVA 5+1 incorrecte.");
assert(pdf.includes("62 500"), "TTC 5+1 incorrect.");
assert(pdf.includes("Carte bancaire - TPE"), "Paiement Salon absent.");
assert(
  pdf.includes("Validite de l'offre : jusqu'au 20 novembre 2026"),
  "Validité Salon absente.",
);
