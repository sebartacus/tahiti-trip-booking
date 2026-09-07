import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { GET as reservation } from "../app/api/permis/reprise/reservation/route";
import { GET as availability } from "../app/api/permis/reprise/disponibilites/route";
import { PATCH as planning } from "../app/api/permis/reprise/planning/route";
import { POST as documents } from "../app/api/permis/reprise/documents/route";
import { DELETE as logout } from "../app/api/permis/reprise/session/route";
import { POST as access } from "../app/api/permis/reprise/access/route";
import { PERMIS_COOKIE, createPermisCookie } from "./permisCandidateAccess";
import { candidateView, type CandidateRow } from "./permisRepriseServer";
import { PERMIS_DOCUMENT_BYTES, validatePermisDocument } from "./permisRepriseDocuments";
import { normalizePermisPlanning } from "./permisScheduling";
import { addPermisDays, permisExamOptions } from "./permisRepriseCalendar";
import { getTahitiToday } from "./tahiti-date";

async function main() {
  Object.assign(process.env, {
    PERMIS_ACCESS_SECRET: "reprise-test-only-secret-0123456789abcdef",
    PERMIS_REPRISE_ORIGIN: "https://reprise.invalid",
    NEXT_PUBLIC_SUPABASE_URL: "https://backend.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    RESEND_API_KEY: "test-resend-key",
    INTERNAL_EMAIL: "internal@example.invalid",
  });
  assert.deepEqual(permisExamOptions("2027-01-01"), ["2027-01-13", "2027-01-20", "2027-01-27", "2027-02-03"], "No new year cutoff compared with legacy");
  assert.equal(permisExamOptions("2026-12-25").length, 4, "Exam choices cross the year boundary");
  const today = getTahitiToday();
  // Fixture deliberately follows the validated 2026 calendar.
  const exam = permisExamOptions(today)[0];
  assert.ok(exam, "Update test calendar when the production calendar is extended");
  let day = addPermisDays(exam, -2);
  if (new Date(day + "T12:00:00Z").getUTCDay() === 3) day = addPermisDays(day, -1);
  const initial: CandidateRow = { id: 52, prenom: "Alice <b>", nom: "Test", prenom2: null, nom2: null, email: "stored@example.invalid", telephone: "private-phone", formule: "Classique", type_cours: null, origine_reservation: "salon", examen: "Plus tard", date_cours: null, creneau: null, statut: "En attente", archived: false, certificat_url: null, formulaire_url: null, photo_url: null, identite_url: null };
  let row = { ...initial }, backendCalls = 0, rpcCalls = 0, emailCalls = 0, uploads = 0, links = 0, removes = 0;
  let rpcMode = "", emailFailure = false, linkFailure = false, archived = false;
  let challengeHash = "", challengeId = "", code = "", consumed = false, issued = false;
  let internalHtml = "", storagePath = "";
  const json = (value: unknown, status = 200, extra = {}) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", ...extra } });
  const cookie = createPermisCookie("52");
  const req = (body?: unknown, options: { token?: string; query?: string; origin?: string; method?: string } = {}) => new Request("https://reprise.invalid/api" + (options.query || ""), {
    method: options.method || (body === undefined ? "GET" : "POST"),
    headers: { cookie: PERMIS_COOKIE + "=" + (options.token ?? cookie), origin: options.origin || "https://reprise.invalid", ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.host === "api.resend.com") {
      const payload = JSON.parse(String(init?.body));
      if (payload.subject.includes("code")) {
        assert.deepEqual(payload.to, ["stored@example.invalid"]);
        code = payload.html.match(/>(\d{6})<\/p>/)[1];
      } else {
        emailCalls++; internalHtml = payload.html;
        assert.deepEqual(payload.to, ["internal@example.invalid"]);
        assert.ok(!payload.html.includes("<b>")); assert.ok(payload.html.includes("&lt;b&gt;"));
      }
      if (emailFailure) throw new Error("Simulated Resend outage");
      return json({});
    }
    assert.equal(url.host, "backend.invalid", "No real network");
    assert.equal(new Headers(init?.headers).get("apikey"), "test-service-key");
    backendCalls++;
    if (url.pathname.endsWith("/rpc/permis_issue_access_challenge")) {
      const body = JSON.parse(String(init?.body));
      issued = body.p_contact === "stored@example.invalid";
      challengeHash = body.p_code_hash; challengeId = body.p_id; consumed = false;
      return json(issued ? "stored@example.invalid" : null);
    }
    if (url.pathname.endsWith("/rpc/permis_consume_access_challenge")) {
      const body = JSON.parse(String(init?.body));
      const ok = issued && !consumed && body.p_id === challengeId && body.p_code_hash === challengeHash;
      if (ok) consumed = true;
      return json(ok ? "52" : null);
    }
    if (url.pathname.endsWith("/rpc/permis_save_planning")) {
      rpcCalls++;
      const body = JSON.parse(String(init?.body)); assert.equal(body.p_reservation_id, "52");
      assert.deepEqual(body.p_expected, normalizePermisPlanning(row));
      if (rpcMode === "blocked") return json({ message: "Blocked exam" }, 400);
      if (rpcMode) return json({ status: rpcMode });
      const before = normalizePermisPlanning(row), after = normalizePermisPlanning({ ...row, ...body.p_patch });
      row = { ...row, ...after };
      return json({ status: "changed", before, after });
    }
    if (url.pathname.includes("/storage/v1/object/documents-permis/")) {
      uploads++; storagePath = decodeURIComponent(url.pathname.split("documents-permis/")[1]);
      assert.match(storagePath, /^candidats\/52\/(certificat|photo)\/[0-9a-f-]+\.(pdf|jpg)$/);
      assert.equal(new Headers(init?.headers).get("x-upsert"), "false");
      return json({ Key: storagePath });
    }
    if (url.pathname === "/storage/v1/object/documents-permis" && init?.method === "DELETE") {
      removes++; assert.deepEqual(JSON.parse(String(init.body)).prefixes, [storagePath]); return json([]);
    }
    if (url.pathname.endsWith("/examens_bloques")) return json([{ date_examen: exam }]);
    if (url.pathname.endsWith("/reservations")) {
      if (init?.method === "PATCH") {
        links++; assert.equal(url.searchParams.get("id"), "eq.52");
        const body = JSON.parse(String(init.body));
        assert.deepEqual(Object.keys(body), ["certificat_url"]); assert.equal(body.certificat_url, storagePath);
        return linkFailure ? json({ message: "fake failure" }, 400) : json({ id: 52 });
      }
      if (url.searchParams.get("select") === "date_cours,creneau") {
        assert.equal(url.searchParams.get("id"), "neq.52");
        return json([{ date_cours: day, creneau: "13h00 - 17h00" }], 200, { "Content-Range": "0-0/1" });
      }
      assert.equal(url.searchParams.get("id"), "eq.52");
      assert.ok(!url.searchParams.get("select")?.includes("*"));
      return json({ ...row, archived });
    }
    throw new Error("Unexpected fake endpoint: " + url.pathname);
  };
  try {
    delete process.env.PERMIS_REPRISE_ACCESS_ENABLED;
    for (const route of [reservation, availability, planning, documents, logout]) assert.equal((await route(req({}))).status, 503);
    assert.equal(backendCalls, 0);
    process.env.PERMIS_REPRISE_ACCESS_ENABLED = "true";
    for (const token of ["", cookie + "x", createPermisCookie("52", Date.now() - 1800001)]) {
      for (const route of [reservation, availability, planning, documents]) assert.equal((await route(req({}, { token }))).status, 401);
    }
    assert.equal(backendCalls, 0);
    for (const route of [reservation, availability, planning, documents]) assert.equal((await route(req({}, { query: "?reservation_id=99" }))).status, 400);
    for (const route of [planning, documents]) assert.equal((await route(req({}, { origin: "https://evil.invalid" }))).status, 403);
    assert.equal(backendCalls, 0);
    const read = await reservation(req()); assert.equal(read.status, 200);
    assert.equal(read.headers.get("cache-control"), "no-store");
    assert.deepEqual(await read.json(), { reservation: candidateView(row) });
    const view = candidateView(row);
    for (const field of ["id", "email", "telephone", "certificat_url", "email_sent"]) assert.ok(!(field in view));
    archived = true; assert.equal((await reservation(req())).status, 401); archived = false;

    // Real route contract including code creation, cookie and one-use consumption.
    const responses = [];
    for (const contact of [{ email: "missing@example.invalid" }, { telephone: "000000999" }, { email: "ambiguous@example.invalid" }, { email: "stored@example.invalid" }]) {
      const response = await access(req({ action: "request", ...contact }));
      assert.equal(response.status, 200); assert.equal(response.headers.get("set-cookie"), null);
      responses.push(await response.json());
    }
    for (const response of responses) {
      assert.deepEqual(Object.keys(response).sort(), ["challengeId", "message"]);
      assert.equal(response.message, responses[0].message);
    }
    const verify = (value: string) => access(req({ action: "verify", challengeId, code: value }));
    assert.equal((await verify(code === "000000" ? "111111" : "000000")).status, 400);
    const verified = await verify(code);
    assert.equal(verified.status, 200);
    assert.match(verified.headers.get("set-cookie")!, /HttpOnly/);
    assert.match(verified.headers.get("set-cookie")!, /SameSite=lax/i);
    assert.match(verified.headers.get("set-cookie")!, /Path=\/api\/permis\/reprise/);
    assert.equal((await verify(code)).status, 400);
    const available = await availability(req(undefined, { query: "?date=" + day }));
    assert.equal(available.status, 200);
    const options = await available.json();
    assert.deepEqual(Object.keys(options).sort(), ["exams", "slots"]);
    assert.ok(!options.exams.includes(exam)); assert.ok(!options.slots.includes("13h00 - 15h00"));
    assert.equal((await availability(req(undefined, { query: "?date=2026-02-31" }))).status, 400);

    assert.equal((await planning(req({ reservation_id: 99, examen: exam }))).status, 400);
    assert.equal(rpcCalls, 0);
    for (const body of [{ date_cours: exam, creneau: "13h00 - 15h00", examen: exam }, { date_cours: addPermisDays(exam, 1), creneau: "13h00 - 15h00", examen: exam }, { date_cours: day }, { examen: "nonsense" }, { date_cours: day, creneau: "03h00 - 04h00" }]) {
      assert.equal((await planning(req(body))).status, 400);
    }
    assert.equal(rpcCalls, 0); assert.equal(emailCalls, 0);
    const unchanged = await planning(req({ examen: null }));
    assert.equal(unchanged.status, 200); assert.equal((await unchanged.json()).changed, false);
    assert.equal(rpcCalls, 0);
    for (const [patch, expectedExam, expectedDay] of [
      [{ examen: exam }, exam, null],
      [{ date_cours: day, creneau: "13h00 - 15h00" }, exam, day],
      [{ examen: "Plus tard" }, null, day],
    ] as const) {
      assert.equal((await planning(req(patch))).status, 200);
      assert.equal(row.examen, expectedExam); assert.equal(row.date_cours, expectedDay);
    }
    assert.equal(emailCalls, 3); assert.ok(internalHtml.includes("Salon"));
    const noChange = await planning(req({ date_cours: day, creneau: "13h00 - 15h00" }));
    assert.equal((await noChange.json()).changed, false); assert.equal(emailCalls, 3);
    row = { ...initial };
    assert.equal((await planning(req({ date_cours: day, creneau: "13h00 - 15h00" }))).status, 200);
    assert.equal(row.examen, null); // course alone
    row = { ...initial }; emailFailure = true;
    assert.equal((await planning(req({ examen: exam, date_cours: day, creneau: "13h00 - 15h00" }))).status, 200);
    assert.equal(row.examen, exam); assert.equal(row.date_cours, day); // committed despite email failure
    emailFailure = false;
    const mailsBeforeConflict = emailCalls;
    for (rpcMode of ["conflict", "stale", "blocked"]) {
      row = { ...initial };
      assert.equal((await planning(req({ examen: exam, date_cours: day, creneau: "13h00 - 15h00" }))).status, 409);
      assert.deepEqual(row, initial);
    }
    assert.equal(emailCalls, mailsBeforeConflict); rpcMode = "";

    const pdf = new File(["%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n"], "document.pdf", { type: "application/pdf" });
    const form = (file: File = pdf, kind = "certificat", extra?: string) => { const value = new FormData(); value.set("kind", kind); value.set("file", file); if (extra) value.set(extra, "99"); return value; };
    for (const extra of ["reservation_id", "path", "certificat_url"]) assert.equal((await documents(req(form(pdf, "certificat", extra)))).status, 400);
    for (const kind of ["email_sent", "facture_url", "__proto__"]) assert.equal((await documents(req(form(pdf, kind)))).status, 400);
    assert.equal((await documents(req(form(new File([], "empty.pdf", { type: "application/pdf" }))))).status, 400);
    assert.equal((await documents(req(form(new File(["not a pdf"], "fake.pdf", { type: "application/pdf" }))))).status, 400);
    assert.equal((await documents(req(form(new File(["%PDF-1.4\n/JavaScript /JS (evil)\n%%EOF"], "active.pdf", { type: "application/pdf" }))))).status, 400);
    assert.equal((await documents(req(form(new File(["abc"], "bad.exe", { type: "application/pdf" }))))).status, 400);
    assert.equal((await documents(req(form(new File(["abc"], "bad.pdf", { type: "text/plain" }))))).status, 400);
    assert.equal((await documents(req(form(new File([new Uint8Array(PERMIS_DOCUMENT_BYTES + 1)], "large.pdf", { type: "application/pdf" }))))).status, 413);
    assert.equal(uploads, 0); assert.equal(links, 0);
    assert.equal((await documents(req(form()))).status, 200);
    assert.equal(uploads, 1); assert.equal(links, 1);
    linkFailure = true;
    assert.equal((await documents(req(form()))).status, 503); assert.equal(removes, 1);
    await assert.rejects(() => validatePermisDocument("photo", new File(["not-jpeg"], "photo.jpg", { type: "image/jpeg" })));
    // Minimal structural JPEG fixture: SOI, SOF0, SOS and EOI.
    const jpeg = new Uint8Array([255,216,255,192,0,11,8,0,1,0,1,1,1,17,0,255,218,0,8,1,1,0,0,63,0,0,255,217]);
    assert.equal((await validatePermisDocument("photo", new File([jpeg], "photo.jpg", { type: "image/jpeg" }))).mime, "image/jpeg");
    const closed = await logout(req(undefined, { method: "DELETE" }));
    assert.equal(closed.status, 200); assert.match(closed.headers.get("set-cookie")!, /Max-Age=0/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.PERMIS_REPRISE_ACCESS_ENABLED;
  }
  for (const file of ["src/app/reprendre-reservation/SecureReprise.tsx", "src/app/reprendre-reservation/page.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.ok(!/supabase|uploadDocument\(/.test(source), "No direct Supabase browser access");
  }
  const baseline = "f6d58350786be8a7d8c10aac8a0cbeb3e4eba690";
  for (const prefix of ["src/app/api/payzen", "src/lib/permisInvoice", "src/lib/permisPricing", "src/app/baleines", "src/app/peche", "src/app/charter", "src/lib/adminCarnetsBaleines"]) {
    assert.equal(execFileSync("git", ["diff", baseline, "--", prefix], { encoding: "utf8" }), "");
  }
  const wrapper = readFileSync("src/app/reprendre-reservation/page.tsx", "utf8");
  assert.match(wrapper, /PERMIS_REPRISE_ACCESS_ENABLED === "true"/);
  assert.match(wrapper, /: <LegacyReprise/);
  console.log("Reprise 2D : sécurité des routes, session, planning, notifications simulées, documents et invariants OK.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
