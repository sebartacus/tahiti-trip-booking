import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "./adminSession";
import { addPermisDays, permisExamOptions, permisExamCalendarWarnings } from "./permisRepriseCalendar";
import { datePermis, groupesPermis, type PermisDossier } from "./permisPlanning";
import { getTahitiToday } from "./tahiti-date";
import { permisReexamenProblem } from "./permisReexamen";

test("Calendrier partagé : mercredi, jeudi férié, délai et années inconnues", () => {
  assert.deepEqual(permisExamOptions("2026-10-07", true), ["2026-10-21", "2026-10-28", "2026-11-04", "2026-11-12"]);
  assert.equal(permisExamOptions("2026-11-04", true)[0], "2026-11-12");
  assert.equal(permisExamOptions("2026-11-05", true)[0], "2026-11-18");
  assert.deepEqual(permisExamOptions("2026-12-25", true), []);
  assert.match(permisExamCalendarWarnings("2026-12-01")[0], /2027/);
  assert.deepEqual(permisExamOptions("2027-01-01", true), []);
  // Existing candidate flows retain their previous cross-year behavior.
  assert.deepEqual(permisExamOptions("2027-01-01"), ["2027-01-13", "2027-01-20", "2027-01-27", "2027-02-03"]);
});

test("Réinscription : routes réelles + transaction PostgreSQL isolée", async t => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table reservations (
      id bigint primary key, prenom text, nom text, prenom2 text, nom2 text, examen text, statut text, archived boolean default false,
      date_cours text, creneau text, paiement_effectue boolean, facture_url text, certificat_url text,
      photo_url text, identite_url text, formulaire_url text, montant integer, email text);
    create table examens_bloques (id serial primary key, date_examen date);
    insert into reservations values (1,'Alice','Test',null,null,'16 septembre 2026','Validé',false,
      '10/09/2026','07h00 - 09h00',true,'facture-privee.pdf','certificat.pdf','photo.jpg','identite.pdf','formulaire.pdf',25000,'test@example.invalid');`);
  // This executes the exact prepared migration only against an in-memory database.
  await db.exec(readFileSync("supabase/migrations/202610070001_add_permis_exam_reinscriptions.sql", "utf8"));
  const originalFetch = globalThis.fetch;
  const keys = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_SESSION_SECRET"] as const;
  const env = keys.map(key => process.env[key]);
  Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: "https://reexam-tests.invalid", SUPABASE_SERVICE_ROLE_KEY: "test-role", ADMIN_SESSION_SECRET: "test-reexam-secret" });
  let requests = 0, rpcCalls = 0, missingRpc = false, beforeRpc: (() => Promise<void>) | null = null;
  const read = async () => (await db.query<PermisDossier & Record<string, unknown>>("select * from reservations where id=1")).rows[0];
  const history = async () => (await db.query<{ reservation_id: number; ancienne_date_examen: string; nouvelle_date_examen: string; resultat: string; reinscrit_at: string }>("select * from permis_exam_reinscriptions order by id")).rows;
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init), url = new URL(req.url); requests++;
    assert.equal(url.origin, "https://reexam-tests.invalid");
    assert.equal(req.headers.get("authorization"), "Bearer test-role");
    if (url.pathname === "/rest/v1/reservations") { assert.equal(req.method, "GET"); return Response.json(await read()); }
    if (url.pathname === "/rest/v1/examens_bloques") { assert.equal(req.method, "GET"); return Response.json((await db.query("select date_examen::text from examens_bloques")).rows); }
    assert.equal(url.pathname, "/rest/v1/rpc/permis_reinscrire_examen"); assert.equal(req.method, "POST"); rpcCalls++;
    if (missingRpc) return Response.json({ code: "PGRST202", message: "Missing function" }, { status: 404 });
    if (beforeRpc) { const action = beforeRpc; beforeRpc = null; await action(); }
    const body = await req.json();
    assert.deepEqual(Object.keys(body).sort(), ["p_ancienne_date", "p_expected_examen", "p_nouvelle_date", "p_reservation_id"]);
    try {
      const result = await db.query<{ result: unknown }>("select permis_reinscrire_examen($1,$2,$3,$4) result", [body.p_reservation_id, body.p_expected_examen, body.p_ancienne_date, body.p_nouvelle_date]);
      return Response.json(result.rows[0].result);
    } catch { return Response.json({ code: "TEST", message: "Transaction failed" }, { status: 500 }); }
  };
  t.after(async () => { globalThis.fetch = originalFetch; keys.forEach((key, i) => { if (env[i] === undefined) delete process.env[key]; else process.env[key] = env[i]; }); await db.close(); });
  const { POST } = await import("../app/api/admin/permis/[id]/examen/route");
  const { GET } = await import("../app/api/admin/permis/examens/route");
  const headers = () => ({ "Content-Type": "application/json", cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken()}`, origin: "https://admin.invalid" });
  const today = getTahitiToday(), exam = permisExamOptions(today, true)[0];
  assert.ok(exam, "Extend the verified holiday data before running this test after 2026");
  const original = await read();
  const send = (extra: Record<string, unknown> = {}) => POST(new Request("https://admin.invalid/api", { method: "POST", headers: headers(), body: JSON.stringify({ examen: exam, expectedExamen: original.examen, ...extra }) }), { params: Promise.resolve({ id: "1" }) });

  await t.test("Session admin absente et origine étrangère : refus sans accès DB", async () => {
    const before = requests;
    assert.equal((await POST(new Request("https://admin.invalid/api", { method: "POST" }), { params: Promise.resolve({ id: "1" }) })).status, 401);
    assert.equal((await GET(new Request("https://admin.invalid/api"))).status, 401);
    assert.equal((await POST(new Request("https://admin.invalid/api", { method: "POST", headers: { ...headers(), origin: "https://evil.invalid" } }), { params: Promise.resolve({ id: "1" }) })).status, 403);
    assert.equal(requests, before);
  });
  await t.test("Sessions bloquées filtrées et double contrôle atomique", async () => {
    await db.query("insert into examens_bloques(date_examen) values($1)", [exam]);
    const response = await GET(new Request("https://admin.invalid/api", { headers: headers() }));
    assert.equal(response.status, 200); assert.ok(!(await response.json()).exams.includes(exam));
    assert.equal((await send()).status, 409); assert.deepEqual(await read(), original); assert.equal((await history()).length, 0);
    await db.exec("delete from examens_bloques");
    beforeRpc = async () => { await db.query("insert into examens_bloques(date_examen) values($1)", [exam]); };
    assert.equal((await send()).status, 409); assert.deepEqual(await read(), original);
    await db.exec("delete from examens_bloques");
  });
  await t.test("Dossier deux participants : chacun identifié, aucun déplacé", async () => {
    for (const column of ["prenom2", "nom2"]) {
      await db.exec(`update reservations set ${column}='Second'`);
      assert.match(permisReexamenProblem(await read(), today)!, /deux participants/);
      const before = rpcCalls; const response = await send(); assert.equal(response.status, 409); assert.equal(rpcCalls, before);
      await db.exec(`update reservations set ${column}=null`);
    }
    beforeRpc = async () => { await db.exec("update reservations set prenom2='Second'"); };
    assert.equal((await send()).status, 409); assert.equal((await history()).length, 0);
    await db.exec("update reservations set prenom2=null");
  });
  await t.test("Date invalide, inconnue 2027, délai, injection de champs : aucun changement", async () => {
    for (const extra of [{ examen: "2026-02-30" }, { examen: "2027-01-13" }, { examen: addPermisDays(today, 7) }, { montant: 1 }, { expectedExamen: "Autre" }]) assert.ok([400, 409].includes((await send(extra)).status));
    assert.deepEqual(await read(), original); assert.equal((await history()).length, 0);
  });
  await t.test("Dossier archivé, permis obtenu, sans examen ou examen futur : refus", async () => {
    for (const sql of ["archived=true", "statut='Permis obtenu'", "examen='Plus tard'", `examen='${exam}'`]) {
      await db.exec("update reservations set " + sql); assert.equal((await send()).status, 409);
      await db.query("update reservations set archived=false,statut=$1,examen=$2", [original.statut, original.examen]);
    }
  });
  await t.test("Migration manquante : erreur claire, aucun UPDATE de secours", async () => {
    missingRpc = true;
    try { const response = await send(); assert.equal(response.status, 503); assert.match((await response.json()).error, /migration/); }
    finally { missingRpc = false; }
    assert.deepEqual(await read(), original);
  });
  await t.test("Conflit entre lecture et transaction : conservation du dossier", async () => {
    beforeRpc = async () => { await db.exec("update reservations set examen='23/09/2026'"); };
    assert.equal((await send()).status, 409); assert.equal((await history()).length, 0);
    await db.query("update reservations set examen=$1", [original.examen]);
  });
  await t.test("Erreur UPDATE après insertion historique : rollback intégral", async () => {
    await db.exec(`create function fail_exam_update() returns trigger language plpgsql as $$ begin raise exception 'forced error'; end $$;
      create trigger fail_exam_update before update of examen on reservations for each row execute function fail_exam_update();`);
    assert.equal((await send()).status, 503); assert.deepEqual(await read(), original); assert.equal((await history()).length, 0);
    await db.exec("drop trigger fail_exam_update on reservations");
  });
  await t.test("Succès : seule date modifiée, historique durable et regroupement", async () => {
    const response = await send(); assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
    const saved = await read(); assert.equal(datePermis(saved.examen), exam);
    assert.deepEqual({ ...saved, examen: original.examen }, original);
    const entries = await history(); assert.equal(entries.length, 1);
    assert.equal(entries[0].resultat, "echec"); assert.equal(String(entries[0].reservation_id), "1"); assert.ok(entries[0].reinscrit_at);
    assert.equal(new Date(entries[0].ancienne_date_examen as string).toISOString().slice(0, 10), "2026-09-16");
    assert.equal(new Date(entries[0].nouvelle_date_examen as string).toISOString().slice(0, 10), exam);
    assert.equal(groupesPermis([saved], "examen", today)[0].date, exam);
    assert.equal((await send()).status, 409); assert.equal((await history()).length, 1);
  });
  await t.test("Deux confirmations concurrentes : une date, un historique", async () => {
    await db.query("update reservations set examen=$1", [original.examen]);
    const before = (await history()).length;
    const results = await Promise.all([send(), send()]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]); assert.equal((await history()).length, before + 1);
  });
  await t.test("Historique privé et RPC réservé au serveur", async () => {
    const result = await db.query<{ allowed: boolean }>("select has_function_privilege('anon','permis_reinscrire_examen(text,text,date,date)','EXECUTE') allowed");
    assert.equal(result.rows[0].allowed, false);
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from permis_exam_reinscriptions"));
    await assert.rejects(db.query("select permis_reinscrire_examen('1','x','2026-01-01','2026-12-16')"));
    await db.exec("reset role");
  });
});
