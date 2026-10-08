import type { PermisDossier } from "./permisPlanning";

export const dossierDocuments = [["certificat_url", "certificat-medical"], ["formulaire_url", "formulaire-inscription"], ["photo_url", "photo-identite"], ["identite_url", "piece-identite"]] as const;
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
export function dossierZipName(row: PermisDossier) {
  return `dossier-permis-${slug(row.prenom || "") || "prenom"}-${slug(row.nom || "") || "nom"}.zip`;
}

// ZIP STORE preserves every original byte, without a compression dependency.
export function buildDossierZip(files: { name: string; bytes: Buffer }[]) {
  const parts: Buffer[] = [], entries: Buffer[] = [];
  let offset = 0;
  for (const { name: filename, bytes } of files) {
    const name = Buffer.from(filename);
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(33, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(bytes.length, 18); local.writeUInt32LE(bytes.length, 22); local.writeUInt16LE(name.length, 26);
    parts.push(local, name, bytes);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(bytes.length, 20); central.writeUInt32LE(bytes.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    entries.push(central, name); offset += local.length + name.length + bytes.length;
  }
  const directory = Buffer.concat(entries), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directory, end]);
}
