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
    amountPaid: 18_750,
    balance: 43_750,
    showSalonBookingAccess: true,
  },
).pdf.toString("latin1");
assert(pdf.includes("Offre Salon 5+1"), "Désignation 5+1 absente.");
assert(
  pdf.includes("6 mises à l'eau sur la même sortie"),
  "Composition 5+1 absente.",
);
assert(pdf.includes("59 524"), "HT 5+1 incorrect.");
assert(pdf.includes("2 976"), "TVA 5+1 incorrecte.");
assert(pdf.includes("62 500"), "TTC 5+1 incorrect.");
assert(pdf.includes("18 750"), "Acompte 5+1 incorrect.");
assert(pdf.includes("43 750"), "Solde 5+1 incorrect.");
assert(pdf.includes("Solde a regler le jour de la prestation.")||pdf.includes("Solde à régler le jour de la prestation."), "Mention de solde absente.");
assert(pdf.includes("Carte bancaire - TPE"), "Paiement Salon absent.");
assert(
  pdf.includes("Validité de l'offre : jusqu'au 20 novembre 2026")||pdf.includes("Validité de l\\222offre : jusqu\\222au 20 novembre 2026"),
  "Validité Salon absente.",
);
assert(pdf.includes("42 242 511 80 re f"), "Bloc de réservation mal positionné.");
assert(pdf.includes("42 218 511 1 re f"), "Séparateur du footer mal positionné.");
assert(pdf.includes("42 188 Td (Merci pour votre confiance."), "Footer mal positionné.");
assert(pdf.includes("42 168 Td (Tahiti Trip Fishing)"), "Signature du footer mal positionnée.");

const datedPdf=buildBaleinesInvoicePdf({id:"dated",date_sortie:"2026-10-10",depart:"13:15",responsable_prenom:"Client",responsable_nom:"Daté",responsable_email:null,responsable_telephone:null,participants:[{role:"observateur"}],montant_total:12500},new Date(),{salon:true,validUntil:"2026-11-20"}).pdf.toString("latin1");
assert(!datedPdf.includes("reprendre-offre"), "Le bloc ne doit pas apparaître sur une facture datée.");
