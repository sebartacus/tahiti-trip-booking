import { CHARTER_FORMULA_DETAILS, formatXpf } from "./charter-pricing";
import { isCharterFormula } from "./charter-availability";

export type CharterInvoiceReservation = {
  id: string;
  date_debut: string;
  date_fin: string;
  formule: string;
  nombre_personnes: number;
  responsable_prenom: string;
  responsable_nom: string;
  responsable_email: string;
  responsable_tel: string;
  montant_total: number;
  montant_paye: number;
  montant_solde: number;
  type_paiement: "deposit" | "full";
  sunset_drink: string | null;
  champagne_supplement: boolean;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

function escapePdfText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function line(text: string, x: number, y: number, size = 10, bold = false) {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function invoiceSequence(id: string) {
  const numeric = id.replace(/\D/g, "");
  if (numeric) return numeric.slice(-6).padStart(6, "0");
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) % 1000000;
  return String(hash).padStart(6, "0");
}

export function getCharterInvoiceNumber(id: string, date = new Date()) {
  return `CHA-${date.getFullYear()}-${invoiceSequence(id)}`;
}

function formulaLabel(formula: string) {
  return isCharterFormula(formula) ? CHARTER_FORMULA_DETAILS[formula].label : formula;
}

function drinkLabel(reservation: CharterInvoiceReservation) {
  if (reservation.formule !== "sunset") return "";
  if (reservation.champagne_supplement || reservation.sunset_drink === "champagne_included") {
    return "Boisson : Champagne";
  }
  return "Boisson : Vin blanc";
}

export function buildCharterInvoicePdf(
  reservation: CharterInvoiceReservation,
  paidAt = new Date()
) {
  const invoiceNumber = getCharterInvoiceNumber(reservation.id, paidAt);
  const paymentLabel = reservation.type_paiement === "deposit" ? "Acompte 30 %" : "Paiement integral";
  const dates = reservation.date_fin === reservation.date_debut
    ? reservation.date_debut
    : `${reservation.date_debut} au ${reservation.date_fin}`;
  const content = [
    "0.03 0.32 0.36 rg", `0 ${PAGE_HEIGHT - 100} ${PAGE_WIDTH} 100 re f`, "1 1 1 rg",
    line("TAHITI TRIP", 42, 790, 22, true), line("Charters prives - Marina Taina", 42, 768, 11),
    "0 0 0 rg", line("FACTURE", 42, 710, 24, true),
    line(`Numero : ${invoiceNumber}`, 42, 686, 11),
    line(`Date : ${paidAt.toLocaleDateString("fr-FR")}`, 42, 668, 11),
    line("Client", 340, 710, 13, true),
    line(`Nom : ${reservation.responsable_nom}`, 340, 686),
    line(`Prenom : ${reservation.responsable_prenom}`, 340, 670),
    line(`Telephone : ${reservation.responsable_tel}`, 340, 654),
    line(`Email : ${reservation.responsable_email}`, 340, 638),
    "0.86 0.96 0.96 rg", "42 560 511 40 re f", "0 0 0 rg",
    line("Charter", 54, 576, 12, true),
    line(`Formule : ${formulaLabel(reservation.formule)}`, 54, 538, 11),
    line(`Dates : ${dates}`, 54, 516, 11),
    line(`Participants : ${reservation.nombre_personnes}`, 54, 494, 11),
    ...(drinkLabel(reservation) ? [line(drinkLabel(reservation), 54, 472, 11)] : []),
    line(`Montant total : ${formatXpf(reservation.montant_total)}`, 54, 420, 12, true),
    line(`Type de paiement : ${paymentLabel}`, 54, 396, 11),
    line(`Montant paye : ${formatXpf(reservation.montant_paye)}`, 54, 374, 11),
    line(`Solde restant : ${formatXpf(reservation.montant_solde)}`, 54, 352, 11),
    line("Tous les montants sont exprimes en F CFP.", 54, 322, 9),
    line("Merci pour votre confiance.", 42, 260, 13, true),
    line("Tahiti Trip - Marina Taina, Punaauia", 42, 238, 10),
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
  chunks.push(`xref\n0 ${objects.length + 1}\n`, "0000000000 65535 f \n");
  for (let index = 1; index < offsets.length; index += 1) {
    chunks.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return { invoiceNumber, pdf: Buffer.from(chunks.join(""), "latin1") };
}
