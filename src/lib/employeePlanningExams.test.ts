import assert from "node:assert/strict";
import { eventOnDay, planningEvent, planningEvents } from "./employeePlanning";
import { readEmployeeActivity } from "./employeePlanningServer";

async function main() {
  const row = { date_cours: "2026-08-12", creneau: "07h00 - 09h00", examen: "23/09/2026", prenom: "Alice", nom: "Test", prenom2: "Bob", nom2: "Test" };
  const events = planningEvents("permis", row);
  assert.deepEqual(events[0], planningEvent("permis", row));
  assert.ok(eventOnDay(events[0], "2026-08-12"));
  const exam = events[1];
  assert.equal(exam.title, "EXAMEN PERMIS");
  assert.equal(exam.activity, "permis");
  assert.equal(exam.isExam, true);
  assert.equal(exam.time, "");
  assert.ok(eventOnDay(exam, "2026-09-23"));
  assert.ok(!eventOnDay(exam, "2026-09-24"));
  assert.deepEqual(exam.names, ["Alice Test", "Bob Test"]);
  assert.deepEqual(planningEvents("permis", { ...row, prenom2: null, nom2: null })[1].names, ["Alice Test"]);
  for (const examen of [null, "", "Plus tard", "31/09/2026"]) {
    assert.deepEqual(planningEvents("permis", { ...row, examen }), [planningEvent("permis", { ...row, examen })]);
  }
  Object.assign(process.env, { NEXT_PUBLIC_SUPABASE_URL: "https://planning-backend.invalid", SUPABASE_SERVICE_ROLE_KEY: "test-service" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    assert.equal(url.hostname, "planning-backend.invalid");
    assert.equal((init?.method || "GET").toUpperCase(), "GET");
    assert.equal(url.searchParams.has("date_cours"), false);
    return new Response(JSON.stringify([
      row, { ...row, date_cours: null, prenom: "Claire" },
      { ...row, date_cours: null, examen: "Plus tard" },
      { ...row, date_cours: "2026-09-10", examen: null },
    ]), { headers: { "Content-Type": "application/json" } });
  };
  try {
    const rows = await readEmployeeActivity("permis", "2026-09");
    assert.equal(rows.length, 3);
    const september = rows.flatMap(row => planningEvents("permis", row));
    assert.equal(september.filter(event => eventOnDay(event, "2026-09-23")).length, 2);
    assert.equal(september.filter(event => eventOnDay(event, "2026-09-10") && !event.isExam).length, 1);
  } finally { globalThis.fetch = originalFetch; }
  console.log("OK : cours conserve, examen au bon jour (y compris sans cours ou cours hors mois), Plus tard/vide/null exclus, candidat 2, plusieurs dossiers au meme examen. Lecture GET simulee uniquement.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
