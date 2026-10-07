/* eslint-disable @typescript-eslint/no-require-imports */
// Isolated modules: no .env, database, storage, email or PayZen network access.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const id = "11111111-2222-4333-8444-555555555555";
const initial = {
  id, date_sortie: "2026-10-13", depart: "07:00", montant_total: 30000,
  responsable_prenom: "Responsable simulation", responsable_nom: "Test",
  responsable_email: "simulation@example.invalid", responsable_telephone: "0000",
  participants: [{ role: "mise_eau", prenom: "Test", nom: "A" }, { role: "mise_eau", prenom: "Test", nom: "B" }],
  paye: true, statut_paiement: "paid", source_paiement: "payzen_baleines",
  facture_numero: null, facture_url: null, email_sent: false, email_sent_at: null,
};
let row, job, files, calls, mail, uploaded, generated, authenticated, failure, tokenNumber;
const env = { RESEND_API_KEY: "fake-local-only", EMAIL_FROM: "sender@example.invalid", INTERNAL_EMAIL: "internal@example.invalid" };
function reset() {
  row = structuredClone(initial); job = null; files = new Map(); calls = []; mail = [];
  uploaded = generated = tokenNumber = 0; authenticated = true; failure = {};
  env.RESEND_API_KEY = "fake-local-only";
}
reset();
const reject = (message, code = "PBI09") => ({ data: null, error: { message, code } });
const client = {
  async rpc(name, args) {
    calls.push({ name, args });
    assert.equal(args.p_reservation_id, id);
    if (name === "claim_baleines_invoice") {
      if (!row.paye || !["paid", "paye"].includes(row.statut_paiement)) return reject("Paiement non confirme");
      if (!row.responsable_email) return reject("Email manquant");
      if (job?.state === "sent") return { data: { already_sent: true }, error: null };
      if (job?.state === "processing") return reject("Facture deja en cours");
      if (!job && (row.facture_numero || row.facture_url || row.email_sent)) return reject("Facture existante");
      if (!job) job = { state: "processing", token: "token-" + (++tokenNumber),
        invoice_number: "BAL-2026-" + id.replaceAll("-", ""),
        invoice_path: "factures/baleines/BAL-2026-" + id.replaceAll("-", "") + ".pdf",
        reservation_snapshot: structuredClone(row), created_at: "2026-10-06T12:00:00Z", customer_sent_at: null };
      else { job.state = "processing"; job.token = "token-" + (++tokenNumber); }
      return { data: structuredClone(job), error: null };
    }
    assert.equal(name, "finish_baleines_invoice");
    assert.equal(args.p_token, job.token);
    assert.equal(job.state, "processing");
    if (args.p_action === "invoice") { row.facture_numero = job.invoice_number; row.facture_url = job.invoice_path; }
    if (args.p_action === "customer") { job.customer_sent_at = "2026-10-06T12:00:01Z"; row.email_sent = true; row.email_sent_at = job.customer_sent_at; }
    if (args.p_action === "sent") { assert.ok(job.customer_sent_at); row.email_sent = true; row.email_sent_at = "2026-10-06T12:00:02Z"; job.state = "sent"; }
    if (args.p_action === "failed") { job.state = "failed"; job.last_error = args.p_error; }
    return { data: null, error: null };
  },
  from(table) {
    assert.equal(table, "baleines_invoice_deliveries");
    return { select: columns => { assert.equal(columns, "state"); return { eq: (key, value) => {
      assert.equal(key, "reservation_id"); assert.equal(value, id);
      return { maybeSingle: async () => ({ data: job ? { state: job.state } : null, error: null }) };
    }}; }};
  },
  storage: { from(bucket) {
    assert.equal(bucket, "documents-permis");
    return {
      async download(file) {
        if (failure.download) return { data: null, error: { statusCode: 500, message: "Storage unavailable" } };
        if (!files.has(file)) return { data: null, error: { statusCode: 404, message: "Object not found" } };
        return { data: new Blob([files.get(file)]), error: null };
      },
      async upload(file, pdf, options) {
        assert.equal(options.upsert, false);
        assert.ok(!files.has(file), "Never overwrite a PDF");
        if (failure.upload) return { error: { message: "Storage refused" } };
        assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
        files.set(file, pdf); uploaded++; return { error: null };
      },
    };
  }},
};
async function fakeFetch(url, options) {
  if (String(url).includes("/api/bateau/confirm")) {
    assert.ok(generated > 0, "Invoice attempted before calendar confirmation");
    if (failure.calendarNetwork) throw Error("Calendar unavailable");
    return new Response(JSON.stringify(failure.confirm ? { error: "Calendar blocked" } : { slots: [] }), { status: failure.confirm ? 409 : 200 });
  }
  assert.equal(url, "https://api.resend.com/emails", "No other network or PayZen calls permitted");
  const payload = JSON.parse(options.body);
  assert.ok(payload.to.every(address => address.endsWith("@example.invalid")));
  assert.ok(options.headers["Idempotency-Key"]);
  mail.push({ payload, key: options.headers["Idempotency-Key"] });
  if (failure.network || (failure.internalNetwork && payload.to[0] === env.INTERNAL_EMAIL)) throw new Error("Simulated network failure");
  if (failure.customer && payload.to[0] === initial.responsable_email) return new Response("Customer email rejected", { status: 422 });
  if (failure.internal && payload.to[0] === env.INTERNAL_EMAIL) return new Response("Internal email rejected", { status: 500 });
  return new Response('{"id":"fake-local"}');
}
const cache = new Map();
function load(file) {
  file = path.normalize(file);
  if (cache.has(file)) return cache.get(file);
  const loaded = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  }}).outputText;
  const resolve = name => {
    if (["@/lib/permisInvoice", "@/lib/pecheInvoice", "@/lib/permisEmail", "@/lib/pecheEmail"].includes(name)) return {};
    if (name === "@/lib/adminSession") return { verifyAdminSession: () => authenticated };
    if (name === "@/lib/salonAdmin") return { getSalonAdminClient: () => client };
    if (name === "@/lib/supabase") return { supabase: { from: table => {
      assert.equal(table, "reservations_baleines");
      return { update: values => { assert.deepEqual(JSON.parse(JSON.stringify(values)), { statut_paiement: "paid", paye: true }); return { eq: async (key, value) => {
        assert.equal(key, "id"); assert.equal(value, id); Object.assign(row, values); return { error: null };
      }}; }, select: column => { assert.equal(column, "montant_total"); return { eq: (key, value) => {
        assert.equal(key, "id"); assert.equal(value, id); return { single: async () => ({ data: { montant_total: row.montant_total }, error: null }) };
      }}; }};
    }}};
    if (name === "@/lib/charter-payment") return { getPayzenKey: () => "fake", verifyPayzenSignature: () => !failure.signature };
    if (name === "@/lib/paymentReturn") return { markReservationPaymentFailed: () => { throw Error("Unexpected failed-payment update"); } };
    if (name.startsWith("@/") || name.startsWith(".")) {
      const target = name.startsWith("@/") ? "src/" + name.slice(2) : path.join(path.dirname(file), name);
      const exports = load(target + ".ts");
      if (name === "@/lib/baleinesInvoice") return { ...exports, buildBaleinesInvoicePdf: (...args) => {
        generated++; return exports.buildBaleinesInvoicePdf(...args);
      }};
      return exports;
    }
    if (["next/server", "react", "react/jsx-runtime"].includes(name)) return require(name);
    throw Error("Unexpected module/network capability: " + name);
  };
  vm.runInNewContext(source, { module: loaded, exports: loaded.exports, require: resolve,
    Buffer, Blob, Date, Error, URL, console: { log() {}, error() {} },
    process: { env }, fetch: fakeFetch });
  cache.set(file, loaded.exports);
  return loaded.exports;
}
load("src/lib/baleinesInvoiceDelivery.ts");
const route = load("src/app/api/admin/baleines/generate-invoice/route.ts");
const callback = load("src/app/api/payzen-notification/route.ts");
const request = body => new Request("http://local/api/admin/baleines/generate-invoice", {
  method: "POST", body: JSON.stringify(body ?? { reservationId: id, amount: 1, email: "ignored@example.invalid" }),
});
function payzenRequest() {
  const form = new FormData();
  for (const [k, v] of Object.entries({ vads_ctx_mode: "PRODUCTION", signature: "simulated",
    vads_trans_status: "AUTHORISED", vads_cust_email: initial.responsable_email, vads_trans_id: "000001",
    vads_order_id: id, vads_ext_info_reservation_table: "reservations_baleines", vads_currency: "953", vads_amount: "30000" })) form.set(k, v);
  return new Request("http://local/api/payzen-notification", { method: "POST", body: form });
}
let passed = 0;
async function test(name, fn) { reset(); await fn(); passed++; console.log("PASS " + name); }
(async () => {
  await test("admin authentication required before side effects", async () => {
    authenticated = false; assert.equal((await route.POST(request())).status, 401);
    assert.equal(calls.length, 0); assert.equal(mail.length, 0);
  });
  await test("invalid JSON/id rejected", async () => {
    assert.equal((await route.POST(request({ reservationId: "bad" }))).status, 400);
    assert.equal((await route.POST(new Request("http://local", { method: "POST", body: "invalid" }))).status, 400);
    assert.equal(calls.length, 0);
  });
  await test("unpaid booking cannot generate", async () => {
    row.paye = false; assert.equal((await route.POST(request())).status, 409); assert.equal(uploaded, 0); assert.equal(mail.length, 0);
  });
  await test("paid flag alone is insufficient", async () => {
    row.statut_paiement = "pending"; assert.equal((await route.POST(request())).status, 409); assert.equal(mail.length, 0);
  });
  await test("existing untracked invoice is never regenerated", async () => {
    row.facture_url = "old.pdf"; assert.equal((await route.POST(request())).status, 409); assert.equal(generated, 0);
  });
  await test("paid historical booking: generate PDF, store, email, persist sent flags; amount unchanged", async () => {
    assert.equal((await route.POST(request())).status, 200);
    assert.equal(generated, 1); assert.equal(uploaded, 1); assert.equal(mail.length, 2);
    assert.equal(mail[0].payload.to[0], initial.responsable_email);
    assert.equal(mail[0].payload.attachments[0].filename, job.invoice_number + ".pdf");
    assert.ok(Buffer.from(mail[0].payload.attachments[0].content, "base64").includes(Buffer.from("30 000")));
    assert.equal(row.montant_total, 30000); assert.equal(row.paye, true);
    assert.equal(row.email_sent, true); assert.ok(row.email_sent_at);
    assert.ok(!calls.some(call => call.args.p_confirm_payment === true), "Admin never confirms payment or calls PayZen");
  });
  await test("double request and replay: one invoice and one client email", async () => {
    const results = await Promise.all([route.POST(request()), route.POST(request())]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    assert.equal((await route.POST(request())).status, 200);
    assert.equal(generated, 1); assert.equal(uploaded, 1); assert.equal(mail.length, 2);
  });
  await test("PDF upload failure: no email, payment untouched, retry possible", async () => {
    failure.upload = true; assert.equal((await route.POST(request())).status, 502);
    assert.equal(row.facture_url, null); assert.equal(mail.length, 0); assert.equal(row.paye, true);
    failure.upload = false; assert.equal((await route.POST(request())).status, 200);
    assert.equal(uploaded, 1); assert.equal(row.montant_total, 30000);
  });
  await test("storage outage never causes a new PDF", async () => {
    failure.download = true; assert.equal((await route.POST(request())).status, 502);
    assert.equal(generated, 0); assert.equal(uploaded, 0); assert.equal(mail.length, 0);
  });
  await test("Resend rejection: stored PDF retained and reused", async () => {
    failure.customer = true; assert.equal((await route.POST(request())).status, 502);
    assert.ok(row.facture_url); assert.equal(row.email_sent, false); assert.equal(row.paye, true);
    const number = row.facture_numero; const pdf = files.get(row.facture_url);
    failure.customer = false; assert.equal((await route.POST(request())).status, 200);
    assert.equal(generated, 1); assert.equal(uploaded, 1); assert.equal(row.facture_numero, number);
    assert.equal(files.get(row.facture_url), pdf); assert.equal(mail[0].key, mail[1].key);
  });
  await test("customer success sets sent flags despite internal email failure", async () => {
    failure.internal = true; assert.equal((await route.POST(request())).status, 200);
    assert.equal(row.email_sent, true); assert.ok(row.email_sent_at);
    assert.equal((await route.POST(request())).status, 200);
    assert.equal(mail.filter(item => item.payload.to[0] === initial.responsable_email).length, 1);
  });
  await test("customer network failure preserves paid state and stored invoice", async () => {
    failure.network = true;
    assert.equal((await callback.POST(payzenRequest())).status, 500);
    assert.equal(row.paye, true); assert.equal(row.statut_paiement, "paid");
    assert.equal(row.email_sent, false); assert.ok(row.facture_url);
    failure.network = false;
    assert.equal((await route.POST(request())).status, 200);
    assert.equal(generated, 1); assert.equal(uploaded, 1);
  });
  await test("internal network failure does not undo successful customer delivery", async () => {
    failure.internalNetwork = true;
    assert.equal((await callback.POST(payzenRequest())).status, 200);
    assert.equal(row.email_sent, true); assert.ok(row.email_sent_at);
    assert.equal((await route.POST(request())).status, 200);
    assert.equal(mail.filter(item => item.payload.to[0] === initial.responsable_email).length, 1);
  });
  await test("missing Resend key: never mark email sent", async () => {
    delete env.RESEND_API_KEY; assert.equal((await route.POST(request())).status, 502);
    assert.equal(row.email_sent, false); assert.equal(mail.length, 0);
  });
  await test("blocked calendar cannot prevent admin catch-up", async () => {
    failure.confirm = true; assert.equal((await route.POST(request())).status, 200);
    assert.equal(generated, 1); assert.equal(row.email_sent, true);
  });
  await test("confirmed payment callback generates invoice/email using shared service", async () => {
    row.paye = false; row.statut_paiement = "pending";
    assert.equal((await callback.POST(payzenRequest())).status, 200);
    assert.equal(calls[0].name, "claim_baleines_invoice");
    assert.equal(row.email_sent, true); assert.equal(row.montant_total, 30000); assert.equal(uploaded, 1);
  });
  await test("callback and admin race share one durable claim", async () => {
    const results = await Promise.all([callback.POST(payzenRequest()), route.POST(request())]);
    assert.ok(results.some(result => result.status === 200));
    assert.ok(results.every(result => [200, 409, 500].includes(result.status)));
    assert.equal(uploaded, 1); assert.equal(generated, 1); assert.equal(mail.length, 2);
  });
  await test("callback Resend failure visible; payment remains confirmed", async () => {
    failure.customer = true; row.paye = false; row.statut_paiement = "pending";
    assert.equal((await callback.POST(payzenRequest())).status, 500);
    assert.equal(row.paye, true); assert.equal(row.statut_paiement, "paid"); assert.equal(row.email_sent, false);
  });
  await test("invalid callback signature stops before confirmation", async () => {
    failure.signature = true; assert.equal((await callback.POST(payzenRequest())).status, 400); assert.equal(calls.length, 0);
  });
  await test("confirmed payment invoices even when calendar is blocked", async () => {
    failure.confirm = true; row.paye = false; row.statut_paiement = "pending";
    assert.equal((await callback.POST(payzenRequest())).status, 200);
    assert.equal(uploaded, 1); assert.equal(row.email_sent, true); assert.equal(row.paye, true);
  });
  await test("calendar network failure cannot invalidate delivered invoice", async () => {
    failure.calendarNetwork = true;
    assert.equal((await callback.POST(payzenRequest())).status, 200);
    assert.equal(row.email_sent, true);
  });
  await test("read-only retry status is authenticated and reflects partial failures", async () => {
    const req = () => new Request("http://local/api/admin/baleines/generate-invoice?reservationId=" + id);
    authenticated = false; assert.equal((await route.GET(req())).status, 401);
    authenticated = true;
    assert.equal((await (await route.GET(req())).json()).retryable, false);
    failure.customer = true; await route.POST(request());
    assert.equal((await (await route.GET(req())).json()).retryable, true);
    const before = calls.length; await route.GET(req()); assert.equal(calls.length, before);
  });
  await test("corrupt stored PDF never generates or sends another invoice", async () => {
    failure.customer = true; await route.POST(request()); failure.customer = false;
    files.set(job.invoice_path, Buffer.from("not a PDF"));
    const before = mail.length;
    assert.equal((await route.POST(request())).status, 502);
    assert.equal(mail.length, before); assert.equal(generated, 1); assert.equal(uploaded, 1);
  });
  await test("admin button visible only for paid, missing invoice; French label", async () => {
    const React = require("react"); const { renderToStaticMarkup } = require("react-dom/server");
    const Component = load("src/app/admin/components/BaleinesGenerateInvoice.tsx").default;
    const render = reservation => renderToStaticMarkup(React.createElement(Component, { reservation, onSuccess: async () => {} }));
    assert.ok(render(initial).includes("Générer et envoyer la facture"));
    assert.equal(render({ ...initial, paye: false }), "");
    assert.equal(render({ ...initial, statut_paiement: "pending" }), "");
    assert.equal(render({ ...initial, email_sent: true }), "");
    assert.equal(render({ ...initial, facture_url: "old.pdf" }), "");
  });
  console.log("RESULT: " + passed + " isolated API/PDF/Storage/Resend checks passed; zero real network calls.");
})().catch(error => { console.error(error); process.exitCode = 1; });
