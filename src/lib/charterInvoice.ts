import { CHARTER_FORMULA_DETAILS, formatXpf } from "./charter-pricing";
import { isCharterFormula } from "./charter-availability";
import { calculateSalonTax } from "./salonTax";
import { formatInvoiceValidityDate } from "./invoiceValidity";

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
  const winAnsi:Record<string,string>={"Œ":"\\214","œ":"\\234","‘":"\\221","’":"\\222","“":"\\223","”":"\\224","–":"\\226","—":"\\227","…":"\\205"};
  return Array.from(value,character=>{if(winAnsi[character])return winAnsi[character];if(character==="\\")return"\\\\";if(character==="(")return"\\(";if(character===")")return"\\)";const code=character.charCodeAt(0);return code>=0x20&&code<=0xff?character:"?"}).join("");
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
  paidAt = new Date(),
  options?: { salon?: boolean; paymentMethod?: string; validUntil?: string }
) {
  const invoiceNumber = getCharterInvoiceNumber(reservation.id, paidAt);
  const paymentLabel = reservation.type_paiement === "deposit" ? "Acompte 30 %" : "Paiement intégral";
  const dates = reservation.date_fin === reservation.date_debut
    ? reservation.date_debut
    : `${reservation.date_debut} au ${reservation.date_fin}`;
  const dateText=reservation.date_debut==="Date à fixer"?"À fixer":dates;
  const validity=options?.validUntil?/^\d{4}-\d{2}-\d{2}$/.test(options.validUntil)?formatInvoiceValidityDate(options.validUntil):options.validUntil:"-";
  const salonAmounts=options?.salon?calculateSalonTax(reservation.montant_total):null;
  const content = [
    "0.03 0.32 0.36 rg", `0 ${PAGE_HEIGHT - 100} ${PAGE_WIDTH} 100 re f`, "1 1 1 rg",
    line("TAHITI TRIP", 42, 790, 22, true), line("Charters privés - Marina Taina", 42, 768, 11),
    "0 0 0 rg", line("FACTURE", 42, 710, 24, true),
    line(`Numéro : ${invoiceNumber}`, 42, 686, 11),
    line(`Date : ${paidAt.toLocaleDateString("fr-FR")}`, 42, 668, 11),
    line("Client", 340, 710, 13, true),
    line(`Nom : ${reservation.responsable_nom}`, 340, 686),
    line(`Prénom : ${reservation.responsable_prenom}`, 340, 670),
    line(`Téléphone : ${reservation.responsable_tel}`, 340, 654),
    line(`E-mail : ${reservation.responsable_email}`, 340, 638),
    "0.86 0.96 0.96 rg", "42 560 511 40 re f", "0 0 0 rg",
    line("Charter", 54, 576, 12, true),
    line(`Formule : ${formulaLabel(reservation.formule)}`, 54, 548, 11),
    ...(options?.salon ? [line("Catamaran privatisé",54,526,11)] : []),
    line(`Participants : ${reservation.nombre_personnes}`, 54, 504, 11),
    line(`Date de sortie : ${dateText}`,54,482,11),
    ...(drinkLabel(reservation) ? [line(drinkLabel(reservation), 54, 460, 11)] : []),
    ...(salonAmounts?[line(`Total HT : ${formatXpf(salonAmounts.ht)}`,54,430,11),line(`TVA 5 % : ${formatXpf(salonAmounts.tva)}`,54,408,11),line(`Total TTC : ${formatXpf(salonAmounts.ttc)}`,54,386,12,true),...(reservation.montant_solde>0?[line(`Acompte encaissé : ${formatXpf(reservation.montant_paye)}`,54,342,11),line(`Solde restant : ${formatXpf(reservation.montant_solde)}`,54,320,11),line("Solde à régler au plus tard la veille du départ.",54,298,10)]:[]),line(`Mode de paiement : ${options?.paymentMethod||"-"}`,54,reservation.montant_solde>0?252:342,11),line(`Validité de l’offre : jusqu’au ${validity}`,54,reservation.montant_solde>0?230:320,10),line("Tous les montants sont exprimés en F CFP.",54,reservation.montant_solde>0?208:298,9)]:[line(`Montant total : ${formatXpf(reservation.montant_total)}`,54,420,12,true),line(`Type de paiement : ${paymentLabel}`,54,396,11),line(`Montant payé : ${formatXpf(reservation.montant_paye)}`,54,374,11),line(`Solde restant : ${formatXpf(reservation.montant_solde)}`,54,352,11),line("Tous les montants sont exprimés en F CFP.",54,322,9)]),
    line("Merci pour votre confiance.", 42, 158, 13, true),
    line("Tahiti Trip - Marina Taina, Punaauia", 42, 136, 10),
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
  chunks.push(`xref\n0 ${objects.length + 1}\n`, "0000000000 65535 f \n");
  for (let index = 1; index < offsets.length; index += 1) {
    chunks.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return { invoiceNumber, pdf: Buffer.from(chunks.join(""), "latin1") };
}
