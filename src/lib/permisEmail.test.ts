import { buildPermisInvoicePdf } from "./permisInvoice";
import { sendPermisReservationEmails } from "./permisEmail";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const reservation = {
  id: 1,
  prenom: "Moana",
  nom: "Test",
  telephone: "+68987290700",
  email: "client@example.com",
  formule: "Classique",
  pricing_type: "promo_internet",
  pricing_amount: 19000,
  facture_numero: "PER-2026-000001",
  facture_url: "factures/permis/PER-2026-000001.pdf",
  examen: "Session du 19 août 2026",
  date_cours: "15/08/2026",
};

const { pdf } = buildPermisInvoicePdf(reservation, new Date("2026-08-15"));
const calls: unknown[] = [];
const previousApiKey = process.env.RESEND_API_KEY;
process.env.RESEND_API_KEY = "test-key";

const fakeFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
  calls.push(JSON.parse(String(init?.body || "{}")));
  return new Response("{}", { status: 200 });
}) as typeof fetch;

async function run() {
  const result = await sendPermisReservationEmails({
    reservation,
    invoicePdf: pdf,
    invoiceNumber: "PER-2026-000001",
    baseUrl: "https://example.com",
    fetchFn: fakeFetch,
  });

  process.env.RESEND_API_KEY = previousApiKey;

  assert(result.ok === true, "La simulation email doit reussir.");
  assert(calls.length === 2, "Un email client et un email interne doivent etre envoyes.");

  const customerPayload = calls[0] as {
    subject: string;
    html: string;
    attachments: unknown[];
  };

  assert(
    customerPayload.subject === "Confirmation de votre réservation – Permis côtier",
    "Le sujet client doit etre conforme."
  );
  assert(
    customerPayload.html.includes("PER-2026-000001"),
    "Le contenu client doit contenir le numero de facture."
  );
  assert(
    customerPayload.attachments.length === 3,
    "Le client doit recevoir facture, certificat et formulaire."
  );
}

run().catch((error) => {
  process.env.RESEND_API_KEY = previousApiKey;
  throw error;
});
