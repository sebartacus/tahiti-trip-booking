import { sendResendEmail } from "@/lib/baleinesEmail";

export type CarnetBaleinesEmailData = {
  code: string;
  credits: number;
  dateExpiration: string;
  email: string;
  nom: string;
  prenom: string;
  prix: number;
};

type SendCarnetBaleinesEmailsOptions = {
  carnet: CarnetBaleinesEmailData;
  invoiceNumber: string;
  invoicePdf: Buffer;
  fetchFn?: typeof fetch;
  idempotencySuffix?: string;
};

function formatPrix(prix: number) {
  return `${prix.toLocaleString("fr-FR")} F CFP`;
}

function formatDateSql(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function buildCarnetBaleinesClientEmailHtml(
  carnet: CarnetBaleinesEmailData
) {
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
      <h1 style="color:#075985">Votre Carnet Baleines est confirmé</h1>
      <p>Bonjour ${carnet.prenom},</p>
      <p>Merci pour votre achat. Votre carnet est actif et prêt à être utilisé.</p>
      <div style="background:#ecfeff;padding:20px;margin:24px 0">
        <p><strong>Code carnet :</strong> ${carnet.code}</p>
        <p><strong>Crédits disponibles :</strong> ${carnet.credits}</p>
        <p><strong>Valable jusqu’au :</strong> ${formatDateSql(carnet.dateExpiration)}</p>
      </div>
      <p>Pour réserver, rendez-vous sur la page Sorties Baleines, choisissez « Utiliser un carnet Baleines », puis saisissez votre code.</p>
      <p>Un crédit correspond à un participant, qu’il s’agisse d’une mise à l’eau, d’un observateur ou d’un enfant.</p>
      <p>À très bientôt,<br />Tahiti Trip Fishing</p>
    </div>
  `;
}

export function buildCarnetBaleinesInternalEmailHtml(
  carnet: CarnetBaleinesEmailData
) {
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
      <h1>Nouveau Carnet Baleines confirmé</h1>
      <ul>
        <li>Client : ${carnet.prenom} ${carnet.nom}</li>
        <li>E-mail : ${carnet.email}</li>
        <li>Code : ${carnet.code}</li>
        <li>Crédits : ${carnet.credits}</li>
        <li>Montant : ${formatPrix(carnet.prix)}</li>
        <li>Expiration : ${formatDateSql(carnet.dateExpiration)}</li>
      </ul>
    </div>
  `;
}

export async function sendCarnetBaleinesPurchaseEmails({
  carnet,
  invoiceNumber,
  invoicePdf,
  fetchFn = fetch,
  idempotencySuffix = carnet.code,
}: SendCarnetBaleinesEmailsOptions) {
  const from =
    process.env.EMAIL_FROM || "Tahiti Trip Fishing <onboarding@resend.dev>";
  const internalEmail =
    process.env.INTERNAL_EMAIL ||
    process.env.EMAIL_INTERNAL ||
    "contact@tahiti-trip.com";
  const attachment = {
    filename: `${invoiceNumber}.pdf`,
    content: invoicePdf.toString("base64"),
  };

  const customerResult = await sendResendEmail(
    {
      from,
      to: [carnet.email],
      subject: "Votre Carnet Baleines est confirmé",
      html: buildCarnetBaleinesClientEmailHtml(carnet),
      attachments: [attachment],
    },
    fetchFn,
    `carnet-baleines-client-${idempotencySuffix}`
  );

  if ("error" in customerResult || "skipped" in customerResult) {
    return customerResult;
  }

  return sendResendEmail(
    {
      from,
      to: [internalEmail],
      subject: "Nouveau Carnet Baleines confirmé",
      html: buildCarnetBaleinesInternalEmailHtml(carnet),
      attachments: [attachment],
    },
    fetchFn,
    `carnet-baleines-admin-${idempotencySuffix}`
  );
}
