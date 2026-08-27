export type PecheInvoiceReservation = {
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

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const TVA_RATE = 0.05;

const formulaLabels: Record<string, string> = {
  morning: "Demi-journée matin",
  afternoon: "Demi-journée après-midi",
  full_day: "Journée complète",
};

const slotLabels: Record<string, string> = {
  morning: "Matin",
  afternoon: "Après-midi",
};

function escapePdfText(value: string) {
  const winAnsiEscapes: Record<string, string> = {
    "Œ": "\\214",
    "œ": "\\234",
    "‘": "\\221",
    "’": "\\222",
    "“": "\\223",
    "”": "\\224",
    "–": "\\226",
    "—": "\\227",
    "…": "\\205",
  };
  return Array.from(value, (character) => {
    if (winAnsiEscapes[character]) return winAnsiEscapes[character];
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

export function getPecheInvoiceNumber(
  reservationId: string | number,
  date = new Date()
) {
  return `PEC-${date.getFullYear()}-${invoiceSequenceFromId(reservationId)}`;
}

function formulaLabel(value: string | null | undefined) {
  return formulaLabels[value || ""] || safeText(value);
}

function slotsLabel(slots: string[] | null) {
  if (!slots || slots.length === 0) return "-";
  return slots.map((slot) => slotLabels[slot] || slot).join(" + ");
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

export function buildPecheInvoicePdf(
  reservation: PecheInvoiceReservation,
  paidAt = new Date(),
  options?: { designation?: string; paymentMethod?: string; validUntil?: string | null; totalTtc?: number; amountPaid?: number; balance?: number; showSalonBookingAccess?: boolean }
) {
  const invoiceNumber = getPecheInvoiceNumber(reservation.id, paidAt);
  const amountTtc = options?.totalTtc ?? reservation.montant_paye ?? 0;
  const amountHt = amountTtc / (1 + TVA_RATE);
  const tva = amountTtc - amountHt;
  const designation = options?.designation || `Pêche au gros - ${formulaLabel(reservation.formule)}`;
  const invoiceDate = paidAt.toLocaleDateString("fr-FR");
  const validityY = options?.balance ? 378 : 418;
  const lastContentY = options?.validUntil ? validityY : (options?.balance ? 398 : 438);
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
    textLine("Polynésie française", 112, 768, 10),
    textLine("Téléphone : +689 87 32 16 31", 380, 800, 9),
    textLine("E-mail : contact@tahiti-trip.com", 380, 786, 9),
    textLine("Site : tahiti-trip.com", 380, 772, 9),
    "0 0 0 rg",
    boldLine("FACTURE", 42, 710, 24),
    textLine(`Numéro : ${invoiceNumber}`, 42, 690, 11),
    textLine(`Date : ${invoiceDate}`, 42, 674, 11),
    boldLine("Client", 360, 710, 13),
    textLine(`Nom : ${safeText(reservation.responsable_nom)}`, 360, 690, 10),
    textLine(`Prénom : ${safeText(reservation.responsable_prenom)}`, 360, 674, 10),
    textLine(`Téléphone : ${safeText(reservation.responsable_telephone)}`, 360, 658, 10),
    textLine(`E-mail : ${safeText(reservation.responsable_email)}`, 360, 642, 10),
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
    boldLine("Désignation", 54, 592, 10),
    boldLine("Quantité", 281, 592, 10),
    boldLine("Prix HT", 346, 592, 10),
    boldLine("TVA 5 %", 420, 592, 10),
    boldLine("Prix TTC", 496, 592, 10),
    textLine(designation, 54, 558, 10),
    textLine("1", 296, 558, 10),
    textLine(moneyAmount(amountHt), 354, 558, 10),
    textLine(moneyAmount(tva), 443, 558, 10),
    textLine(moneyAmount(amountTtc), 505, 558, 10),
    textLine("Tous les montants sont exprimés en F CFP.", 42, 512, 9),
    ...(reservation.date_sortie
      ? [
          boldLine(`Date de sortie : ${reservation.date_sortie}`, 42, 492, 11),
          textLine(`Créneau : ${slotsLabel(reservation.slots)}`, 42, 470, 10),
        ]
      : [boldLine("Date de sortie : À fixer", 42, 492, 11)]),
    textLine(`Mode de règlement : ${safeText(options?.paymentMethod, "PayZen")}`, 42, 454, 10),
    ...(options?.balance ? [textLine(`Acompte encaissé : ${money(options.amountPaid||0)}`,42,434,10),textLine(`Solde restant : ${money(options.balance)}`,42,416,10),textLine("Solde à régler le jour de la prestation.",42,398,10)] : [textLine(`Montant payé : ${money(amountTtc)}`, 42, 438, 10)]),
    ...(options?.validUntil ? [textLine(`Validité de l’offre : jusqu’au ${new Date(`${options.validUntil}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" })}`, 42, validityY, 10)] : []),
    ...(options?.showSalonBookingAccess ? [
      "0.88 0.97 0.98 rg", filledRect(42, bookingLayout.blockBottom, 511, bookingLayout.blockHeight), "0.05 0.30 0.40 rg",
      boldLine("POUR CHOISIR VOTRE DATE",58,bookingLayout.blockTop-22,14),
      boldLine("https://www.tahiti-trip.com/reprendre-offre",58,bookingLayout.blockTop-42,11),
      textLine("Munissez-vous de votre numéro de facture et du téléphone",58,bookingLayout.blockTop-58,9),
      textLine("ou de l’e-mail utilisé lors de l’achat.",58,bookingLayout.blockTop-72,9),
    ] : []),
    "0.05 0.30 0.40 rg",
    filledRect(42, options?.showSalonBookingAccess ? bookingLayout.footerLineY : 356, 511, 1),
    "0 0 0 rg",
    boldLine("Merci pour votre confiance.", 42, options?.showSalonBookingAccess ? bookingLayout.thankYouY : 326, 13),
    textLine("Tahiti Trip Fishing", 42, options?.showSalonBookingAccess ? bookingLayout.brandY : 306, 10),
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
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return {
    invoiceNumber,
    pdf: Buffer.from(chunks.join(""), "latin1"),
  };
}
