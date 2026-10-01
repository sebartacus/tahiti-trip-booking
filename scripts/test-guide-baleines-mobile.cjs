// Local-only mobile integration check. Starts Next + a synthetic GET-only backend.
// No .env credentials used for data access; no real Supabase or payment request.
const fs = require("node:fs"), path = require("node:path"), http = require("node:http");
const { spawn, spawnSync } = require("node:child_process");
const assert = require("node:assert/strict");
function playwright() {
  try { return require("playwright"); } catch {}
  const cache = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
  for (const entry of fs.existsSync(cache) ? fs.readdirSync(cache) : []) {
    const modulePath = path.join(cache, entry, "node_modules", "playwright");
    if (fs.existsSync(path.join(modulePath, "package.json"))) return require(modulePath);
  }
  throw new Error("Playwright must be installed or present in the local npm cache.");
}
function splitTerms(value) {
  let depth = 0, start = 0;
  const terms = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")") depth--;
    if (value[i] === "," && depth === 0) { terms.push(value.slice(start, i)); start = i + 1; }
  }
  terms.push(value.slice(start)); return terms;
}
function matches(row, term) {
  const dot = term.indexOf("."), value = row[term.slice(0, dot)], filter = term.slice(dot + 1);
  if (filter === "is.null") return value == null;
  if (filter.startsWith("eq.")) return String(value) === filter.slice(3);
  if (filter.startsWith("in.(")) return splitTerms(filter.slice(4, -1)).includes(String(value));
  if (filter.startsWith("not.in.(")) return value != null && !splitTerms(filter.slice(8, -1)).includes(String(value));
  throw new Error("Unexpected filter: " + term);
}
const fields = ["date_sortie","depart","nombre_mise_eau","nombre_observateurs","responsable_prenom","responsable_nom","responsable_telephone","participants"];
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Tahiti", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const base = { date_sortie: today, depart: "07:00", nombre_mise_eau: 2, nombre_observateurs: 1,
  responsable_prenom: "Moana", responsable_nom: "Démonstration", responsable_telephone: "+689 87 00 00 00",
  source_paiement: "paiement_externe_a_facturer", statut_paiement: "pending", paye: false,
  participants: [
    { prenom: "Alice", nom: "Exemple", age: "32", role: "mise_eau", type: "mise_eau", materielPerso: false, tailleCombinaison: "M", pointurePalmes: "40", commentaire: "PRIVATE_COMMENT", montant: 123 },
    { prenom: "Mereana", nom: "Exemple", role: "mise_eau", materielPerso: null, origine: "PRIVATE_ORIGIN" },
    { prenom: "Noa", nom: "Exemple", role: "observateur", age: "9", type: "enfant_moins_12", tailleCombinaison: "XL", pointurePalmes: "49", materielPerso: true },
  ],
  montant_total: 123456, facture_url: "PRIVATE_INVOICE", id: "PRIVATE_ID", carnet: "PRIVATE_CARNET",
};
const rows = [
  base,
  { ...base, responsable_prenom: "Teva", responsable_nom: "Groupe Démonstration", nombre_mise_eau: 1, nombre_observateurs: 0,
    source_paiement: "payzen_baleines", statut_paiement: "paid", paye: true,
    participants: [{ prenom: "Théo", nom: "Exemple", age: "41", role: "mise_eau", materielPerso: true }] },
  { ...base, depart: "13:15", nombre_mise_eau: 1, nombre_observateurs: 0, participants: [base.participants[0]], statut_paiement: "paid" },
  { ...base, responsable_nom: "PENDING_PRIVATE", source_paiement: "payzen_baleines" },
  { ...base, responsable_nom: "CANCELLED_PRIVATE", statut_paiement: "cancelled", paye: true },
];
const backendCalls = [], violations = [];
const artifacts = path.resolve("node_modules/.cache/guide-baleines-tests");
fs.mkdirSync(artifacts, { recursive: true });
let next, browser, backend;
const log = fs.openSync(path.join(artifacts, "next.log"), "w");
const listen = server => new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
(async () => {
  backend = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      assert.equal(req.method, "GET");
      assert.equal(url.pathname, "/rest/v1/reservations_baleines");
      assert.equal(url.searchParams.get("select"), fields.join(","));
      assert.equal(url.searchParams.getAll("or").length, 2);
      backendCalls.push(req.url);
      const dates = url.searchParams.getAll("date_sortie");
      const from = dates.find(x => x.startsWith("gte.")).slice(4), to = dates.find(x => x.startsWith("lte.")).slice(4);
      const filtered = rows.filter(row => row.date_sortie >= from && row.date_sortie <= to &&
        url.searchParams.getAll("or").every(expression => splitTerms(expression.slice(1, -1)).some(term => matches(row, term))));
      res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(filtered));
    } catch (error) { violations.push(error.message); res.writeHead(500); res.end("{}"); }
  });
  const backendPort = await listen(backend);
  const probe = http.createServer(); const port = await listen(probe);
  await new Promise(resolve => probe.close(resolve));
  const origin = "http://127.0.0.1:" + port;
  next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    { windowsHide: true, stdio: ["ignore", log, log], env: {
      ...process.env, NEXT_TELEMETRY_DISABLED: "1",
      GUIDE_BALEINES_PASSWORD: "guide-mobile-test-password", GUIDE_BALEINES_SESSION_SECRET: "guide-mobile-secret-at-least-32-characters",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:" + backendPort,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon", SUPABASE_SERVICE_ROLE_KEY: "local-service",
      EMPLOYEE_PLANNING_PASSWORD: "local-employee-password", EMPLOYEE_PLANNING_SESSION_SECRET: "local-employee-secret-at-least-32-characters",
      ADMIN_SESSION_SECRET: "local-admin-secret-at-least-32-characters",
    } });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (next.exitCode !== null) throw new Error("Next exited; inspect " + path.join(artifacts, "next.log"));
    try {
      const response = await fetch(origin + "/api/planning-guide-baleines/session", { signal: AbortSignal.timeout(2500) });
      if (response.status === 401) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Local Guide server ready");
  assert.equal((await fetch(origin + "/api/planning-guide-baleines?month=" + today.slice(0,7))).status, 401);
  assert.equal(backendCalls.length, 0);
  for (const method of ["POST","PATCH","DELETE"]) {
    assert.equal((await fetch(origin + "/api/planning-guide-baleines", { method })).status, 405);
  }
  browser = await playwright().chromium.launch({ channel: "chrome", headless: true });
  const pageErrors = [];
  for (const width of [320, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage(); page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto(origin + "/planning-guide-baleines", { waitUntil: "networkidle" });
    await page.waitForURL("**/planning-guide-baleines/connexion");
    await page.getByLabel("Mot de passe Guide").fill("wrong");
    await page.getByRole("button", { name: "Ouvrir mon planning" }).click();
    await page.getByRole("alert").filter({ hasText: "Mot de passe incorrect" }).waitFor();
    await page.getByLabel("Mot de passe Guide").fill("guide-mobile-test-password");
    await page.getByRole("button", { name: "Ouvrir mon planning" }).click();
    await page.waitForURL("**/planning-guide-baleines");
    const morning = page.getByRole("button", { name: "Voir le départ de 07:00" });
    await morning.waitFor();
    assert.match(await morning.innerText(), /3\s+nageurs/);
    assert.match(await morning.innerText(), /1\s+observateur/);
    await page.getByRole("button", { name: "Voir le départ de 13:15" }).waitFor();
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert.ok(await fits(), "Calendar fits at " + width);
    await page.screenshot({ path: path.join(artifacts, "guide-" + width + "-calendar.png"), fullPage: true });
    const api = await context.request.get(origin + "/api/planning-guide-baleines?month=" + today.slice(0,7));
    assert.equal(api.status(), 200);
    assert.doesNotMatch(await api.text(), /PRIVATE_|montant|paiement|facture|carnet|commentaire|origine/);
    assert.equal((await context.request.get(origin + "/api/planning-equipe/baleines?month=" + today.slice(0,7))).status(), 401);
    assert.equal((await context.request.get(origin + "/api/admin/permis")).status(), 401);
    await morning.click();
    const detail = page.locator('section[aria-labelledby="guide-detail-title"]');
    await detail.waitFor();
    assert.equal(await detail.locator('[data-participant-role="mise_eau"]').count(), 3);
    const missing = detail.locator('[data-participant-role="mise_eau"]').filter({ hasText: "Mereana" });
    const equipment = missing.locator("dl > div").filter({ hasText: "Matériel personnel" });
    assert.equal((await equipment.locator("dd").innerText()).trim(), "Non renseigné");
    const swimmer = detail.locator('[data-participant-role="mise_eau"]').filter({ hasText: "Alice" });
    assert.match(await swimmer.innerText(), /Combinaison\s+M/);
    assert.match(await swimmer.innerText(), /Palmes\s+40/);
    assert.match(await swimmer.innerText(), /Matériel personnel\s+Non/);
    const observer = detail.locator('[data-participant-role="observateur"]');
    assert.doesNotMatch(await observer.innerText(), /Combinaison|Palmes|Matériel personnel/);
    assert.equal(await detail.locator('a[href="tel:+68987000000"]').count(), 2);
    assert.ok(await fits(), "Detail fits at " + width);
    assert.equal(await page.getByRole("button", { name: /^(modifier|annuler|créer|payer|supprimer)$/i }).count(), 0);
    await detail.screenshot({ path: path.join(artifacts, "guide-" + width + "-detail.png") });
    await page.getByRole("button", { name: "Mois suivant" }).click();
    await page.getByText("Aucune sortie à venir pour cette journée.").waitFor();
    await page.getByRole("button", { name: "Mois précédent" }).click();
    await morning.waitFor();
    await page.getByRole("button", { name: "Déconnexion", exact: true }).click();
    await page.waitForURL("**/planning-guide-baleines/connexion");
    assert.equal((await context.request.get(origin + "/api/planning-guide-baleines?month=" + today.slice(0,7))).status(), 401);
    assert.ok(!(await context.cookies()).some(cookie => cookie.name === "tahiti_trip_guide_baleines"));
    await context.close();
    console.log("PASS mobile " + width + "px: login, calendar, departure details/equipment, contacts, month navigation, isolation, logout; no horizontal overflow.");
  }
  assert.deepEqual(violations, []); assert.deepEqual(pageErrors, []);
  assert.ok(backendCalls.length > 0);
  console.log("PASS GET-only synthetic Baleines backend; business POST/PATCH/DELETE => 405; zero writes, zero external database requests.");
  console.log("Screenshots: " + artifacts);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (next && next.exitCode === null) {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(next.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
    else next.kill("SIGTERM");
  }
  if (backend) await new Promise(resolve => backend.close(resolve));
  fs.closeSync(log);
});
