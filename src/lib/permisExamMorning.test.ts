import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { permisAllowedSlots, permisExamAvailable } from "./permisRepriseCalendar";
import { permisIsExamDay } from "./permisExamDay";
import { validatePermisPlanning } from "./permisScheduling";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "./adminSession";
import { SALON_PRICING } from "./salon-pricing";

const empty = { examen: null, date_cours: null, creneau: null };
const morning = "07h00 - 09h00", afternoon = "13h00 - 15h00";
const cases = [
  ["2026-11-18", morning, false], ["2026-11-18", afternoon, true],
  ["2026-11-12", morning, false], ["2026-11-12", afternoon, true],
  ["2026-11-19", morning, true], ["2026-11-11", morning, true],
] as const;

test("Matinées globales : reports, inscriptions closes, Plus tard et cours communs", () => {
  assert.equal(permisExamAvailable("2026-11-12", "2026-11-10"), false);
  assert.equal(permisIsExamDay("12/11/2026"), true);
  for (const examen of [null, "Plus tard", "2026-11-25"]) for (const [date_cours, creneau, allowed] of cases) {
    assert.equal(permisAllowedSlots(date_cours, "individuel").includes(creneau), allowed);
    const run = () => validatePermisPlanning(empty, { examen, date_cours, creneau }, "2026-11-10");
    if (allowed) run(); else assert.throws(run, /Matinée/);
  }
  assert.throws(() => validatePermisPlanning(empty, { examen: "12/11/2026", date_cours: "12/11/2026", creneau: afternoon }, "2026-11-10"), /précéder/);
  assert.deepEqual(permisAllowedSlots("2026-11-12", "commun"), ["13h00 - 17h00"]);
  assert.equal(permisAllowedSlots("2026-11-19", "commun").length, 4);
  assert.deepEqual(permisAllowedSlots("2026-11-17", "commun", ["17 novembre 2026"]), ["13h00 - 17h00"]);
  assert.throws(() => validatePermisPlanning(empty, { date_cours: "2026-11-17", creneau: morning }, "2026-11-10", ["17/11/2026"]), /Matinée/);
  assert.equal(validatePermisPlanning(empty, { examen: "Plus tard" }, "2026-11-10").after.date_cours, null);
  // Unchanged historical bookings do not get rewritten or invalidate exam-only changes.
  const old = { examen: "Plus tard", date_cours: "2026-11-12", creneau: morning };
  assert.equal(validatePermisPlanning(old, {}, "2026-11-10").changed, false);
});

test("API public, Admin et Salon : rejets avant toute écriture ; disponibilité des autres jours", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-10T20:00:00Z") });
  const keys = { NEXT_PUBLIC_SUPABASE_URL: "https://morning.invalid", SUPABASE_SERVICE_ROLE_KEY: "test", PAYMENT_INTENT_SECRET: "test-morning-payment-secret", ADMIN_SESSION_SECRET: "test-morning-admin-secret" };
  const before = { ...process.env }, original = globalThis.fetch;
  Object.assign(process.env, keys);
  let inserts = 0;
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    assert.equal(url.origin, "https://morning.invalid", "No real network");
    if (url.pathname.endsWith("/examens_bloques")) return Response.json(null);
    if (request.method === "GET" && url.searchParams.get("select") === "examen") return Response.json([{ examen: "17 novembre 2026" }]);
    assert.equal(request.method, "POST");
    inserts++;
    const row = await request.json();
    return Response.json({ id: inserts, pricing_amount: row.pricing_amount, pricing_type: row.pricing_type });
  };
  t.after(() => { globalThis.fetch = original; t.mock.timers.reset(); for (const key of Object.keys(keys)) { if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key]; } });
  const { POST: publicPost } = await import("../app/api/permis/reservation/route");
  const { POST: adminPost } = await import("../app/api/admin/permis/salon/route");
  const { POST: salonPost } = await import("../app/api/admin/salon/route");
  const headers = { cookie: ADMIN_SESSION_COOKIE + "=" + createAdminSessionToken(), "Content-Type": "application/json" };
  const request = (body: object) => new Request("https://tests.invalid/api", { method: "POST", headers, body: JSON.stringify(body) });
  const base = { formule: "Classique", prenom: "Test", nom: "Test", telephone: "123", email: "test@example.invalid", nombreParticipants: 1, type_cours: "individuel", examen: "25/11/2026" };
  for (const date_cours of ["12/11/2026", "18/11/2026", "17/11/2026"]) {
    assert.equal((await publicPost(request({ ...base, date_cours, creneau: morning }))).status, 400);
    assert.equal((await publicPost(request({ ...base, examen: "Plus tard", date_cours, creneau: morning }))).status, 400);
    assert.equal((await adminPost(request({ ...base, date_cours, creneau: morning, mode_paiement: "especes" }))).status, 400);
    assert.equal((await salonPost(request({ offerCode: SALON_PRICING.permis.classique.offerCode, firstName: "Test", lastName: "Test", phone: "123", paymentMethod: "especes", bookingLater: false, exam: "25/11/2026", courseDate: date_cours, slot: morning }))).status, 400);
  }
  assert.equal(inserts, 0);
  for (const [date_cours, creneau, allowed] of cases) {
    assert.equal((await publicPost(request({ ...base, date_cours, creneau }))).status, allowed ? 201 : 400);
  }
  assert.equal((await publicPost(request({ ...base, examen: "Plus tard", date_cours: "12/11/2026", creneau: "13h00 - 17h00", type_cours: "commun", nombreParticipants: 2 }))).status, 201);
  assert.equal((await publicPost(request({ ...base, examen: "Plus tard" }))).status, 201);
});

test("Reprise sécurisée : disponibilités filtrées et refus serveur sans RPC", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-10T20:00:00Z") });
  const keys = { NEXT_PUBLIC_SUPABASE_URL: "https://reprise-morning.invalid", SUPABASE_SERVICE_ROLE_KEY: "test", PERMIS_ACCESS_SECRET: "morning-reprise-test-secret-at-least-32-chars", PERMIS_REPRISE_ACCESS_ENABLED: "true", PERMIS_REPRISE_ORIGIN: "https://tests.invalid" };
  const before = { ...process.env }, original = globalThis.fetch;
  Object.assign(process.env, keys);
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    assert.equal(url.origin, "https://reprise-morning.invalid");
    assert.equal(request.method, "GET", "Rejected planning never calls a writing RPC");
    if (url.pathname.endsWith("/examens_bloques")) return Response.json([]);
    assert.ok(url.pathname.endsWith("/reservations"));
    const select = url.searchParams.get("select");
    if (select === "examen") return Response.json([{ examen: "17/11/2026" }]);
    if (select === "date_cours,creneau") return Response.json([]);
    return Response.json({ id: 1, archived: false, type_cours: "commun", examen: "Plus tard", date_cours: null, creneau: null });
  };
  t.after(() => { globalThis.fetch = original; t.mock.timers.reset(); for (const key of Object.keys(keys)) { if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key]; } });
  const { PERMIS_COOKIE, createPermisCookie } = await import("./permisCandidateAccess");
  const { GET } = await import("../app/api/permis/reprise/disponibilites/route");
  const { PATCH } = await import("../app/api/permis/reprise/planning/route");
  const headers = { cookie: PERMIS_COOKIE + "=" + createPermisCookie("1"), origin: "https://tests.invalid", "Content-Type": "application/json" };
  for (const day of ["2026-11-12", "2026-11-18", "2026-11-17"]) {
    const available = await GET(new Request("https://tests.invalid/api?date=" + day, { headers }));
    assert.equal(available.status, 200);
    assert.deepEqual((await available.json()).slots, ["13h00 - 17h00"]);
    const rejected = await PATCH(new Request("https://tests.invalid/api", { method: "PATCH", headers, body: JSON.stringify({ date_cours: day, creneau: "09h00 - 13h00" }) }));
    assert.equal(rejected.status, 400);
  }
  const available = await GET(new Request("https://tests.invalid/api?date=2026-11-19", { headers }));
  assert.equal((await available.json()).slots.length, 4);
  assert.equal((await PATCH(new Request("https://tests.invalid/api", { method: "PATCH", headers, body: JSON.stringify({ creneau: 123 }) }))).status, 400);
});

const morningMigration = readFileSync("supabase/migrations/202611100001_guard_permis_exam_mornings.sql", "utf8");
const chronologyMigration = readFileSync("supabase/migrations/202611090001_guard_permis_chronology.sql", "utf8");
async function preparePermisDatabase(db: PGlite, rpc: "secure" | "missing" | "public" | "anon" | "no_service" = "secure") {
  await db.exec("create role anon; create role authenticated; create role service_role; create table reservations(id int primary key, examen text,date_cours text,creneau text,archived boolean,statut text); create table examens_bloques(date_examen date)");
  const base = readFileSync("supabase/migrations/202609060001_prepare_permis_secure_reprise.sql", "utf8");
  await db.exec(base.slice(base.indexOf("create function public.permis_parse_civil_date("), base.indexOf("-- Future server-only primitive.")));
  if (rpc !== "missing") {
    const complete = readFileSync("supabase/migrations/202609060002_complete_permis_secure_reprise.sql", "utf8");
    await db.exec(complete.slice(complete.indexOf("create or replace function")));
    if (rpc !== "public") await db.exec("revoke all on function permis_save_planning(text,jsonb,jsonb) from public,anon,authenticated; grant execute on function permis_save_planning(text,jsonb,jsonb) to service_role");
    if (rpc === "anon") await db.exec("grant execute on function permis_save_planning(text,jsonb,jsonb) to anon");
    if (rpc === "no_service") await db.exec("revoke execute on function permis_save_planning(text,jsonb,jsonb) from service_role");
  }
}

test("Migration préparée : calendrier SQL identique, écritures directes et historique préservé", async () => {
  const db = new PGlite();
  try {
    await preparePermisDatabase(db);
    await db.exec("insert into reservations values(1,'25/11/2026','12/11/2026','07h00 - 09h00',false,'En attente'); insert into reservations(id,examen) values(22,'invalid historical date')");
    await db.exec(chronologyMigration);
    const acl = await db.query("select proacl::text,proowner from pg_proc where oid='permis_save_planning(text,jsonb,jsonb)'::regprocedure");
    await db.exec(morningMigration);
    assert.deepEqual((await db.query("select proacl::text,proowner from pg_proc where oid='permis_save_planning(text,jsonb,jsonb)'::regprocedure")).rows, acl.rows);
    const dates = await db.query<{ day: string; scheduled: boolean }>("select d::date::text as day,permis_is_exam_day(d::date) as scheduled from generate_series('2026-01-01'::date,'2027-02-10'::date,interval '1 day') d");
    for (const row of dates.rows) assert.equal(row.scheduled, permisIsExamDay(row.day), row.day);
    await db.exec("update reservations set statut='Validé' where id=1; update reservations set date_cours=date_cours where id=1");
    assert.equal((await db.query<{ date_cours: string }>("select date_cours from reservations where id=1")).rows[0].date_cours,"12/11/2026");
    let id = 2;
    for (const [day, slot, allowed] of cases) {
      const insert = () => db.query("insert into reservations(id,examen,date_cours,creneau) values($1,'25/11/2026',$2,$3)",[id++,day,slot]);
      if (allowed) await insert(); else await assert.rejects(insert, /Exam morning unavailable/);
    }
    await assert.rejects(db.exec("insert into reservations(id,examen,date_cours,creneau) values(20,'12/11/2026','12/11/2026','13h00 - 15h00')"), /Course must precede exam/);
    await db.exec("insert into reservations(id,examen) values(21,'17 novembre 2026')");
    await assert.rejects(db.exec("insert into reservations(id,examen,date_cours,creneau) values(23,'Plus tard','17/11/2026','09h00 - 13h00')"), /Exam morning unavailable/);
    await assert.rejects(db.exec("update reservations set date_cours='18/11/2026' where id=1"), /Exam morning unavailable/);
    await db.exec("insert into reservations(id,examen,date_cours,creneau) values(24,'Plus tard','12/11/2026','13h00 - 17h00')");
  } finally { await db.close(); }
});


test("SQL transactionnel : INSERT/UPDATE groupés et session exceptionnelle du 17 novembre", async () => {
  const db = new PGlite();
  try {
    await preparePermisDatabase(db);
    await db.exec(chronologyMigration);
    await db.exec(morningMigration);
    // The original audit failure, in both row orders and with duplicate sessions.
    for (const values of [
      "(1,'Plus tard','17/11/2026','07h00 - 09h00'),(2,'17 novembre 2026',null,null)",
      "(2,'17 novembre 2026',null,null),(1,'Plus tard','17/11/2026','07h00 - 09h00')",
      "(1,'Plus tard','17/11/2026','07h00 - 09h00'),(2,'17/11/2026',null,null),(3,'2026-11-17',null,null)",
    ]) {
      await assert.rejects(db.exec("insert into reservations(id,examen,date_cours,creneau) values" + values), /Exam morning unavailable|New exam session conflicts/);
      assert.equal((await db.query<{ count: number }>("select count(*)::int as count from reservations")).rows[0].count, 0, "The entire batch rolls back");
    }
    await db.exec("insert into reservations(id,examen,date_cours,creneau) values(1,'Plus tard','16/11/2026','07h00 - 09h00'),(2,'Plus tard',null,null)");
    const before = (await db.query("select * from reservations order by id")).rows;
    await assert.rejects(db.exec("update reservations set date_cours=case when id=1 then '17/11/2026' else date_cours end,examen=case when id=2 then '17 novembre 2026' else examen end"), /Exam morning unavailable|New exam session conflicts/);
    assert.deepEqual((await db.query("select * from reservations order by id")).rows, before);
    // Multiple statements in one transaction: the newly introduced session must
    // also check the course written earlier; neither row is silently preserved.
    await db.exec("begin; update reservations set date_cours='17/11/2026' where id=1");
    await assert.rejects(db.exec("update reservations set examen='17 novembre 2026' where id=2"), /New exam session conflicts/);
    await db.exec("rollback");
    assert.deepEqual((await db.query("select * from reservations order by id")).rows, before);
    // An UPDATE batch may fix a conflict while introducing the session. Only
    // its final state is validated, not the intermediate order of updated rows.
    await db.exec("update reservations set date_cours='17/11/2026' where id=1");
    await db.exec("update reservations set creneau=case when id=1 then '13h00 - 17h00' else creneau end,examen=case when id=2 then '17 novembre 2026' else examen end");
    assert.equal((await db.query<{ creneau: string }>("select creneau from reservations where id=1")).rows[0].creneau, "13h00 - 17h00");
    assert.equal((await db.query<{ scheduled: boolean }>("select permis_is_exam_day('2026-11-17') as scheduled")).rows[0].scheduled, true);
    // Removing the last exceptional session and moving a course to that morning
    // in the same UPDATE is valid once the whole statement has finished.
    await db.exec("update reservations set creneau=case when id=1 then '07h00 - 09h00' else creneau end,examen=case when id=2 then '25/11/2026' else examen end");
    assert.equal((await db.query<{ scheduled: boolean }>("select permis_is_exam_day('2026-11-17') as scheduled")).rows[0].scheduled, false);
    const historical = (await db.query("select * from reservations where id=1")).rows;
    await assert.rejects(db.exec("insert into reservations(id,examen) values(3,'17/11/2026')"), /New exam session conflicts/);
    assert.deepEqual((await db.query("select * from reservations where id=1")).rows, historical, "Existing course is not moved or deleted");
    // UPSERT has separate transition tables for inserted and updated rows. Both
    // must use the same pre-statement sessions, not mistake each other for old data.
    await db.exec("insert into reservations(id,examen) values(4,'Plus tard')");
    await assert.rejects(db.exec("insert into reservations(id,examen) values(3,'17/11/2026'),(4,'17 novembre 2026') on conflict(id) do update set examen=excluded.examen"), /New exam session conflicts/);
    assert.equal((await db.query<{ examen: string }>("select examen from reservations where id=4")).rows[0].examen, "Plus tard");
    assert.equal((await db.query<{ count: number }>("select count(*)::int as count from reservations where id=3")).rows[0].count, 0);
    // A nested planning statement must not overwrite the outer statement's
    // baseline and disguise its newly introduced exceptional session as old.
    await db.exec("create function test_nested_planning() returns trigger language plpgsql as $$ begin if new.id=30 then insert into reservations(id,examen) values(31,'Plus tard'); end if; return new; end $$; create trigger test_nested_planning after insert on reservations for each row execute function test_nested_planning()");
    await assert.rejects(db.exec("insert into reservations(id,examen) values(30,'17/11/2026')"), /New exam session conflicts/);
    assert.equal((await db.query<{ count: number }>("select count(*)::int as count from reservations where id in (30,31)")).rows[0].count, 0);
    const triggers = (await db.query<{ tgname: string }>("select tgname from pg_trigger where tgrelid='reservations'::regclass and not tgisinternal")).rows.map(r => r.tgname);
    assert.ok(triggers.includes("permis_chronology_guard"));
    assert.ok(triggers.includes("permis_exam_morning_guard"));
    await assert.rejects(db.exec("update reservations set examen='17/11/2026' where id=1"), /Course must precede exam/);
  } finally { await db.close(); }
});

test("SQL historique : aucun backfill, droits privés du verrou, cours commun et Plus tard", async () => {
  const db = new PGlite();
  try {
    await preparePermisDatabase(db);
    await db.exec("insert into reservations(id,examen,date_cours,creneau) values(1,'Plus tard','17/11/2026','07h00 - 09h00'),(2,'17 novembre 2026',null,null),(3,'Plus tard','30/11/2026','historical invalid slot')");
    await db.exec(chronologyMigration);
    const before = (await db.query("select * from reservations order by id")).rows;
    const policies = (await db.query("select * from pg_policies order by schemaname,tablename,policyname")).rows;
    await db.exec(morningMigration);
    assert.deepEqual((await db.query("select * from reservations order by id")).rows, before);
    assert.deepEqual((await db.query("select * from pg_policies order by schemaname,tablename,policyname")).rows, policies);
    const revision = (await db.query("select revision::text from permis_exam_guard.writer_lock")).rows;
    await db.exec("update reservations set statut='Validé' where id=1");
    assert.deepEqual((await db.query("select revision::text from permis_exam_guard.writer_lock")).rows, revision, "Metadata-only updates do not take the planning lock");
    await db.exec("update reservations set date_cours=date_cours where id=1");
    await db.exec("insert into reservations(id,examen) values(4,'17/11/2026')");
    // A malformed old slot must not abort an unrelated new exceptional session.
    await db.exec("insert into reservations(id,examen) values(5,'30 novembre 2026')");
    await assert.rejects(db.exec("insert into reservations(id,examen,date_cours,creneau) values(6,'Plus tard','12/11/2026','09h00 - 13h00')"), /Exam morning unavailable/);
    await db.exec("insert into reservations(id,examen,date_cours,creneau) values(6,'Plus tard','12/11/2026','13h00 - 17h00')");
    await db.exec("insert into reservations(id,examen,date_cours,creneau) values(7,'Plus tard','19/11/2026','07h00 - 11h00'),(8,'Plus tard',null,null)");
    for (const role of ["anon", "authenticated", "service_role"]) {
      const access = await db.query<{ schema_access: boolean; table_access: boolean }>("select has_schema_privilege($1,'permis_exam_guard','USAGE') as schema_access,has_table_privilege($1,'permis_exam_guard.writer_lock','UPDATE') as table_access",[role]);
      assert.deepEqual(access.rows[0], { schema_access: false, table_access: false });
    }
  } finally { await db.close(); }
});

test("Précontrôle RPC : absence ou privilèges dangereux => échec explicite et atomique", async () => {
  for (const mode of ["missing", "public", "anon", "no_service"] as const) {
    const db = new PGlite();
    try {
      await preparePermisDatabase(db, mode);
      await db.exec(chronologyMigration);
      const before = (await db.query("select proacl::text,proowner from pg_proc where oid=to_regprocedure('permis_save_planning(text,jsonb,jsonb)')")).rows;
      await assert.rejects(db.exec(morningMigration), mode === "missing" ? /Required secure RPC.*missing/ : /Unsafe planning RPC privileges/);
      await db.exec("rollback");
      assert.deepEqual((await db.query("select proacl::text,proowner from pg_proc where oid=to_regprocedure('permis_save_planning(text,jsonb,jsonb)')")).rows, before, "Existing grants remain exactly unchanged");
      assert.equal((await db.query<{ name: string | null }>("select to_regnamespace('permis_exam_guard')::text as name")).rows[0].name, null);
      assert.equal((await db.query<{ name: string | null }>("select to_regprocedure('public.permis_is_exam_day(date)')::text as name")).rows[0].name, null);
      assert.deepEqual((await db.query<{ tgname: string }>("select tgname from pg_trigger where tgrelid='reservations'::regclass and not tgisinternal")).rows, [{ tgname: "permis_chronology_guard" }]);
    } finally { await db.close(); }
  }
});
