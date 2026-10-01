import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GUIDE_COOKIE, createGuideToken, verifyGuideToken, guideCookieOptions,
} from "./guideBaleinesSession";
import { GUIDE_FIELDS, guideReadClient, projectGuideParticipant, projectGuideReservation, readGuideReservations } from "./guideBaleinesServer";
import { guideAgeLabel, guideEquipmentLabel, groupGuideDepartures } from "./guideBaleines";
import { getTahitiToday } from "./tahiti-date";
import { GET as guideGet } from "../app/api/planning-guide-baleines/route";
import { GET as sessionGet, POST as login, DELETE as logout } from "../app/api/planning-guide-baleines/session/route";

let passed = 0;
async function check(name: string, work: () => void | Promise<void>) {
  await work(); passed++; console.log("PASS " + name);
}
function splitTerms(value: string) {
  let depth = 0, from = 0;
  const result: string[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")") depth--;
    if (value[i] === "," && depth === 0) { result.push(value.slice(from, i)); from = i + 1; }
  }
  result.push(value.slice(from));
  return result;
}
// Small independent PostgREST predicate evaluator for synthetic fixture rows.
function matches(row: Record<string, unknown>, term: string): boolean {
  const dot = term.indexOf(".");
  const value = row[term.slice(0, dot)], filter = term.slice(dot + 1);
  if (filter === "is.null") return value === null || value === undefined;
  if (filter.startsWith("eq.")) return String(value) === filter.slice(3);
  if (filter.startsWith("in.(")) return splitTerms(filter.slice(4, -1)).includes(String(value));
  if (filter.startsWith("not.in.(")) return value != null && !splitTerms(filter.slice(8, -1)).includes(String(value));
  throw new Error("Unexpected test filter: " + term);
}
async function main() {
  Object.assign(process.env, {
    GUIDE_BALEINES_PASSWORD: "guide-test-password", GUIDE_BALEINES_SESSION_SECRET: "guide-test-secret-at-least-32-characters",
    EMPLOYEE_PLANNING_PASSWORD: "employee-test-password", EMPLOYEE_PLANNING_SESSION_SECRET: "employee-test-secret-at-least-32-characters",
    ADMIN_SESSION_SECRET: "admin-test-secret-at-least-32-characters",
    NEXT_PUBLIC_SUPABASE_URL: "https://guide-backend.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon",
    SUPABASE_SERVICE_ROLE_KEY: "test-service",
  });
  const { createEmployeeToken, EMPLOYEE_COOKIE, verifyEmployeeToken } = await import("./employeePlanningSession");
  const { createAdminSessionToken, ADMIN_SESSION_COOKIE, verifyAdminSession } = await import("./adminSession");
  const { GET: employeeGet } = await import("../app/api/planning-equipe/[activite]/route");
  const { GET: adminGet } = await import("../app/api/admin/permis/route");
  const { GET: adminBoatGet } = await import("../app/api/admin/bateau/reservation/route");
  const today = getTahitiToday(), month = today.slice(0, 7);
  const request = (path: string, options: { cookie?: string; body?: object; method?: string; origin?: string; ip?: string } = {}) =>
    new Request("https://guide.invalid" + path, {
      method: options.method || (options.body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", origin: options.origin || "https://guide.invalid",
        cookie: options.cookie || "", "x-forwarded-for": options.ip || "192.0.2.1" },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
  const token = createGuideToken(), cookie = GUIDE_COOKIE + "=" + token;
  const planning = (session = cookie, suffix = "?month=" + month) => guideGet(request("/api/planning-guide-baleines" + suffix, { cookie: session }));
  const originalFetch = globalThis.fetch;
  const calls: URL[] = [];
  let failed = false, paginate = false;
  const swimmer = { prenom: "Alice", nom: "Local", role: "mise_eau", age: "32", type: "mise_eau",
    materielPerso: null, tailleCombinaison: "M", pointurePalmes: "40",
    commentaire: "PRIVATE_COMMENT", origine: "PRIVATE_ORIGIN", reservation_manuelle: true,
    prix: 12345, carnet: "PRIVATE_CARNET", arbitrary: { secret: "PRIVATE_NESTED" } };
  const base = { date_sortie: today, depart: "07:00", nombre_mise_eau: 1, nombre_observateurs: 0,
    responsable_prenom: "Alice", responsable_nom: "Local", responsable_telephone: "+689 87 00 00 00",
    participants: [swimmer], montant_total: 999999, facture_url: "PRIVATE_INVOICE",
    transaction_id: "PRIVATE_TRANSACTION", email: "PRIVATE_EMAIL", capacity_hold_expires_at: "2999-01-01",
    source_paiement: "payzen_baleines", paye: false, statut_paiement: "pending", id: "PRIVATE_ID" };
  const fixtures: Record<string, unknown>[] = [
    { ...base, responsable_nom: "Manual", source_paiement: "paiement_externe_a_facturer" },
    { ...base, responsable_nom: "Paid", statut_paiement: "paid" },
    { ...base, responsable_nom: "Paye", statut_paiement: "paye" },
    { ...base, responsable_nom: "Deposit", statut_paiement: "deposit_paid" },
    { ...base, responsable_nom: "Flag", paye: true },
    { ...base, responsable_nom: "ManualNull", source_paiement: "paiement_externe_a_facturer", statut_paiement: null },
    { ...base, responsable_nom: "HoldPublic" },
    { ...base, responsable_nom: "ExpiredPublic", capacity_hold_expires_at: "2000-01-01" },
    ...["cancelled","canceled","failed","refused","abandoned","unpaid"].map(status =>
      ({ ...base, responsable_nom: "Excluded" + status, statut_paiement: status, paye: true, source_paiement: "paiement_externe_a_facturer" })),
    { ...base, responsable_nom: "Past", date_sortie: "2000-01-01", paye: true },
  ];
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    assert.equal(url.origin, "https://guide-backend.invalid", "No real network");
    assert.equal(url.pathname, "/rest/v1/reservations_baleines");
    assert.equal(init?.method || "GET", "GET", "No database writes");
    assert.equal(init?.cache, "no-store");
    assert.equal(url.searchParams.get("select"), GUIDE_FIELDS.join(","));
    assert.equal(new Headers(init?.headers).get("apikey"), "test-service");
    const predicates = url.searchParams.getAll("or");
    assert.equal(predicates.length, 2, "Both status exclusions and operational inclusion must remain");
    const dateFilters = url.searchParams.getAll("date_sortie");
    assert.equal(dateFilters.length, 2);
    const from = dateFilters.find(value => value.startsWith("gte."))!.slice(4);
    const to = dateFilters.find(value => value.startsWith("lte."))!.slice(4);
    calls.push(url);
    if (failed) return new Response(JSON.stringify({ code: "XX000", message: "PRIVATE_DATABASE_ERROR" }), { status: 400 });
    const rows = (paginate ? Array.from({ length: 501 }, () => fixtures[0]) : fixtures)
      .filter(row => String(row.date_sortie) >= from && String(row.date_sortie) <= to)
      .filter(row => predicates.every(expression => splitTerms(expression.slice(1, -1)).some(term => matches(row, term))));
    const offset = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || 500);
    // Deliberately return extra keys too: response projection must still remove them.
    return new Response(JSON.stringify(rows.slice(offset, offset + limit)), { headers: { "Content-Type": "application/json" } });
  };
  try {
    await check("no Guide session => 401; no database request", async () => {
      assert.equal((await planning("")).status, 401);
      assert.equal((await planning(cookie + "x")).status, 401);
      assert.equal(calls.length, 0);
    });
    await check("wrong password rejected; cross-origin login rejected", async () => {
      assert.equal((await login(request("/api/planning-guide-baleines/session", { body: { password: "wrong" } }))).status, 401);
      assert.equal((await login(request("/api/planning-guide-baleines/session", { body: { password: "guide-test-password" }, origin: "https://other.invalid" }))).status, 403);
    });
    await check("correct login grants Guide only; signed 8h private cookie", async () => {
      const result = await login(request("/api/planning-guide-baleines/session", { body: { password: "guide-test-password" } }));
      assert.equal(result.status, 200);
      const header = result.headers.get("set-cookie")!;
      assert.match(header, /^tahiti_trip_guide_baleines=/); assert.match(header, /HttpOnly/i);
      assert.match(header, /SameSite=lax/i); assert.match(header, /Max-Age=28800/i);
      assert.equal((await sessionGet(request("/api/planning-guide-baleines/session", { cookie: header.split(";")[0] }))).status, 200);
      const env = process.env.NODE_ENV;
      Reflect.set(process.env, "NODE_ENV", "production"); assert.equal(guideCookieOptions().secure, true);
      if (env === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", env);
    });
    await check("Guide rejected by employee/admin APIs, including renamed cookies", async () => {
      for (const otherCookie of [cookie, EMPLOYEE_COOKIE + "=" + token, ADMIN_SESSION_COOKIE + "=" + token]) {
        assert.equal((await employeeGet(request("/api/planning-equipe/baleines?month=" + month, { cookie: otherCookie }),
          { params: Promise.resolve({ activite: "baleines" }) })).status, 401);
        assert.equal((await adminGet(request("/api/admin/permis", { cookie: otherCookie }))).status, 401);
        assert.equal((await adminBoatGet(request("/api/admin/bateau/reservation", { cookie: otherCookie }))).status, 401);
      }
    });
    await check("employee/admin tokens rejected by Guide, including renamed cookies", async () => {
      const employee = createEmployeeToken(), admin = createAdminSessionToken();
      for (const otherCookie of [EMPLOYEE_COOKIE + "=" + employee, ADMIN_SESSION_COOKIE + "=" + admin,
        GUIDE_COOKIE + "=" + employee, GUIDE_COOKIE + "=" + admin]) assert.equal((await planning(otherCookie)).status, 401);
    });
    await check("scopes remain isolated even if secrets/passwords accidentally match", () => {
      const saved = { employeeSecret: process.env.EMPLOYEE_PLANNING_SESSION_SECRET, employeePassword: process.env.EMPLOYEE_PLANNING_PASSWORD, admin: process.env.ADMIN_SESSION_SECRET };
      process.env.EMPLOYEE_PLANNING_SESSION_SECRET = process.env.GUIDE_BALEINES_SESSION_SECRET;
      process.env.EMPLOYEE_PLANNING_PASSWORD = process.env.GUIDE_BALEINES_PASSWORD;
      process.env.ADMIN_SESSION_SECRET = process.env.GUIDE_BALEINES_SESSION_SECRET;
      assert.equal(verifyEmployeeToken(token), false);
      assert.equal(verifyAdminSession(request("/api/admin/permis", { cookie: ADMIN_SESSION_COOKIE + "=" + token })), false);
      assert.equal(verifyGuideToken(createEmployeeToken()), false);
      assert.equal(verifyGuideToken(createAdminSessionToken()), false);
      process.env.EMPLOYEE_PLANNING_SESSION_SECRET = saved.employeeSecret;
      process.env.EMPLOYEE_PLANNING_PASSWORD = saved.employeePassword;
      process.env.ADMIN_SESSION_SECRET = saved.admin;
    });
    await check("expired, future, altered tokens rejected; password rotation invalidates sessions", () => {
      assert.equal(verifyGuideToken(createGuideToken(Date.now() - 9 * 3600_000)), false);
      assert.equal(verifyGuideToken(createGuideToken(Date.now() + 3600_000)), false);
      assert.equal(verifyGuideToken(token + "x"), false);
      process.env.GUIDE_BALEINES_PASSWORD = "changed";
      assert.equal(verifyGuideToken(token), false);
      process.env.GUIDE_BALEINES_PASSWORD = "guide-test-password";
    });
    await check("only operational Baleines; public holds, cancelled, failed and past excluded", async () => {
      const result = await planning();
      assert.equal(result.status, 200);
      assert.match(result.headers.get("cache-control")!, /private, no-store/);
      assert.equal(result.headers.get("vary"), "Cookie");
      const payload = await result.json();
      assert.deepEqual(payload.reservations.map((row: { responsable_nom: string }) => row.responsable_nom),
        ["Manual","Paid","Paye","Deposit","Flag","ManualNull"]);
      assert.equal(calls.at(-1)?.searchParams.get("order"), "date_sortie.asc,depart.asc,id.asc");
    });
    await check("no financial, internal, raw-participant or technical field in output", async () => {
      const payload = await (await planning()).json();
      assert.deepEqual(Object.keys(payload), ["reservations"]);
      for (const row of payload.reservations) {
        assert.deepEqual(Object.keys(row).sort(), [...GUIDE_FIELDS].sort());
        for (const participant of row.participants) {
          assert.deepEqual(Object.keys(participant).sort(),
            ["prenom","nom","role","age","type","tailleCombinaison","pointurePalmes","materielPerso"].sort());
        }
      }
      assert.doesNotMatch(JSON.stringify(payload), /PRIVATE_|montant|paiement|payzen|facture|carnet|commentaire|metadata|origine|capacity_hold|transaction/i);
    });
    await check("nullable equipment remains unknown; valid age including infant 0", () => {
      assert.equal(projectGuideParticipant(swimmer).materielPerso, null);
      assert.equal(guideEquipmentLabel(projectGuideParticipant({}).materielPerso), "Non renseigné");
      assert.equal(guideEquipmentLabel(true), "Oui"); assert.equal(guideEquipmentLabel(false), "Non");
      for (const age of ["", " ", null, -1, 121, "abc", 1.5]) assert.equal(projectGuideParticipant({ age }).age, null);
      assert.equal(projectGuideParticipant({ age: "0" }).age, 0);
      assert.match(guideAgeLabel(0), /moins de 5/);
      assert.equal(projectGuideParticipant({ type: "PRIVATE_BAD_TYPE" }).type, null);
    });
    await check("bounded month validation; no activity/table/fields override", async () => {
      for (const suffix of ["", "?month=2026-13", "?month=2026-09&month=2026-10", "?month=" + month + "&activity=peche",
        "?month=" + month + "&select=*", "?month=" + month + "&table=reservations"]) {
        assert.equal((await planning(cookie, suffix)).status, 400);
      }
      const before = calls.length;
      assert.deepEqual(await readGuideReservations("2000-01"), []); assert.equal(calls.length, before);
    });
    await check("pagination reads all operational reservations", async () => {
      paginate = true;
      assert.equal((await readGuideReservations(month)).length, 501);
      paginate = false;
    });
    await check("read transport blocks writes, other tables, RPC and wildcard reads", async () => {
      const before = calls.length, db = guideReadClient();
      for (const result of [
        await db.from("reservations_baleines").insert({}),
        await db.from("reservations_baleines").update({}).eq("id", "test"),
        await db.from("reservations_baleines").delete().eq("id", "test"),
        await db.from("reservations_peche").select(GUIDE_FIELDS.join(",")),
        await db.from("reservations_baleines").select("*"),
        await db.rpc("anything"),
      ]) assert.ok(result.error);
      assert.equal(calls.length, before);
      const business = await import("../app/api/planning-guide-baleines/route");
      assert.deepEqual(Object.keys(business).sort(), ["GET","dynamic","runtime"]);
    });
    await check("errors do not disclose backend details", async () => {
      failed = true;
      const result = await planning(); assert.equal(result.status, 503);
      assert.doesNotMatch(await result.text(), /PRIVATE_|XX000/);
      failed = false;
    });
    await check("render: swimmer equipment visible, observer equipment absent", async () => {
      const require = createRequire(import.meta.url);
      const original = require.extensions[".css"];
      require.extensions[".css"] = module => { module.exports = { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) }; };
      try {
        const { GuideParticipantCard } = await import("../app/planning-guide-baleines/GuideDepartureDetail");
        const water = renderToStaticMarkup(createElement(GuideParticipantCard, { participant: projectGuideParticipant(swimmer) }));
        assert.match(water, /Combinaison/); assert.match(water, /Palmes/);
        assert.match(water, /Matériel personnel<\/dt><dd[^>]*>Non renseigné/);
        assert.match(water, />M</); assert.match(water, />40</);
        const observer = renderToStaticMarkup(createElement(GuideParticipantCard, { participant: projectGuideParticipant({ ...swimmer, role: "observateur", type: "observateur", age: "9" }) }));
        assert.doesNotMatch(observer, /Combinaison|Palmes|Matériel personnel/); assert.match(observer, /5–11 ans/);
      } finally { if (original) require.extensions[".css"] = original; else delete require.extensions[".css"]; }
    });
    await check("same departure grouped, separate responsible contacts retained", () => {
      const groups = groupGuideDepartures([projectGuideReservation(base), projectGuideReservation({ ...base, responsable_nom: "Other" })]);
      assert.equal(groups.length, 1); assert.equal(groups[0].nageurs, 2);
      assert.equal(groups[0].reservations.length, 2);
    });
    await check("logout clears only Guide cookie; wrong-origin logout rejected", async () => {
      const result = await logout(request("/api/planning-guide-baleines/session", { cookie, method: "DELETE" }));
      assert.match(result.headers.get("set-cookie")!, /^tahiti_trip_guide_baleines=.*Max-Age=0/i);
      assert.equal((await logout(request("/api/planning-guide-baleines/session", { cookie, method: "DELETE", origin: "https://other.invalid" }))).status, 403);
    });
    await check("password attempt limit and missing-secret fail closed", async () => {
      for (let i = 0; i < 10; i++) assert.equal((await login(request("/api/planning-guide-baleines/session", { body: { password: "wrong" }, ip: "192.0.2.55" }))).status, 401);
      assert.equal((await login(request("/api/planning-guide-baleines/session", { body: { password: "wrong" }, ip: "192.0.2.55" }))).status, 429);
      const secret = process.env.GUIDE_BALEINES_SESSION_SECRET;
      delete process.env.GUIDE_BALEINES_SESSION_SECRET;
      assert.equal((await planning()).status, 503); assert.equal(verifyGuideToken(token), false);
      process.env.GUIDE_BALEINES_SESSION_SECRET = secret;
    });
  } finally { globalThis.fetch = originalFetch; }
  console.log("RESULT: " + passed + " targeted Guide checks passed; synthetic data only; no real database/network.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
