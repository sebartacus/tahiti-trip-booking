import { CHARTER_FORMULA_DETAILS, formatXpf } from "./charter-pricing";
import { isCharterFormula } from "./charter-availability";
import type { CharterInvoiceReservation } from "./charterInvoice";

type EmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments: { filename: string; content: string }[];
};

function html(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formulaLabel(value: string) {
  return isCharterFormula(value) ? CHARTER_FORMULA_DETAILS[value].label : value;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${value}T00:00:00Z`));
}

function specificDetails(reservation: CharterInvoiceReservation) {
  const details: string[] = [];
  if (reservation.formule.startsWith("tetiaroa")) {
    details.push("Votre charter comprend une navigation vers l’atoll de Tetiaroa.");
    if (reservation.nombre_personnes === 9) {
      details.push("Pour 9 participants, le 9e couchage est installé dans le carré du catamaran.");
    }
  } else if (reservation.formule.startsWith("moorea")) {
    details.push("Votre charter privé est prévu au départ de la Marina Taina vers Moorea.");
  } else if (reservation.formule === "sunset") {
    details.push("Horaire adapté au coucher du soleil.");
    details.push(
      reservation.champagne_supplement || reservation.sunset_drink === "champagne_included"
        ? "Boisson choisie : Champagne."
        : "Boisson choisie : Vin blanc."
    );
  }
  return details.map((detail) => `<p>${html(detail)}</p>`).join("");
}

function summary(reservation: CharterInvoiceReservation) {
  const dates = reservation.date_fin === reservation.date_debut
    ? dateLabel(reservation.date_debut)
    : `${dateLabel(reservation.date_debut)} au ${dateLabel(reservation.date_fin)}`;
  return `<ul>
    <li>Formule : ${html(formulaLabel(reservation.formule))}</li>
    <li>Dates : ${html(dates)}</li>
    <li>Participants : ${reservation.nombre_personnes}</li>
    <li>Montant total : ${html(formatXpf(reservation.montant_total))}</li>
    <li>Montant payé : ${html(formatXpf(reservation.montant_paye))}</li>
    <li>Solde restant : ${html(formatXpf(reservation.montant_solde))}</li>
  </ul>`;
}

export function buildCharterClientEmailHtml(reservation: CharterInvoiceReservation) {
  return `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
    <h1 style="color:#0f766e">Confirmation de votre charter Tahiti Trip</h1>
    <p>Bonjour ${html(reservation.responsable_prenom)},</p>
    <p>Votre paiement est confirmé et votre charter est réservé.</p>
    ${summary(reservation)}
    ${reservation.type_paiement === "deposit" ? "<p><strong>Le solde est à régler au plus tard la veille du départ.</strong></p>" : ""}
    ${specificDetails(reservation)}
    <p><strong>Rendez-vous : Marina Taina, Punaauia.</strong></p>
    <p>Votre facture PDF est jointe à cet e-mail.</p>
  </div>`;
}

export function buildCharterInternalEmailHtml(reservation: CharterInvoiceReservation) {
  return `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
    <h1>Nouveau charter payé</h1>
    <p>Client : ${html(reservation.responsable_prenom)} ${html(reservation.responsable_nom)}</p>
    <p>Téléphone : ${html(reservation.responsable_tel)}<br>Email : ${html(reservation.responsable_email)}</p>
    ${summary(reservation)}${specificDetails(reservation)}
  </div>`;
}

async function send(payload: EmailPayload, fetchFn: typeof fetch) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: "RESEND_API_KEY manquante" };
  const response = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return { error: (await response.text().catch(() => "")) || "Erreur envoi e-mail" };
  return { ok: true as const };
}

export function sendCharterCustomerEmail(options: {
  reservation: CharterInvoiceReservation;
  invoicePdf: Buffer;
  invoiceNumber: string;
  fetchFn?: typeof fetch;
}) {
  const { reservation, invoicePdf, invoiceNumber, fetchFn = fetch } = options;
  const from = process.env.EMAIL_FROM || "Tahiti Trip <onboarding@resend.dev>";
  return send({
    from,
    to: [reservation.responsable_email],
    subject: "Confirmation de votre charter Tahiti Trip",
    html: buildCharterClientEmailHtml(reservation),
    attachments: [{ filename: `${invoiceNumber}.pdf`, content: invoicePdf.toString("base64") }],
  }, fetchFn);
}

export function sendCharterInternalEmail(options: {
  reservation: CharterInvoiceReservation;
  invoicePdf: Buffer;
  invoiceNumber: string;
  fetchFn?: typeof fetch;
}) {
  const { reservation, invoicePdf, invoiceNumber, fetchFn = fetch } = options;
  const from = process.env.EMAIL_FROM || "Tahiti Trip <onboarding@resend.dev>";
  const internalEmail = process.env.INTERNAL_EMAIL || process.env.EMAIL_INTERNAL || "contact@tahiti-trip.com";
  return send({
    from,
    to: [internalEmail],
    subject: `Nouveau charter payé - ${invoiceNumber}`,
    html: buildCharterInternalEmailHtml(reservation),
    attachments: [{ filename: `${invoiceNumber}.pdf`, content: invoicePdf.toString("base64") }],
  }, fetchFn);
}

export async function sendCharterReservationEmails(options: {
  reservation: CharterInvoiceReservation;
  invoicePdf: Buffer;
  invoiceNumber: string;
  fetchFn?: typeof fetch;
}) {
  const customer = await sendCharterCustomerEmail(options);
  if (!("ok" in customer)) return customer;
  return sendCharterInternalEmail(options);
}
