import { randomUUID } from "node:crypto";
import { RepriseError } from "./permisRepriseServer";
export const PERMIS_DOCUMENT_BYTES = 3 * 1024 * 1024;
export const permisDocumentColumns = { certificat: "certificat_url", formulaire: "formulaire_url", photo: "photo_url", identite: "identite_url" } as const;
export type PermisDocumentKind = keyof typeof permisDocumentColumns;
function validJpeg(bytes: Buffer) {
  if (bytes.length < 20 || bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) return false;
  let offset = 2, dimensions = false;
  while (offset + 4 < bytes.length) {
    if (bytes[offset++] !== 0xff) return false;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda) return dimensions;
    const size = bytes.readUInt16BE(offset);
    if (size < 2 || offset + size > bytes.length) return false;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (size < 8) return false;
      const height = bytes.readUInt16BE(offset + 3), width = bytes.readUInt16BE(offset + 5);
      if (!width || !height || width * height > 40_000_000) return false;
      dimensions = true;
    }
    offset += size;
  }
  return false;
}
export async function validatePermisDocument(kind: string, file: File) {
  if (!Object.hasOwn(permisDocumentColumns, kind)) throw new RepriseError(400, "Type de document interdit.");
  if (!file.size) throw new RepriseError(400, "Fichier vide.");
  if (file.size > PERMIS_DOCUMENT_BYTES) throw new RepriseError(413, "Fichier trop volumineux : maximum 3 Mo.");
  const photo = kind === "photo", mime = photo ? "image/jpeg" : "application/pdf";
  if (file.type !== mime || !(photo ? /\.jpe?g$/i : /\.pdf$/i).test(file.name)) throw new RepriseError(400, photo ? "La photo doit être au format JPEG." : "Ce document doit être au format PDF.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const pdf = bytes.toString("latin1");
  if (photo ? !validJpeg(bytes) : !/^%PDF-1\.[0-9]/.test(pdf) && !pdf.startsWith("%PDF-2.0")) throw new RepriseError(400, "Contenu du fichier invalide.");
  if (!photo && (!/%%EOF\s*$/.test(pdf) || /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/i.test(pdf))) throw new RepriseError(400, "PDF invalide ou contenu actif non accepté.");
  return { bytes, mime, extension: photo ? "jpg" : "pdf", column: permisDocumentColumns[kind as PermisDocumentKind] };
}
export function permisDocumentPath(id: string, kind: PermisDocumentKind, extension: string) {
  return `candidats/${id}/${kind}/${randomUUID()}.${extension}`;
}
