type SendEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

type EmailAttachment = {
  filename: string;
  content: string;
};

export type PecheEmailReservation = {
  id: string | number;
  date_sortie: string | null;
  formule: string | null;
  slots: string[] | null;
  nombre_personnes: number | null;
  responsable_prenom: string | null;
  responsable_nom: string | null;
  responsable_email: string | null;
  responsable_telephone: string | null;
  montant_paye: number | null;
};

type SendPecheEmailsOptions = {
  reservation: PecheEmailReservation;
  invoicePdf: Buffer;
  invoiceNumber: string;
  fetchFn?: typeof fetch;
};

const formulaLabels: Record<string, string> = {
  morning: "Demi-journee matin",
  afternoon: "Demi-journee apres-midi",
  full_day: "Journee complete",
};

const slotLabels: Record<string, string> = {
  morning: "Matin",
  afternoon: "Apres-midi",
};

function formatXpf(amount: number | null) {
  return `${(amount || 0).toLocaleString("fr-FR")} F CFP`;
}

function safeText(value: string | number | null | undefined, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formulaLabel(value: string | null | undefined) {
  return formulaLabels[value || ""] || safeText(value);
}

function slotsLabel(slots: string[] | null) {
  if (!slots || slots.length === 0) return "-";
  return slots.map((slot) => slotLabels[slot] || slot).join(" + ");
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

export function buildPecheClientEmailHtml(reservation: PecheEmailReservation) {
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
      <h1 style="color:#075985">Confirmation de votre reservation - Peche au gros</h1>
      <p>Bonjour ${safeText(reservation.responsable_prenom)},</p>
      <p>Merci pour votre confiance. Votre reservation peche au gros est confirmee.</p>

      <h2>Recapitulatif</h2>
      <ul>
        <li>Prenom : ${safeText(reservation.responsable_prenom)}</li>
        <li>Nom : ${safeText(reservation.responsable_nom)}</li>
        <li>Formule choisie : ${formulaLabel(reservation.formule)}</li>
        <li>Date : ${safeText(reservation.date_sortie)}</li>
        <li>Creneau : ${slotsLabel(reservation.slots)}</li>
        <li>Nombre de personnes : ${safeText(reservation.nombre_personnes)}</li>
        <li>Montant paye : ${formatXpf(reservation.montant_paye)}</li>
      </ul>

      <p>Depart Marina Taina.</p>
      <p>Contact WhatsApp : +689 87 32 16 31</p>
      <p>A tres bientot,<br />Tahiti Trip Fishing</p>
    </div>
  `;
}

export function buildPecheInternalEmailHtml(reservation: PecheEmailReservation) {
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
      <h1>Nouvelle reservation peche</h1>
      <ul>
        <li>Nom : ${safeText(reservation.responsable_nom)}</li>
        <li>Prenom : ${safeText(reservation.responsable_prenom)}</li>
        <li>Telephone : ${safeText(reservation.responsable_telephone)}</li>
        <li>Email : ${safeText(reservation.responsable_email)}</li>
        <li>Date : ${safeText(reservation.date_sortie)}</li>
        <li>Formule : ${formulaLabel(reservation.formule)}</li>
        <li>Creneau : ${slotsLabel(reservation.slots)}</li>
        <li>Montant : ${formatXpf(reservation.montant_paye)}</li>
        <li>Nombre de personnes : ${safeText(reservation.nombre_personnes)}</li>
      </ul>
    </div>
  `;
}

export async function sendPecheReservationEmails({
  reservation,
  invoicePdf,
  invoiceNumber,
  fetchFn = fetch,
}: SendPecheEmailsOptions) {
  const from =
    process.env.EMAIL_FROM || "Tahiti Trip Fishing <onboarding@resend.dev>";
  const internalEmail =
    process.env.INTERNAL_EMAIL ||
    process.env.EMAIL_INTERNAL ||
    "contact@tahiti-trip.com";

  const customerEmail = safeText(reservation.responsable_email, "");

  if (!customerEmail) {
    return { error: "Email client manquant" };
  }

  const customerResult = await sendResendEmail(
    {
      from,
      to: [customerEmail],
      subject: "Confirmation de votre réservation – Pêche au gros",
      html: buildPecheClientEmailHtml(reservation),
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          content: invoicePdf.toString("base64"),
        },
      ],
    },
    fetchFn
  );

  if ("error" in customerResult || "skipped" in customerResult) {
    return customerResult;
  }

  const internalResult = await sendResendEmail(
    {
      from,
      to: [internalEmail],
      subject: "Nouvelle reservation peche",
      html: buildPecheInternalEmailHtml(reservation),
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          content: invoicePdf.toString("base64"),
        },
      ],
    },
    fetchFn
  );

  if ("error" in internalResult || "skipped" in internalResult) {
    return internalResult;
  }

  return { ok: true };
}
