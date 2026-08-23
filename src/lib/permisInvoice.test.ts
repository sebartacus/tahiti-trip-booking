import {
  buildPermisInvoicePdf,
  getPermisInvoiceNumber,
} from "./permisInvoice";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const paidAt = new Date("2026-08-15T12:00:00-10:00");
const invoiceNumber = getPermisInvoiceNumber(1, paidAt);
assert(invoiceNumber === "PER-2026-000001", "Le numero de facture doit etre sequentiel.");

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
  paidAt
);

const content = pdf.toString("latin1");
assert(content.startsWith("%PDF-1.4"), "La facture doit etre un PDF.");
assert(
  (content.match(/\/Type \/Page\b/g) || []).length === 1,
  "La facture doit tenir sur une seule page."
);
assert(content.includes("PER-2026-000001"), "Le PDF doit contenir le numero de facture.");
assert(!content.includes("Validite de l'offre"), "La facture Permis normale ne doit pas afficher de validite Salon.");

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
    { validUntil: "2027-01-31" }
  ).pdf.toString("latin1");
  assert(salonInvoice.includes(salonCase.amount === 20900 ? "20 900" : "28 900"), `Le tarif ${salonCase.formule} doit être conservé.`);
  assert(salonInvoice.includes(salonCase.payment === "tpe" ? "Carte bancaire - TPE" : "Virement"), `Le paiement ${salonCase.payment} doit apparaître.`);
  assert(salonInvoice.includes("Validite de l'offre : jusqu'au 31 janvier 2027"), `La validité ${salonCase.formule} doit apparaître.`);
}

