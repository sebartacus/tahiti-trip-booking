export type PermisInvoicePricingType =
  | "normal"
  | "promo_internet"
  | "salon_tourisme";

export type PermisInvoiceReservation = {
  id: string | number;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  email: string | null;
  formule: string | null;
  pricing_type: PermisInvoicePricingType | string | null;
  pricing_amount: number | null;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const TVA_RATE = 0.05;

const pricingLabels: Record<PermisInvoicePricingType, string> = {
  normal: "Tarif normal",
  promo_internet: "Promotion Internet",
  salon_tourisme: "Salon du Tourisme",
};

function escapePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function money(value: number) {
  return `${moneyAmount(value)} F CFP`;
}

function moneyAmount(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function safeText(value: string | null | undefined, fallback = "-") {
  return value && value.trim() ? value.trim() : fallback;
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

export function getPermisInvoiceNumber(
  reservationId: string | number,
  date = new Date()
) {
  return `PER-${date.getFullYear()}-${invoiceSequenceFromId(reservationId)}`;
}

function getPricingLabel(pricingType: string | null | undefined) {
  if (
    pricingType === "promo_internet" ||
    pricingType === "salon_tourisme" ||
    pricingType === "normal"
  ) {
    return pricingLabels[pricingType];
  }

  return pricingLabels.normal;
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

export function buildPermisInvoicePdf(
  reservation: PermisInvoiceReservation,
  paidAt = new Date()
) {
  const invoiceNumber = getPermisInvoiceNumber(reservation.id, paidAt);
  const amountTtc = reservation.pricing_amount ?? 0;
  const amountHt = amountTtc / (1 + TVA_RATE);
  const tva = amountTtc - amountHt;
  const formula = safeText(reservation.formule, "Classique");
  const designation = `Permis cotier - Formule ${formula}`;
  const pricingLabel = getPricingLabel(reservation.pricing_type);
  const invoiceDate = paidAt.toLocaleDateString("fr-FR");

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
    textLine("Telephone : +689 87 32 16 31", 380, 800, 9),
    textLine("Email : contact@tahiti-trip.com", 380, 786, 9),
    textLine("Site : tahiti-trip.com", 380, 772, 9),
    "0 0 0 rg",
    boldLine("FACTURE", 42, 710, 24),
    textLine(`Numero : ${invoiceNumber}`, 42, 690, 11),
    textLine(`Date : ${invoiceDate}`, 42, 674, 11),
    boldLine("Client", 360, 710, 13),
    textLine(`Nom : ${safeText(reservation.nom)}`, 360, 690, 10),
    textLine(`Prenom : ${safeText(reservation.prenom)}`, 360, 674, 10),
    textLine(`Telephone : ${safeText(reservation.telephone)}`, 360, 658, 10),
    textLine(`Email : ${safeText(reservation.email)}`, 360, 642, 10),
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
    textLine(designation, 54, 558, 10),
    textLine("1", 296, 558, 10),
    textLine(moneyAmount(amountHt), 354, 558, 10),
    textLine(moneyAmount(tva), 443, 558, 10),
    textLine(moneyAmount(amountTtc), 505, 558, 10),
    textLine("Tous les montants sont exprimés en F CFP.", 42, 512, 9),
    boldLine(`Type de tarif : ${pricingLabel}`, 42, 492, 11),
    textLine("Mode de règlement : PayZen", 42, 470, 10),
    textLine(`Montant payé : ${money(amountTtc)}`, 42, 454, 10),
    textLine("Structure acompte : montant total, acompte, solde restant.", 42, 438, 9),
    "0.05 0.30 0.40 rg",
    filledRect(42, 356, 511, 1),
    "0 0 0 rg",
    boldLine("Documents a completer", 42, 326, 13),
    textLine("[x] Certificat medical", 42, 304, 10),
    textLine("[x] Formulaire d'inscription", 42, 288, 10),
    textLine(
      "Ces documents sont disponibles au telechargement sur votre espace.",
      42,
      268,
      10
    ),
    boldLine("Merci pour votre confiance.", 42, 208, 13),
    textLine("Tahiti Trip Fishing", 42, 188, 10),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
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
