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

