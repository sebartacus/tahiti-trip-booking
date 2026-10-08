import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "./adminSession";
import { dossierDocuments } from "./permisDossierZip";
import { piecesPermis, type PermisDossier } from "./permisPlanning";

test("Téléchargement ZIP Permis : route réelle, Storage isolé", async t => {
  const originalFetch = globalThis.fetch;
  const keys = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_SESSION_SECRET"] as const;
  const env = keys.map(key => process.env[key]);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://zip-tests.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  process.env.ADMIN_SESSION_SECRET = "zip-test-secret";
  const row: PermisDossier = { id: 1, prenom: "Émile", nom: "Te / Vai", certificat_url: "1/medical.pdf", formulaire_url: "1/form.pdf", photo_url: "1/photo.jpeg", identite_url: "1/id.jpg" };
  const files = new Map<string, Buffer>(dossierDocuments.map(([field], i) => [row[field]!, i < 2 ? Buffer.from("%PDF-1.4\noriginal " + i) : Buffer.from([255, 216, 255, i, 255, 217])]));
  let requests = 0, missing = false, unavailable = false;
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    requests++;
    assert.equal(url.origin, "https://zip-tests.invalid");
    assert.equal(request.method, "GET");
    assert.equal(request.headers.get("authorization"), "Bearer test-service-role");
    if (url.pathname === "/rest/v1/reservations") {
      assert.equal(url.searchParams.get("id"), "eq.1");
      assert.equal(url.searchParams.get("select"), "id,prenom,nom,certificat_url,formulaire_url,photo_url,identite_url");
      return Response.json(row);
    }
    assert.ok(url.pathname.startsWith("/storage/v1/object/"));
    const path = decodeURIComponent(url.pathname.split("documents-permis/")[1]);
    if (unavailable) return Response.json({ message: "Service unavailable", statusCode: "503" }, { status: 503 });
    if (missing) return Response.json({ message: "Object not found", statusCode: "404" }, { status: 404 });
    const bytes = files.get(path); assert.ok(bytes);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": path.endsWith("pdf") ? "application/pdf" : "image/jpeg" } });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    keys.forEach((key, i) => { if (env[i] === undefined) delete process.env[key]; else process.env[key] = env[i]; });
  });
  const { GET } = await import("../app/api/admin/permis/[id]/dossier/route");
  const get = (authenticated = true, id = "1") => GET(new Request("https://admin.invalid/api", { headers: authenticated ? { cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken()}` } : {} }), { params: Promise.resolve({ id }) });
  // Read local and central ZIP records independently, verify CRCs and original bytes.
  function unpack(zip: Buffer) {
    const found = new Map<string, Buffer>(); let offset = 0;
    while (zip.readUInt32LE(offset) === 0x04034b50) {
      assert.equal(zip.readUInt16LE(offset + 8), 0);
      const size = zip.readUInt32LE(offset + 18), length = zip.readUInt16LE(offset + 26);
      const name = zip.subarray(offset + 30, offset + 30 + length).toString();
      const bytes = zip.subarray(offset + 30 + length, offset + 30 + length + size);
      let crc = -1;
      for (const byte of bytes) {
        crc ^= byte;
        for (let i = 0; i < 8; i++) crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
      assert.equal(zip.readUInt32LE(offset + 14), (~crc) >>> 0);
      found.set(name, bytes); offset += 30 + length + size;
    }
    const end = zip.length - 22;
    assert.equal(zip.readUInt32LE(end), 0x06054b50);
    assert.equal(zip.readUInt16LE(end + 10), found.size);
    assert.equal(zip.readUInt32LE(end + 16), offset);
    for (const [name, bytes] of found) {
      assert.equal(zip.readUInt32LE(offset), 0x02014b50);
      const length = zip.readUInt16LE(offset + 28);
      assert.equal(zip.subarray(offset + 46, offset + 46 + length).toString(), name);
      assert.equal(zip.readUInt32LE(offset + 24), bytes.length);
      const localOffset = zip.readUInt32LE(offset + 42);
      assert.equal(zip.readUInt32LE(localOffset), 0x04034b50);
      offset += 46 + length;
    }
    assert.equal(offset, end);
    return found;
  }
  await t.test("4/4 : quatre documents, noms lisibles, PDF/JPEG identiques", async () => {
    const response = await get(); assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/zip");
    assert.equal(response.headers.get("content-disposition"), 'attachment; filename="dossier-permis-emile-te-vai.zip"');
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const zip = unpack(Buffer.from(await response.arrayBuffer()));
    assert.deepEqual([...zip.keys()], ["certificat-medical.pdf", "formulaire-inscription.pdf", "photo-identite.jpeg", "piece-identite.jpg"]);
    dossierDocuments.forEach(([field], i) => assert.deepEqual([...zip.values()][i], files.get(row[field]!)));
  });
  await t.test("3/4 : seulement trois pièces présentes", async () => {
    const saved = row.identite_url; row.identite_url = null;
    try { const response = await get(); assert.equal(response.status, 200); assert.equal(unpack(Buffer.from(await response.arrayBuffer())).size, 3); }
    finally { row.identite_url = saved; }
  });
  await t.test("0/4 : compteur non cliquable et route sans archive vide", async () => {
    const empty = { ...row, certificat_url: null, formulaire_url: null, photo_url: null, identite_url: null };
    assert.equal(piecesPermis(empty), 0);
    const source = readFileSync("src/app/admin/components/SuiviPermis.tsx", "utf8");
    assert.match(source, /count > 0 \? <button/); assert.match(source, /: "0\/4"/);
    const saved = { ...row }; Object.assign(row, empty);
    try { const before = requests; assert.equal((await get()).status, 404); assert.equal(requests - before, 1); }
    finally { Object.assign(row, saved); }
  });
  await t.test("Session absente et identifiant invalide : aucun accès serveur", async () => {
    const before = requests; assert.equal((await get(false)).status, 401); assert.equal((await get(true, "bad")).status, 400); assert.equal(requests, before);
  });
  await t.test("Pièce Storage absente : erreur propre, aucun ZIP", async () => {
    missing = true;
    try { const response = await get(); assert.equal(response.status, 404); assert.match((await response.json()).error, /Pièce absente du Storage : certificat-medical/); }
    finally { missing = false; }
  });
  await t.test("Storage indisponible : erreur distincte d'un fichier absent", async () => {
    unavailable = true;
    try { assert.equal((await get()).status, 502); } finally { unavailable = false; }
  });
});
