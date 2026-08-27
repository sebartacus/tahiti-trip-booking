import { calculateSalonTax } from "./salonTax";
import { getInvoiceValidityText } from "./invoiceValidity";

type BaleinesParticipant = {
  prenom?: string | null;
  nom?: string | null;
  role?: string | null;
  type?: string | null;
};

export type BaleinesInvoiceReservation = {
  id: string | number;
  date_sortie: string | null;
  depart: string | null;
  responsable_prenom: string | null;
  responsable_nom: string | null;
  responsable_email: string | null;
  responsable_telephone: string | null;
  participants: BaleinesParticipant[] | null;
  montant_total: number | null;
  source_paiement?: string | null;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const TVA_RATE = 0.05;

function escapePdfText(value: string) {
  const winAnsi: Record<string, string> = { "Œ": "\\214", "œ": "\\234", "‘": "\\221", "’": "\\222", "“": "\\223", "”": "\\224", "–": "\\226", "—": "\\227", "…": "\\205" };
  return Array.from(value, (character) => {
    if (winAnsi[character]) return winAnsi[character];
    if (character === "\\") return "\\\\";
    if (character === "(") return "\\(";
    if (character === ")") return "\\)";
    const code = character.charCodeAt(0);
    return code >= 0x20 && code <= 0xff ? character : "?";
  }).join("");
}

function money(value: number) {
  return `${moneyAmount(value)} F CFP`;
}

function moneyAmount(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function safeText(value: string | number | null | undefined, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function participantsCount(participants: BaleinesParticipant[] | null) {
  return Array.isArray(participants) ? participants.length : 0;
}

function invoiceSequenceFromId(id: string | number) {
  const raw = String(id);
  const numeric = raw.replace(/\D/g, "");

  if (numeric) {
    return numeric.slice(-6).padStart(6, "0");
  }

  let hash = 0;
  for (const char of raw) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000000;
  }

  return String(hash).padStart(6, "0");
}

export function getBaleinesInvoiceNumber(
  reservationId: string | number,
  date = new Date(),
) {
  return `BAL-${date.getFullYear()}-${invoiceSequenceFromId(reservationId)}`;
}

function textLine(text: string, x: number, y: number, size = 10) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function boldLine(text: string, x: number, y: number, size = 10) {
  return `BT /F2 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function rect(x: number, y: number, width: number, height: number) {
  return `${x} ${y} ${width} ${height} re S`;
}

function filledRect(x: number, y: number, width: number, height: number) {
  return `${x} ${y} ${width} ${height} re f`;
}

function salonBookingLayout(previousLineY: number) {
  const blockTop = previousLineY - 24;
  const blockHeight = 80;
  const blockBottom = blockTop - blockHeight;
  const footerLineY = blockBottom - 24;
  return { blockTop, blockBottom, blockHeight, footerLineY, thankYouY: footerLineY - 30, brandY: footerLineY - 50 };
}

export function buildBaleinesInvoicePdf(
  reservation: BaleinesInvoiceReservation,
  paidAt = new Date(),
  options: {
    designation?: string;
    composition?: string;
    paymentMethod?: string;
    salon?: boolean;
    validUntil?: string | null;
    amountPaid?: number;
    balance?: number;
    showSalonBookingAccess?: boolean;
  } = {},
) {
  const invoiceNumber = getBaleinesInvoiceNumber(reservation.id, paidAt);
  const amountTtc = reservation.montant_total ?? 0;
  const tax = options.salon ? calculateSalonTax(amountTtc) : null;
  const amountHt = tax?.ht ?? amountTtc / (1 + TVA_RATE);
  const tva = tax?.tva ?? amountTtc - amountHt;
  const invoiceDate = paidAt.toLocaleDateString("fr-FR");
  const paymentMethod =
    options.paymentMethod ||
    (reservation.source_paiement === "carnet_baleines"
      ? "Carnet Baleines"
      : "PayZen");
  const lastContentY = options.validUntil ? (options.balance ? 346 : 382) : (options.balance ? 366 : 402);
  const bookingLayout = salonBookingLayout(lastContentY);

  const content = [
    "0.05 0.30 0.40 rg",
    filledRect(0, PAGE_HEIGHT - 92, PAGE_WIDTH, 92),
    "1 1 1 rg",
    "1 1 1 RG",
    "42 778 54 36 re S",
    boldLine("TTF", 56, 790, 18),
    boldLine("Tahiti Trip Fishing", 112, 800, 20),
    textLine("Marina Taina - PUNAAUIA", 112, 782, 10),
    textLine("Polynesie francaise", 112, 768, 10),
    textLine("Telephone : +689 87 32 16 31", 380, 800, 9),
    textLine("Email : contact@tahiti-trip.com", 380, 786, 9),
    textLine("Site : tahiti-trip.com", 380, 772, 9),
    "0 0 0 rg",
    boldLine("FACTURE", 42, 710, 24),
    textLine(`Numero : ${invoiceNumber}`, 42, 690, 11),
    textLine(`Date : ${invoiceDate}`, 42, 674, 11),
    boldLine("Client", 360, 710, 13),
    textLine(`Nom : ${safeText(reservation.responsable_nom)}`, 360, 690, 10),
    textLine(
      `Prenom : ${safeText(reservation.responsable_prenom)}`,
      360,
      674,
      10,
    ),
    textLine(
      `Telephone : ${safeText(reservation.responsable_telephone)}`,
      360,
      658,
      10,
    ),
    textLine(
      `Email : ${safeText(reservation.responsable_email)}`,
      360,
      642,
      10,
    ),
    "0.85 0.93 0.96 rg",
    filledRect(42, 582, 511, 28),
    "0 0 0 RG",
    rect(42, 528, 511, 82),
    rect(42, 528, 230, 82),
    rect(272, 528, 55, 82),
    rect(327, 528, 78, 82),
    rect(405, 528, 70, 82),
    rect(475, 528, 78, 82),
    "0 0 0 rg",
    boldLine("Designation", 54, 592, 10),
    boldLine("Quantite", 281, 592, 10),
    boldLine("Prix HT", 346, 592, 10),
    boldLine("TVA 5 %", 420, 592, 10),
    boldLine("Prix TTC", 496, 592, 10),
    textLine(options.designation || "Observation des baleines", 54, 558, 10),
    textLine("1", 296, 558, 10),
    textLine(moneyAmount(amountHt), 354, 558, 10),
    textLine(moneyAmount(tva), 443, 558, 10),
    textLine(moneyAmount(amountTtc), 505, 558, 10),
    textLine("Tous les montants sont exprimes en F CFP.", 42, 512, 9),
    boldLine(`Date sortie : ${safeText(reservation.date_sortie)}`, 42, 492, 11),
    textLine(`Depart : ${safeText(reservation.depart)}`, 42, 474, 10),
    textLine(
      `Participants : ${participantsCount(reservation.participants)}`,
      42,
      456,
      10,
    ),
    ...(options.composition
      ? [textLine(`Composition : ${options.composition}`, 42, 438, 9)]
      : []),
    textLine(`Mode de reglement : ${paymentMethod}`, 42, 420, 10),
    ...(options.balance
      ? [
          textLine(`Acompte encaisse : ${money(options.amountPaid || 0)}`, 42, 402, 10),
          textLine(`Solde restant : ${money(options.balance)}`, 42, 384, 10),
          textLine("Solde a regler le jour de la prestation.", 42, 366, 10),
        ]
      : [textLine(`Montant paye : ${money(amountTtc)}`, 42, 402, 10)]),
    ...(options.validUntil
      ? [boldLine(getInvoiceValidityText(options.validUntil), 42, options.balance ? 346 : 382, 10)]
      : []),
    ...(options.showSalonBookingAccess
      ? [
          "0.88 0.97 0.98 rg",
          filledRect(42, bookingLayout.blockBottom, 511, bookingLayout.blockHeight),
          "0.05 0.30 0.40 rg",
          boldLine("POUR CHOISIR VOTRE DATE", 58, bookingLayout.blockTop - 22, 14),
          boldLine("https://www.tahiti-trip.com/reprendre-offre", 58, bookingLayout.blockTop - 42, 11),
          textLine("Munissez-vous de votre numéro de facture et du téléphone", 58, bookingLayout.blockTop - 58, 9),
          textLine("ou de l’e-mail utilisé lors de l’achat.", 58, bookingLayout.blockTop - 72, 9),
        ]
      : []),
    "0.05 0.30 0.40 rg",
    filledRect(42, options.showSalonBookingAccess ? bookingLayout.footerLineY : 356, 511, 1),
    "0 0 0 rg",
    boldLine("Merci pour votre confiance.", 42, options.showSalonBookingAccess ? bookingLayout.thankYouY : 326, 13),
    textLine("Tahiti Trip Fishing", 42, options.showSalonBookingAccess ? bookingLayout.brandY : 306, 10),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(chunks.join(""), "latin1"));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(chunks.join(""), "latin1");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");

  for (let index = 1; index < offsets.length; index += 1) {
    chunks.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }

  chunks.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );

  return {
    invoiceNumber,
    pdf: Buffer.from(chunks.join(""), "latin1"),
  };
}
