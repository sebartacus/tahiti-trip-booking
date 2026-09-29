import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EMPLOYEE_COOKIE, createEmployeeToken, verifyEmployeeToken, employeeCookieOptions } from "./employeePlanningSession";
import { EMPLOYEE_FIELDS, employeeReadClient, projectEmployeeRow } from "./employeePlanningServer";
import { EMPLOYEE_ACTIVITIES, eventOnDay, monthBounds, planningEvent } from "./employeePlanning";
import { GET as activityGet } from "../app/api/planning-equipe/[activite]/route";
import { GET as sessionGet, POST as login, DELETE as logout } from "../app/api/planning-equipe/session/route";

async function main() {
  Object.assign(process.env, {
    EMPLOYEE_PLANNING_PASSWORD: "employee-test-password", EMPLOYEE_PLANNING_SESSION_SECRET: "employee-test-secret-at-least-32-characters",
    ADMIN_SESSION_SECRET: "admin-test-secret-at-least-32-characters",
    NEXT_PUBLIC_SUPABASE_URL: "https://planning-backend.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon",
    SUPABASE_SERVICE_ROLE_KEY: "test-service",
  });
  const { verifyAdminSession, createAdminSessionToken, ADMIN_SESSION_COOKIE } = await import("./adminSession");
  const { GET: adminGet } = await import("../app/api/admin/permis/route");
  const { GET: adminReservation } = await import("../app/api/admin/bateau/reservation/route");
  const { POST: adminBlock } = await import("../app/api/admin/bateau/block/route");
  const request = (path: string, options: { token?: string; body?: object; method?: string; origin?: string; cookie?: string; ip?: string } = {}) =>
    new Request("https://planning.invalid" + path, { method: options.method || (options.body ? "POST" : "GET"),
      headers: { origin: options.origin || "https://planning.invalid", cookie: options.cookie ?? (options.token ? EMPLOYEE_COOKIE + "=" + options.token : ""),
        "Content-Type": "application/json", "x-forwarded-for": options.ip || "192.0.2.1" },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
  const get = (activity: string, token?: string, suffix = "?month=2026-09") =>
    activityGet(request("/api/planning-equipe/" + activity + suffix, { token }), { params: Promise.resolve({ activite: activity }) });
  const token = createEmployeeToken();
  assert.ok(verifyEmployeeToken(token));
  assert.ok(!verifyEmployeeToken(token + "x"));
  assert.ok(!verifyEmployeeToken(createEmployeeToken(Date.now() - 9 * 3600_000)));
  assert.ok(!verifyEmployeeToken(createEmployeeToken(Date.now() + 3600_000)));
  assert.equal((await sessionGet(request("/api/planning-equipe/session"))).status, 401);
  for (const activity of EMPLOYEE_ACTIVITIES) {
    assert.equal((await get(activity)).status, 401);
    assert.equal((await get(activity, token + "x")).status, 401);
  }
  assert.equal((await login(request("/api/planning-equipe/session", { body: { password: "wrong" } }))).status, 401);
  assert.equal((await login(request("/api/planning-equipe/session", { body: { password: "employee-test-password" }, origin: "https://other.invalid" }))).status, 403);
  const response = await login(request("/api/planning-equipe/session", { body: { password: "employee-test-password" } }));
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=lax/i); assert.match(cookie, /Max-Age=28800/i);
  assert.equal((await sessionGet(request("/api/planning-equipe/session", { cookie: cookie.split(";")[0] }))).status, 200);
  assert.equal(verifyAdminSession(request("/api/admin/permis", { token })), false);
  assert.equal((await adminGet(request("/api/admin/permis", { token }))).status, 401);
  assert.equal((await adminReservation(request("/api/admin/bateau/reservation", { token }))).status, 401);
  assert.equal((await adminBlock(request("/api/admin/bateau/block", { token, body: { date: "2026-09-16", slot: "morning" } }))).status, 401);
  const environment = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", "production");
  assert.equal(employeeCookieOptions().secure, true);
  if (environment === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", environment);
  const proxied = new Request("http://localhost:3100/api/planning-equipe/session", { method: "POST",
    headers: { host: "planning.invalid", origin: "https://planning.invalid", "x-forwarded-proto": "https", "Content-Type": "application/json" },
    body: JSON.stringify({ password: "employee-test-password" }) });
  assert.equal((await login(proxied)).status, 200);
  // Even renaming the employee cookie cannot turn its payload into an admin session.
  const adminSecret = process.env.ADMIN_SESSION_SECRET;
  process.env.ADMIN_SESSION_SECRET = process.env.EMPLOYEE_PLANNING_SESSION_SECRET;
  assert.equal(verifyAdminSession(request("/api/admin/permis", { cookie: ADMIN_SESSION_COOKIE + "=" + token })), false);
  process.env.ADMIN_SESSION_SECRET = adminSecret;
  assert.equal((await activityGet(request("/api/planning-equipe/permis?month=2026-09", { cookie: ADMIN_SESSION_COOKIE + "=" + createAdminSessionToken() }), { params: Promise.resolve({ activite: "permis" }) })).status, 401);
  assert.equal((await logout(request("/api/planning-equipe/session", { method: "DELETE", token }))).headers.get("set-cookie")?.includes("Max-Age=0"), true);
  assert.equal((await logout(request("/api/planning-equipe/session", { method: "DELETE", token, origin: "https://other.invalid" }))).status, 403);
  for (let i = 0; i < 10; i++) assert.equal((await login(request("/api/planning-equipe/session", { body: { password: "wrong" }, ip: "192.0.2.20" }))).status, 401);
  assert.equal((await login(request("/api/planning-equipe/session", { body: { password: "wrong" }, ip: "192.0.2.20" }))).status, 429);
  const secret = process.env.EMPLOYEE_PLANNING_SESSION_SECRET;
  delete process.env.EMPLOYEE_PLANNING_SESSION_SECRET;
  assert.equal((await get("permis", token)).status, 503);
  assert.equal((await login(request("/api/planning-equipe/session", { body: { password: "employee-test-password" } }))).status, 503);
  process.env.EMPLOYEE_PLANNING_SESSION_SECRET = secret;
  process.env.EMPLOYEE_PLANNING_PASSWORD = "changed";
  assert.equal(verifyEmployeeToken(token), false);
  process.env.EMPLOYEE_PLANNING_PASSWORD = "employee-test-password";

  const originalFetch = globalThis.fetch;
  const calls: URL[] = [];
  let failed = false, pagination = false;
  const forbidden = { montant_total: 999999, montant_paye: 888888, facture_url: "SECRET_INVOICE", paiement_effectue: true,
    statut_paiement: "SECRET_PAYMENT", transaction_id: "SECRET_TRANSACTION", certificat_url: "SECRET_DOCUMENT", participants: [{ amount: 99 }], archived: false };
  const row = { date_cours: "16 septembre 2026", creneau: "07h00 - 09h00", prenom: "Alice", nom: "Test", prenom2: "Bob", nom2: "Test",
    telephone: "+689 87 00 00 00", examen: "23/09/2026", date_sortie: "2026-09-16", depart: "07:00", nombre_mise_eau: 3,
    nombre_observateurs: 1, responsable_prenom: "Alice", responsable_nom: "Test", responsable_telephone: "+68987000000",
    date: "2026-09-16", slot: "afternoon", formule: "tetiaroa_2j_1n", nombre_personnes: 4, date_debut: "2026-08-31", date_fin: "2026-09-01", responsable_tel: "+68987000000", ...forbidden };
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    assert.equal(url.hostname, "planning-backend.invalid", "No real network");
    assert.equal((init?.method || "GET").toUpperCase(), "GET", "No database mutations");
    assert.equal(new Headers(init?.headers).get("apikey"), "test-service");
    const selected = url.searchParams.get("select")!;
    assert.ok(selected && !selected.includes("*"));
    calls.push(url);
    if (failed) return new Response(JSON.stringify({ message: "SECRET_DATABASE_DETAIL", code: "XX000" }), { status: 400 });
    const data = pagination
      ? Number(url.searchParams.get("offset") || 0) === 0 ? Array.from({ length: 500 }, () => row) : [row]
      : url.pathname.endsWith("/reservations") ? [row, { ...row, date_cours: "invalid" }, { ...row, date_cours: "2026-08-01" }] : [row];
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  };
  try {
    for (const activity of EMPLOYEE_ACTIVITIES) {
      const result = await get(activity, token);
      assert.equal(result.status, 200);
      assert.match(result.headers.get("cache-control") || "", /no-store/);
      const body = await result.json();
      assert.equal(body.reservations.length, activity === "permis" ? 3 : 1);
      assert.deepEqual(Object.keys(body.reservations[0]).sort(), [...EMPLOYEE_FIELDS[activity]].sort());
      assert.deepEqual(body.reservations[0], projectEmployeeRow(activity, activity === "peche-nuit" ? { date_sortie: row.date, creneau: "Créneau bateau après-midi" } : row));
      assert.equal(JSON.stringify(body).includes("SECRET"), false);
      assert.equal(calls.at(-1)!.searchParams.get("select"), activity === "peche-nuit" ? "date,slot" : EMPLOYEE_FIELDS[activity].join(","));
      if (activity === "permis") assert.equal(calls.at(-1)!.searchParams.get("or"), "(archived.is.null,archived.eq.false)");
      else if (activity === "peche-nuit") {
        assert.equal(calls.at(-1)!.pathname, "/rest/v1/boat_calendar_slots");
        assert.equal(calls.at(-1)!.searchParams.get("status"), "eq.reserved");
        assert.equal(calls.at(-1)!.searchParams.get("activity"), "eq.peche_nuit");
      } else {
        assert.equal(calls.at(-1)!.searchParams.get("statut_paiement"), "not.in.(cancelled,failed)");
        assert.match(calls.at(-1)!.searchParams.get("or") || "", /paid,paye,deposit_paid/);
      }
      if (activity === "charter") {
        assert.equal(calls.at(-1)!.searchParams.get("date_debut"), "lte.2026-09-30");
        assert.equal(calls.at(-1)!.searchParams.get("date_fin"), "gte.2026-09-01");
      }
    }
    pagination = true;
    assert.equal((await (await get("permis", token)).json()).reservations.length, 501);
    pagination = false;
    const previousCalls = calls.length;
    for (const query of ["?month=2026-13", "?month=invalid", "?month=2026-09&table=reservations", "?month=2026-09&month=2026-10", ""]) {
      assert.equal((await get("permis", token, query)).status, 400);
    }
    assert.equal((await get("unknown", token)).status, 404);
    assert.equal(calls.length, previousCalls);
    // Supabase converts a blocked fetch into an error response; no fetch is made.
    const blocked = await employeeReadClient().from("reservations").insert({ prenom: "must never write" });
    assert.ok(blocked.error);
    assert.equal(calls.length, previousCalls);
    failed = true;
    const failure = await get("permis", token);
    assert.equal(failure.status, 503);
    assert.equal((await failure.text()).includes("SECRET"), false);
  } finally { globalThis.fetch = originalFetch; }

  assert.deepEqual(monthBounds("2028-02"), { from: "2028-02-01", to: "2028-02-29" });
  const course = planningEvent("permis", projectEmployeeRow("permis", row))!;
  assert.equal(course.people, 2); assert.equal(course.exam, "2026-09-23");
  assert.equal(planningEvent("baleines", projectEmployeeRow("baleines", row))?.people, 4);
  assert.equal(eventOnDay(planningEvent("charter", projectEmployeeRow("charter", row))!, "2026-09-01"), true);
  assert.equal(eventOnDay(planningEvent("charter", projectEmployeeRow("charter", row))!, "2026-09-02"), false);
  assert.equal(projectEmployeeRow("permis", { ...row, telephone: { secret: "private" } }).telephone, null);
  const files = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
  for (const file of files("src/app/api/planning-equipe")) {
    const source = readFileSync(file, "utf8");
    if (file.includes("session")) assert.doesNotMatch(source, /supabase|\.from\s*\(/);
    else assert.doesNotMatch(source, /\.(insert|update|delete|upsert|rpc)\s*\(/);
    if (!file.includes("session")) assert.doesNotMatch(source, /export (?:async )?function (POST|PUT|PATCH|DELETE)/);
  }
  const ui = readFileSync("src/app/planning-equipe/PlanningEquipe.tsx", "utf8");
  assert.doesNotMatch(ui, /\/api\/admin|\/api\/bateau|supabase|charter-pricing|peche\/constants/);
  console.log("Planning équipe : sessions isolées, refus, cookies, allowlists des 5 activités, pagination, dates, erreurs, lecture seule : OK.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
