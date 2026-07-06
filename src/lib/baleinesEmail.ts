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

type BaleinesParticipant = {
  prenom?: string | null;
  nom?: string | null;
  role?: string | null;
  type?: string | null;
};

export type BaleinesEmailReservation = {
  id: string | number;
  date_sortie: string | null;
  depart: string | null;
  responsable_prenom: string | null;
  responsable_nom: string | null;
  responsable_email: string | null;
  responsable_telephone: string | null;
  participants: BaleinesParticipant[] | null;
  montant_total: number | null;
};

type SendBaleinesEmailsOptions = {
  reservation: BaleinesEmailReservation;
  invoicePdf: Buffer;
  invoiceNumber: string;
  fetchFn?: typeof fetch;
};

function formatXpf(amount: number | null) {
  return `${(amount || 0).toLocaleString("fr-FR")} F CFP`;
}

function safeText(value: string | number | null | undefined, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function participantsCount(participants: BaleinesParticipant[] | null) {
  return Array.isArray(participants) ? participants.length : 0;
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

export function buildBaleinesClientEmailHtml(
  reservation: BaleinesEmailReservation
) {
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
      <h1 style="color:#075985">Confirmation de votre reservation - Observation des baleines</h1>
      <p>Bonjour ${safeText(reservation.responsable_prenom)},</p>
      <p>Merci pour votre confiance. Votre reservation baleines est confirmee.</p>

      <h2>Recapitulatif</h2>
      <ul>
        <li>Nom responsable : ${safeText(reservation.responsable_prenom)} ${safeText(
          reservation.responsable_nom
        )}</li>
        <li>Date : ${safeText(reservation.date_sortie)}</li>
        <li>Depart choisi : ${safeText(reservation.depart)}</li>
        <li>Nombre de participants : ${participantsCount(reservation.participants)}</li>
        <li>Montant paye : ${formatXpf(reservation.montant_total)}</li>
      </ul>

      <p>Rendez-vous a la Marina Taina.</p>
      <p>Contact WhatsApp : +689 87 32 16 31</p>
      <p>A tres bientot,<br />Tahiti Trip Fishing</p>
    </div>
  `;
}

export function buildBaleinesInternalEmailHtml(
  reservation: BaleinesEmailReservation
) {
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55">
      <h1>Nouvelle reservation baleines</h1>
      <ul>
        <li>Responsable : ${safeText(reservation.responsable_prenom)} ${safeText(
          reservation.responsable_nom
        )}</li>
        <li>Telephone : ${safeText(reservation.responsable_telephone)}</li>
        <li>Email : ${safeText(reservation.responsable_email)}</li>
        <li>Date : ${safeText(reservation.date_sortie)}</li>
        <li>Depart : ${safeText(reservation.depart)}</li>
        <li>Montant : ${formatXpf(reservation.montant_total)}</li>
        <li>Participants : ${participantsCount(reservation.participants)}</li>
      </ul>
    </div>
  `;
}

export async function sendBaleinesReservationEmails({
  reservation,
  invoicePdf,
  invoiceNumber,
  fetchFn = fetch,
}: SendBaleinesEmailsOptions) {
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
      subject: "Confirmation de votre réservation – Observation des baleines",
      html: buildBaleinesClientEmailHtml(reservation),
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
      subject: "Nouvelle reservation baleines",
      html: buildBaleinesInternalEmailHtml(reservation),
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
