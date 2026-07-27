export type CarnetBaleinesInvoiceData = {
  id: string;
  code: string;
  credits: number;
  nom: string;
  prenom: string;
  prix: number;
  dateExpiration?: string;
  modePaiement?: string;
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

function invoiceSequenceFromId(id: string) {
  const numeric = id.replace(/\D/g, "");

  if (numeric) return numeric.slice(-6).padStart(6, "0");

  let hash = 0;
  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1_000_000;
  }

  return String(hash).padStart(6, "0");
}

function textLine(text: string, x: number, y: number, size = 10) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function boldLine(text: string, x: number, y: number, size = 10) {
  return `BT /F2 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

export function buildCarnetBaleinesInvoicePdf(
  carnet: CarnetBaleinesInvoiceData,
  paidAt = new Date()
) {
  const invoiceNumber = `CBAL-${paidAt.getFullYear()}-${invoiceSequenceFromId(
    carnet.id
  )}`;
  const prix = `${Math.round(carnet.prix).toLocaleString("fr-FR")} F CFP`;
  const dateExpiration = carnet.dateExpiration
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${carnet.dateExpiration}T00:00:00Z`))
    : "20 novembre 2026";
  const content = [
    "0.05 0.30 0.40 rg",
    "0 750 595 92 re f",
    "1 1 1 rg",
    boldLine("Tahiti Trip Fishing", 42, 800, 20),
    textLine("Marina Taina - Punaauia", 42, 780, 10),
    "0 0 0 rg",
    boldLine("FACTURE", 42, 710, 24),
    textLine(`Numero : ${invoiceNumber}`, 42, 684, 11),
    textLine(`Date : ${paidAt.toLocaleDateString("fr-FR")}`, 42, 666, 11),
    boldLine("Client", 350, 710, 13),
    textLine(`Nom : ${carnet.nom}`, 350, 684, 10),
    textLine(`Prenom : ${carnet.prenom}`, 350, 666, 10),
    boldLine(`Carnet Baleines ${carnet.credits} sorties`, 42, 590, 14),
    textLine(`Code carnet : ${carnet.code}`, 42, 562, 11),
    textLine(`Credits : ${carnet.credits}`, 42, 540, 11),
    textLine(`Validite : ${dateExpiration}`, 42, 518, 11),
    textLine(
      `Mode de reglement : ${carnet.modePaiement || "PayZen"}`,
      42,
      496,
      11
    ),
    boldLine(`Montant paye : ${prix}`, 42, 454, 14),
    textLine("TVA non applicable.", 42, 428, 9),
    boldLine("Merci pour votre confiance.", 42, 350, 13),
    textLine("Tahiti Trip Fishing", 42, 330, 10),
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(
      content,
      "latin1"
    )} >>\nstream\n${content}\nendstream`,
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
    `trailer\n<< /Size ${
      objects.length + 1
    } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return {
    invoiceNumber,
    pdf: Buffer.from(chunks.join(""), "latin1"),
  };
}
