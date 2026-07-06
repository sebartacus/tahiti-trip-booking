import { readFile } from "fs/promises";
import * as path from "path";
import { permisDocuments } from "./permisDocuments";
import type { PermisInvoiceReservation } from "./permisInvoice";

type EmailAttachment = {
  filename: string;
  content: string;
};

type SendEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

type SendPermisEmailsOptions = {
  reservation: PermisInvoiceReservation & {
    facture_numero: string | null;
    facture_url: string | null;
    examen: string | null;
    date_cours: string | null;
  };
  invoicePdf: Buffer;
  invoiceNumber: string;
  baseUrl: string;
  fetchFn?: typeof fetch;
};

const pricingLabels: Record<string, string> = {
  normal: "Tarif normal",
  promo_internet: "Promotion Internet",
  salon_tourisme: "Salon du Tourisme",
};

function formatXpf(amount: number | null) {
  return `${(amount || 0).toLocaleString("fr-FR")} F CFP`;
}

function safeText(value: string | number | null | undefined, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function pricingLabel(value: string | null | undefined) {
  return pricingLabels[value || ""] || pricingLabels.normal;
}

function documentLink(baseUrl: string, href: string) {
  return new URL(href, baseUrl).toString();
}

async function officialDocumentAttachments() {
  return Promise.all(
    permisDocuments.map(async (document) => {
      const filePath = path.join(process.cwd(), "public", document.publicPath);
      const file = await readFile(filePath);

      return {
        filename: document.filename,
        content: file.toString("base64"),
      };
    })
  );
}

export function buildPermisClientEmailHtml(
  reservation: SendPermisEmailsOptions["reservation"],
  invoiceNumber: string,
  baseUrl: string
) {
  const certificateUrl = documentLink(baseUrl, permisDocuments[0].href);
  const formUrl = documentLink(baseUrl, permisDocuments[1].href);

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
      <h1 style="color:#075985">Confirmation de votre reservation - Permis cotier</h1>
      <p>Bonjour ${safeText(reservation.prenom)},</p>
      <p>Merci pour votre confiance.</p>
      <p>Votre reservation est confirmee.</p>

      <h2>Recapitulatif</h2>
      <ul>
        <li>Numero de reservation : ${safeText(reservation.id)}</li>
        <li>Numero de facture : ${invoiceNumber}</li>
        <li>Formule choisie : ${safeText(reservation.formule)}</li>
        <li>Type de tarif : ${pricingLabel(reservation.pricing_type)}</li>
        <li>Montant paye : ${formatXpf(reservation.pricing_amount)}</li>
        <li>Date d'examen : ${safeText(reservation.examen)}</li>
        <li>Date du cours pratique : ${safeText(reservation.date_cours)}</li>
      </ul>

      <h2>Documents a completer</h2>
      <p>Les documents officiels sont joints a cet email.</p>
      <p>
        Certificat medical :
        <a href="${certificateUrl}">${certificateUrl}</a>
      </p>
      <p>
        Formulaire d'inscription :
        <a href="${formUrl}">${formUrl}</a>
      </p>
      <p>A tres bientot,<br />Tahiti Trip Fishing</p>
    </div>
  `;
}

export function buildPermisInternalEmailHtml(
  reservation: SendPermisEmailsOptions["reservation"],
  invoiceNumber: string
) {
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
      <h1>Nouvelle reservation permis payee</h1>
      <ul>
        <li>Nom : ${safeText(reservation.nom)}</li>
        <li>Prenom : ${safeText(reservation.prenom)}</li>
        <li>Telephone : ${safeText(reservation.telephone)}</li>
        <li>Email : ${safeText(reservation.email)}</li>
        <li>Formule : ${safeText(reservation.formule)}</li>
        <li>Montant : ${formatXpf(reservation.pricing_amount)}</li>
        <li>Type de tarif : ${pricingLabel(reservation.pricing_type)}</li>
        <li>Numero de facture : ${invoiceNumber}</li>
      </ul>
    </div>
  `;
}

async function sendResendEmail(payload: SendEmailPayload, fetchFn: typeof fetch) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { skipped: true, reason: "RESEND_API_KEY manquante" };
  }

  const response = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    return { error: error || "Erreur envoi email" };
  }

  return { ok: true };
}

export async function sendPermisReservationEmails({
  reservation,
  invoicePdf,
  invoiceNumber,
  baseUrl,
  fetchFn = fetch,
}: SendPermisEmailsOptions) {
  const from = process.env.EMAIL_FROM || "Tahiti Trip Fishing <onboarding@resend.dev>";
  const internalEmail =
    process.env.INTERNAL_EMAIL ||
    process.env.EMAIL_INTERNAL ||
    "contact@tahiti-trip.com";

  const officialAttachments = await officialDocumentAttachments();
  const customerEmail = safeText(reservation.email, "");

  if (!customerEmail) {
    return { error: "Email client manquant" };
  }

  const customerPayload: SendEmailPayload = {
    from,
    to: [customerEmail],
    subject: "Confirmation de votre réservation – Permis côtier",
    html: buildPermisClientEmailHtml(reservation, invoiceNumber, baseUrl),
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: invoicePdf.toString("base64"),
      },
      ...officialAttachments,
    ],
  };

  const internalPayload: SendEmailPayload = {
    from,
    to: [internalEmail],
    subject: `Reservation permis payee - ${invoiceNumber}`,
    html: buildPermisInternalEmailHtml(reservation, invoiceNumber),
  };

  const customerResult = await sendResendEmail(customerPayload, fetchFn);
  if (customerResult.error || customerResult.skipped) {
    return customerResult;
  }

  const internalResult = await sendResendEmail(internalPayload, fetchFn);
  if (internalResult.error || internalResult.skipped) {
    return internalResult;
  }

  return { ok: true };
}
