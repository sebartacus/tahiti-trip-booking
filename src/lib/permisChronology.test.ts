import assert from "node:assert/strict";
import test from "node:test";
import { permisCourseBeforeExam, validatePermisPlanning } from "./permisScheduling";
import { permisAllowedSlots } from "./permisRepriseCalendar";
import { datePermis } from "./permisPlanning";
const empty = { examen: null, date_cours: null, creneau: null };
test("Chronologie : decembre accentue, cours individuels et communs, choix differes", () => {
  assert.equal(datePermis("2 d\u00e9cembre 2026"), "2026-12-02");
  for (const slot of ["13h00 - 15h00", "13h00 - 17h00"]) {
    for (const course of ["02/12/2026", "03/12/2026", "10/12/2026"]) {
      assert.equal(permisCourseBeforeExam("2 d\u00e9cembre 2026", course, slot), false);
      assert.throws(() => validatePermisPlanning(empty, { examen: "2 d\u00e9cembre 2026", date_cours: course, creneau: slot }, "2026-11-09"));
    }
    assert.equal(permisCourseBeforeExam("9 d\u00e9cembre 2026", "02/12/2026", slot), true);
    assert.equal(validatePermisPlanning(empty, { examen: "9 d\u00e9cembre 2026", date_cours: "02/12/2026", creneau: slot }, "2026-11-09").changed, true);
    const firstCourse = validatePermisPlanning(empty, { date_cours: "02/12/2026", creneau: slot }, "2026-11-09").after;
    assert.throws(() => validatePermisPlanning(firstCourse, { examen: "02/12/2026" }, "2026-11-09"));
    assert.equal(validatePermisPlanning(firstCourse, { examen: "09/12/2026" }, "2026-11-09").changed, true);
    const firstExam = validatePermisPlanning(empty, { examen: "02/12/2026" }, "2026-11-09").after;
    assert.throws(() => validatePermisPlanning(firstExam, { date_cours: "02/12/2026", creneau: slot }, "2026-11-09"));
    assert.equal(validatePermisPlanning(firstExam, { date_cours: "01/12/2026", creneau: slot }, "2026-11-09").changed, true);
    assert.equal(permisCourseBeforeExam("Plus tard", "02/12/2026", slot), true);
  }
  assert.equal(permisCourseBeforeExam("02/12/2026", null), true);
  assert.ok(permisAllowedSlots("2026-12-02", "commun").includes("13h00 - 17h00"));
});
test("API publique : rejette avant toute ecriture, conserve deux candidats et Plus tard", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-09T20:00:00Z") });
  const keys = { NEXT_PUBLIC_SUPABASE_URL: "https://chronology.invalid", SUPABASE_SERVICE_ROLE_KEY: "test-key", PAYMENT_INTENT_SECRET: "test-secret-chronology" };
  const before = { ...process.env }, original = globalThis.fetch;
  Object.assign(process.env, keys);
  let inserts = 0;
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    assert.equal(url.origin, "https://chronology.invalid");
    if (url.pathname.endsWith("/examens_bloques")) return Response.json(null);
    if (request.method === "GET" && url.searchParams.get("select") === "examen") return Response.json([]);
    assert.equal(request.method, "POST");
    const row = await request.json(); inserts++;
    assert.equal(row.prenom2, "Bob"); assert.equal(row.creneau, "13h00 - 17h00");
    return Response.json({ id: inserts, pricing_amount: row.pricing_amount, pricing_type: row.pricing_type });
  };
  t.after(() => { globalThis.fetch = original; t.mock.timers.reset(); for (const key of Object.keys(keys)) { if (before[key] === undefined) delete process.env[key]; else process.env[key] = before[key]; } });
  const { POST } = await import("../app/api/permis/reservation/route");
  const base = { formule: "Classique", prenom: "Alice", nom: "Test", prenom2: "Bob", nom2: "Test", telephone: "123", email: "test@example.invalid", nombreParticipants: 2, type_cours: "commun", date_cours: "02/12/2026", creneau: "13h00 - 17h00" };
  const send = (patch: object) => POST(new Request("https://tests.invalid/api", { method: "POST", body: JSON.stringify({ ...base, ...patch }) }));
  assert.equal((await send({ examen: "2 d\u00e9cembre 2026" })).status, 400);
  assert.equal((await send({ examen: "2 d\u00e9cembre 2026", date_cours: "03/12/2026" })).status, 400);
  assert.equal(inserts, 0);
  assert.equal((await send({ examen: "9 d\u00e9cembre 2026" })).status, 201);
  assert.equal((await send({ examen: "Plus tard" })).status, 201);
  assert.equal(inserts, 2);
});

test("Garde SQL : nouvelles ecritures seulement, donnees historiques preservees", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { readFileSync } = await import("node:fs");
  const db = new PGlite();
  try {
    await db.exec("create table reservations(id int primary key, examen text, date_cours text, creneau text, prenom2 text, statut text)");
    const base = readFileSync("supabase/migrations/202609060001_prepare_permis_secure_reprise.sql", "utf8");
    const start = base.indexOf("create function public.permis_parse_civil_date(");
    const end = base.indexOf("create function public.permis_course_range(", start);
    await db.exec(base.slice(start, end));
    await db.exec("insert into reservations values(1,'02/12/2026','02/12/2026','13h00 - 17h00','Bob','En attente')");
    await db.exec(readFileSync("supabase/migrations/202611090001_guard_permis_chronology.sql", "utf8"));
    await db.exec("update reservations set statut='Valide' where id=1");
    await db.exec("update reservations set examen=examen where id=1");
    assert.equal((await db.query<{date_cours:string}>("select date_cours from reservations where id=1")).rows[0].date_cours, "02/12/2026");
    for (const day of ["02/12/2026", "03/12/2026"]) await assert.rejects(db.query("insert into reservations(id,examen,date_cours,creneau) values(2,'02/12/2026',$1,'13h00 - 17h00')", [day]), /Course must precede exam/);
    await db.exec("insert into reservations values(2,'09/12/2026','02/12/2026','13h00 - 17h00','Bob',null)");
    await assert.rejects(db.exec("update reservations set examen='02/12/2026' where id=2"), /Course must precede exam/);
    await db.exec("insert into reservations(id,examen) values(3,'02/12/2026'); insert into reservations(id,examen,date_cours,creneau) values(4,'Plus tard','02/12/2026','13h00 - 15h00')");
    await assert.rejects(db.exec("update reservations set date_cours='03/12/2026',creneau='13h00 - 15h00' where id=3"), /Course must precede exam/);
    await assert.rejects(db.exec("update reservations set examen='02/12/2026' where id=4"), /Course must precede exam/);
  } finally { await db.close(); }
});
