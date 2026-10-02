import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "./adminSession";
import { canMarkPermisPaid, getPermisAdminPrice } from "./permisAdmin";
import { compteursPermis, type PermisDossier } from "./permisPlanning";
import { getPermisPublicPrice } from "./public-pricing";
import { buildPermisInvoicePdf, type PermisInvoiceReservation } from "./permisInvoice";

type Row = PermisInvoiceReservation & PermisDossier & {
  paiement_effectue: boolean; paid_at: string | null; statut: string;
  facture_url: string | null; facture_numero: string | null;
  mode_paiement: string; pricing_amount: number;
};
const cases = [
  { formule: "Classique", pricing_type: "salon_tourisme", amount: 20900, ht: 19905, vat: 995, stamps: 0 },
  { formule: "Sérénité", pricing_type: "salon_tourisme", amount: 28900, ht: 19905, vat: 995, stamps: 8000 },
  { formule: "Classique", pricing_type: "normal", amount: 25000, ht: 23810, vat: 1190, stamps: 0 },
  { formule: "Sérénité", pricing_type: "normal", amount: 33000, ht: 23810, vat: 1190, stamps: 8000 },
];
function pdfCell(pdf: Buffer, x: number, y: number) {
  const line = pdf.toString("latin1").split("\n").find(line => line.includes(` ${x} ${y} Td (`));
  assert.ok(line, `Cellule PDF ${x},${y}`);
  return line.split(" Td (")[1].split(") Tj")[0];
}

test("Permis admin : création, paiement manuel et factures (PostgreSQL local isolé)", async t => {
  const db = new PGlite();
  await db.exec(`CREATE TABLE reservations (
    id serial PRIMARY KEY, created_at timestamptz DEFAULT now(), archived boolean DEFAULT false,
    prenom text, nom text, prenom2 text, nom2 text, telephone text, email text,
    formule text, examen text, date_cours text, type_cours text, creneau text,
    paiement_effectue boolean DEFAULT false, paid_at timestamptz, statut text,
    pricing_type text, pricing_amount integer, mode_paiement text, reference_paiement text,
    origine_reservation text, facture_numero text, facture_url text,
    email_sent boolean, email_sent_at timestamptz
  )`);
  const files = new Map<string, Buffer>();
  let uploads = 0, requests = 0, unexpected = 0, failUpload = false, failFinalize = false;
  const originalFetch = globalThis.fetch;
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  };
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: "https://permis-tests.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
    ADMIN_SESSION_SECRET: "local-permis-test-secret",
  });
  const json = (value: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", ...headers } });
  // Exercise real Supabase request construction and PostgreSQL conditional updates.
  // Only this in-memory PostgREST/Storage adapter is reachable; no production or payment/email network.
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    requests++;
    if (url.origin !== "https://permis-tests.invalid") {
      unexpected++;
      throw new Error("Appel réseau interdit dans ce test : " + url.origin);
    }
    assert.equal(request.headers.get("authorization"), "Bearer test-service-role");
    if (url.pathname.startsWith("/storage/v1/object/")) {
      const path = url.pathname.replace(/^\/storage\/v1\/object\/(?:authenticated\/)?documents-permis\//, "");
      if (request.method === "POST") {
        if (failUpload) return json({ message: "Storage indisponible" }, 503);
        if (files.has(path) && request.headers.get("x-upsert") !== "true") {
          return json({ message: "The resource already exists", error: "Duplicate", statusCode: "409" }, 409);
        }
        files.set(path, Buffer.from(await request.arrayBuffer())); uploads++;
        return json({ Key: "documents-permis/" + path });
      }
      if (request.method === "GET") {
        const pdf = files.get(path);
        return pdf ? new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf" } }) : json({ message: "Absent" }, 404);
      }
    }
    assert.equal(url.pathname, "/rest/v1/reservations");
    const params: unknown[] = [];
    const ident = (s: string) => { assert.match(s, /^[a-z_][a-z0-9_]*$/); return '"' + s + '"'; };
    const bind = (v: unknown) => { params.push(v); return "$" + params.length; };
    const where = () => {
      const clauses: string[] = [];
      for (const [key, value] of url.searchParams) {
        if (["select", "order", "limit", "offset"].includes(key)) continue;
        if (value === "is.null") clauses.push(ident(key) + " IS NULL");
        else {
          assert.ok(value.startsWith("eq."), value);
          clauses.push(ident(key) + " = " + bind(value.slice(3)));
        }
      }
      return clauses.length ? " WHERE " + clauses.join(" AND ") : "";
    };
    let sql: string;
    if (request.method === "POST") {
      const body = await request.json(), keys = Object.keys(body);
      sql = "INSERT INTO reservations (" + keys.map(ident).join(",") + ") VALUES (" + keys.map(k => bind(body[k])).join(",") + ") RETURNING *";
    } else if (request.method === "PATCH") {
      const body = await request.json();
      if (failFinalize && body.paiement_effectue === true) return json({ message: "Finalisation indisponible", code: "TEST" }, 500);
      sql = "UPDATE reservations SET " + Object.keys(body).map(k => ident(k) + "=" + bind(body[k])).join(",") + where() + " RETURNING *";
    } else {
      assert.equal(request.method, "GET");
      sql = "SELECT * FROM reservations" + where() + " ORDER BY id DESC";
    }
    const result = await db.query(sql, params);
    const single = request.headers.get("accept")?.includes("vnd.pgrst.object");
    return json(single ? (result.rows[0] ?? null) : result.rows, 200, { "content-range": `0-${Math.max(0, result.rows.length - 1)}/${result.rows.length}` });
  };
  t.after(async () => {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await db.close();
  });
  const { POST: create } = await import("../app/api/admin/permis/salon/route");
  const { POST: mark } = await import("../app/api/admin/permis/[id]/mark-paid/route");
  const { GET: list } = await import("../app/api/admin/permis/route");
  const headers = () => ({ "Content-Type": "application/json", cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken()}` });
  const payload = {
    prenom: "Candidat", nom: "Fictif", telephone: "87000000", email: "fictif@example.test",
    formule: "Classique", pricing_type: "salon_tourisme", cours_plus_tard: true,
    examen: "Plus tard", type_cours: "individuel", mode_paiement: "payzen_manual",
  };
  const createRequest = (extra: Record<string, unknown> = {}) => create(new Request("https://admin.invalid/api/admin/permis/salon", {
    method: "POST", headers: headers(), body: JSON.stringify({ ...payload, ...extra }),
  }));
  async function newRow(extra: Record<string, unknown> = {}): Promise<Row> {
    const response = await createRequest(extra), body = await response.json();
    assert.equal(response.status, 201, JSON.stringify(body));
    assert.equal(body.payment, undefined);
    return body.reservation;
  }
  const markRequest = (id: number | string) => mark(new Request("https://admin.invalid/api/admin/permis/" + id + "/mark-paid", {
    method: "POST", headers: headers(),
    // No client amount is consumed by this endpoint.
    body: JSON.stringify({ pricing_amount: 1 }),
  }), { params: Promise.resolve({ id: String(id) }) });
  async function read(id: number | string): Promise<Row> {
    const result = await db.query("SELECT * FROM reservations WHERE id=$1", [id]);
    return JSON.parse(JSON.stringify(result.rows[0]));
  }

  for (const c of cases) {
    await t.test(`${c.pricing_type} ${c.formule} : création non payée à ${c.amount}, sans PayZen ni facture`, async () => {
      const before = uploads, row = await newRow({ formule: c.formule, pricing_type: c.pricing_type });
      assert.equal(row.pricing_amount, c.amount);
      assert.equal(row.pricing_type, c.pricing_type);
      assert.equal(row.formule, c.formule);
      assert.equal(row.paiement_effectue, false); assert.equal(row.paid_at, null);
      assert.equal(row.statut, "En attente"); assert.equal(row.origine_reservation, "salon_admin");
      assert.equal(row.mode_paiement, "payzen"); assert.equal(row.facture_url, null);
      assert.equal(row.prenom2, null); assert.equal(row.nom2, null);
      assert.equal(uploads, before); assert.equal(unexpected, 0);
      assert.equal(canMarkPermisPaid(row), true);
    });
    await t.test(`${c.formule} ${c.amount} : marquer payé, facture et ventilation exacte`, async () => {
      const row = await newRow({ formule: c.formule, pricing_type: c.pricing_type });
      const response = await markRequest(row.id), body = await response.json();
      assert.equal(response.status, 200, JSON.stringify(body));
      const paid = await read(row.id);
      assert.equal(paid.paiement_effectue, true); assert.equal(paid.statut, "Validé");
      assert.ok(paid.paid_at); assert.equal(paid.mode_paiement, "payzen");
      assert.equal(paid.pricing_amount, c.amount);
      assert.equal(canMarkPermisPaid(paid), false);
      assert.ok(paid.facture_url && paid.facture_numero);
      const pdf = files.get(paid.facture_url)!; assert.ok(pdf);
      assert.ok(pdf.toString("latin1").includes(paid.facture_numero));
      const y = c.stamps ? 566 : 558;
      const number = (x: number, y: number) => Number(pdfCell(pdf, x, y).replace(/ /g, ""));
      assert.equal(number(354, y), c.ht); assert.equal(number(443, y), c.vat);
      assert.equal(number(505, y), c.amount - c.stamps);
      if (c.stamps) {
        assert.equal(number(505, 542), 8000); assert.equal(number(443, 542), 0);
        assert.equal(pdfCell(pdf, 54, 531), "Non soumis a TVA");
      } else assert.ok(!pdf.toString("latin1").includes("(Timbres fiscaux) Tj"));
      assert.equal(c.ht + c.vat + c.stamps, c.amount);
      assert.equal(unexpected, 0);
    });
  }
  await t.test("Suivi Permis : le dossier en attente est visible dans la liste et les compteurs existants", async () => {
    const row = await newRow();
    const response = await list(new Request("https://admin.invalid/api/admin/permis", { headers: headers() }));
    assert.equal(response.status, 200);
    const rows: Row[] = (await response.json()).reservations;
    const visible = rows.filter(r => r.id === row.id);
    assert.equal(visible.length, 1);
    assert.deepEqual(compteursPermis(visible), { sansDates: 1, sansExamen: 1, sansCours: 1, incomplets: 1 });
  });
  await t.test("Tarif Salon admin hors période, tarifs publics inchangés", async tt => {
    tt.mock.timers.enable({ apis: ["Date"], now: new Date("2027-05-01T12:00:00-10:00") });
    for (const c of cases.filter(c => c.pricing_type === "salon_tourisme")) {
      const row = await newRow({ formule: c.formule });
      assert.equal(row.pricing_amount, c.amount);
      const publicPrice = getPermisPublicPrice(c.formule as "Classique" | "Sérénité");
      assert.equal(publicPrice.amount, c.formule === "Classique" ? 25000 : 33000);
      assert.equal(publicPrice.salonActive, false);
      const during = getPermisPublicPrice(c.formule as "Classique" | "Sérénité", new Date("2026-09-04T12:00:00-10:00"));
      assert.equal(during.amount, c.amount); assert.equal(during.pricingType, "salon_tourisme_public");
    }
  });
  await t.test("Prix client et tarif invalide refusés ; un dossier par candidat", async () => {
    for (const extra of [{ pricing_amount: 1 }, { pricing_type: "salon_tourisme_public" }, { formule: "Inconnue" },
      { prenom2: "Autre" }, { type_cours: "commun" }, { nombreParticipants: 2 }]) {
      assert.equal((await createRequest(extra)).status, 400);
    }
    assert.equal(getPermisAdminPrice("Classique", "__proto__"), null);
  });
  await t.test("Protection admin des deux actions et validation de l'identifiant", async () => {
    const before = requests;
    assert.equal((await create(new Request("https://admin.invalid/api", { method: "POST" }))).status, 401);
    assert.equal((await mark(new Request("https://admin.invalid/api", { method: "POST" }), { params: Promise.resolve({ id: "1" }) })).status, 401);
    assert.equal((await markRequest("bad")).status, 400); assert.equal(requests, before);
  });
  await t.test("Trois confirmations concurrentes : une seule facture, nouvelle tentative sans effet", async () => {
    const row = await newRow(), before = uploads;
    const results = await Promise.all([markRequest(row.id), markRequest(row.id), markRequest(row.id)]);
    for (const response of results) assert.equal(response.status, 200, JSON.stringify(await response.json()));
    const paid = await read(row.id), pdf = files.get(paid.facture_url!)!;
    assert.equal(uploads - before, 1);
    assert.equal((await markRequest(row.id)).status, 200);
    assert.deepEqual(await read(row.id), paid); assert.deepEqual(files.get(paid.facture_url!), pdf);
    assert.equal(uploads - before, 1);
  });
  await t.test("Le montant enregistré est utilisé sans recalcul à la confirmation", async () => {
    const row = await newRow();
    await db.query("UPDATE reservations SET pricing_amount=23000 WHERE id=$1", [row.id]);
    assert.equal((await markRequest(row.id)).status, 200);
    const paid = await read(row.id);
    assert.equal(paid.pricing_amount, 23000);
    assert.ok(files.get(paid.facture_url!)!.toString("latin1").includes("(Montant paye : 23 000 F CFP)"));
  });
  await t.test("Échec Storage : reste non payé, reprise avec le même instant de confirmation", async () => {
    const row = await newRow();
    failUpload = true;
    try { assert.equal((await markRequest(row.id)).status, 503); } finally { failUpload = false; }
    const pending = await read(row.id);
    assert.equal(pending.paiement_effectue, false); assert.equal(pending.statut, "En attente"); assert.ok(pending.paid_at);
    assert.equal((await markRequest(row.id)).status, 200);
    assert.equal((await read(row.id)).paid_at, pending.paid_at);
  });
  await t.test("Échec finalisation : reprise sans seconde facture ni écrasement", async () => {
    const row = await newRow(), before = uploads;
    failFinalize = true;
    try { assert.equal((await markRequest(row.id)).status, 503); } finally { failFinalize = false; }
    const pending = await read(row.id); assert.equal(pending.paiement_effectue, false);
    assert.equal(uploads - before, 1);
    assert.equal((await markRequest(row.id)).status, 200);
    assert.equal(uploads - before, 1); assert.equal((await read(row.id)).paid_at, pending.paid_at);
  });
  await t.test("Un ancien PDF différent ne peut jamais être écrasé", async () => {
    const row = await newRow(), date = new Date("2026-10-01T20:00:00Z");
    await db.query("UPDATE reservations SET paid_at=$1 WHERE id=$2", [date.toISOString(), row.id]);
    const number = buildPermisInvoicePdf(row, date).invoiceNumber;
    const path = `factures/permis/${number}.pdf`, old = Buffer.from("Ancienne facture conservée");
    files.set(path, old);
    assert.equal((await markRequest(row.id)).status, 409);
    assert.deepEqual(files.get(path), old); assert.equal((await read(row.id)).paiement_effectue, false);
  });
  await t.test("Dossiers publics, archivés et déjà payés sans facture : aucun paiement ni document ajouté", async () => {
    for (const change of ["origine_reservation='site'", "archived=true", "paiement_effectue=true"]) {
      const row = await newRow();
      await db.exec(`UPDATE reservations SET ${change} WHERE id=${row.id}`);
      const before = uploads, original = await read(row.id);
      assert.equal((await markRequest(row.id)).status, 409);
      assert.deepEqual(await read(row.id), original); assert.equal(uploads, before);
    }
  });
  await t.test("Paiement espèces existant : validation immédiate et facture conservées", async () => {
    const row = await newRow({ mode_paiement: "especes", email: "", pricing_type: "normal" });
    assert.equal(row.paiement_effectue, true); assert.equal(row.statut, "Validé");
    assert.equal(row.pricing_amount, 25000); assert.ok(row.facture_url);
    assert.ok(files.has(row.facture_url)); assert.equal(canMarkPermisPaid(row), false);
  });
  assert.equal(unexpected, 0, "Aucun appel PayZen ni envoi d'e-mail");
});
