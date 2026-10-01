// Own temporary PostgreSQL cluster on loopback. Never reads .env.
// Run: node supabase/tests/baleines_capacity.local.cjs
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const bin = process.env.BALEINES_TEST_PG_BIN || "C:/Program Files/PostgreSQL/18/bin";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "baleines-capacity-"));
const data = path.join(tmp, "data");
let started = false, port, passed = 0;
const children = new Set();
const exe = name => path.join(bin, name + (process.platform === "win32" ? ".exe" : ""));
function command(name, args) {
  const r = spawnSync(exe(name), args, { encoding: "utf8", windowsHide: true, timeout: 30000, stdio: name === "pg_ctl" ? "ignore" : "pipe" });
  if (r.error || r.status !== 0) throw new Error(name + ": " + (r.error?.message || r.stderr || r.stdout));
  return r.stdout;
}
function session(name = "baleines-capacity-test") {
  const proc = spawn(exe("psql"), ["-X", "-qAt", "-h", "127.0.0.1", "-p", String(port),
    "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"],
    { windowsHide: true, env: { ...process.env, PGAPPNAME: name, PGCLIENTENCODING: "UTF8", PGPASSWORD: "" } });
  children.add(proc);
  let stdout = "", stderr = "", mark;
  const marker = new Promise(resolve => { mark = resolve; });
  proc.stdout.on("data", chunk => { stdout += chunk.toString(); if (stdout.includes("CAPACITY_LOCK_HELD")) mark(); });
  proc.stderr.on("data", chunk => { stderr += chunk.toString(); });
  const done = new Promise((resolve, reject) => {
    proc.on("error", reject);
    proc.on("close", code => { children.delete(proc); resolve({ code, stdout: stdout.trim(), stderr }); });
  });
  return { proc, done, marker };
}
async function sql(query, expectedError) {
  const s = session(); s.proc.stdin.end(query + "\n");
  const r = await s.done;
  if (expectedError) { assert.notEqual(r.code, 0, "Expected rejection"); assert.match(r.stderr, new RegExp(expectedError)); }
  else assert.equal(r.code, 0, r.stderr);
  return r.stdout;
}
const quote = v => "'" + String(v).replaceAll("'", "''") + "'";
function participants(w, o) {
  return [...Array.from({ length: w }, () => ({ role: "mise_eau", age: "30", prenom: "Test", nom: "Local" })),
    ...Array.from({ length: o }, () => ({ role: "observateur", age: "30", prenom: "Test", nom: "Local" }))];
}
function insert(w, o, { status = "pending", paid = false, source = "paiement_externe_a_facturer", day = "2026-10-01", slot = "07:00" } = {}) {
  return "insert into public.reservations_baleines(date_sortie,depart,participants,nombre_mise_eau,nombre_observateurs,statut_paiement,paye,source_paiement) values(" +
    [quote(day), quote(slot), quote(JSON.stringify(participants(w, o))) + "::jsonb", w, o, quote(status), paid, quote(source)].join(",") + ") returning id;";
}
function rpc(w, o, day = "2026-10-01", slot = "07:00") {
  return "select id from public.create_baleines_reservation(" + quote(JSON.stringify({
    date_sortie: day, depart: slot, participants: participants(w, o),
    responsable_prenom: "Test", responsable_nom: "Local", responsable_email: "test@example.invalid",
    responsable_telephone: "0000", montant_total: w * 15000 + o * 8500, source_paiement: "payzen_baleines",
  })) + "::jsonb);";
}
async function reset() { await sql("truncate public.reservations_baleines,public.baleines_capacity_locks;"); }
async function counts(day = "2026-10-01") {
  return JSON.parse(await sql("select coalesce(json_agg(t),'[]'::json) from public.get_baleines_capacity(" + quote(day) + "," + quote(day) + ") t;"));
}
async function test(name, fn) { await reset(); await fn(); passed++; console.log("PASS " + name); }
async function concurrency(name, firstQuery, secondQuery, expected = "PBC01", isolation = "read committed") {
  const a = session(name + "-first");
  a.proc.stdin.write("begin isolation level " + isolation + ";\n" + firstQuery + "\n\\echo CAPACITY_LOCK_HELD\n");
  await Promise.race([a.marker, a.done.then(r => { throw new Error("First session exited: " + r.stderr); })]);
  const b = session(name + "-second");
  b.proc.stdin.end("begin isolation level " + isolation + ";\n" + secondQuery + "\ncommit;\n");
  let waiting = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const blocked = await sql("select count(*) from pg_stat_activity where application_name=" +
      quote(name + "-second") + " and wait_event_type='Lock';");
    if (blocked === "1") { waiting = true; break; }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  a.proc.stdin.end("commit;\n");
  const [ra, rb] = await Promise.all([a.done, b.done]);
  assert.ok(waiting, "Second connection must wait for the first transaction");
  assert.equal(ra.code, 0, ra.stderr); assert.notEqual(rb.code, 0);
  assert.match(rb.stderr, new RegExp(expected));
}
(async () => {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  command("initdb", ["-D", data, "-U", "postgres", "-A", "trust", "--encoding=UTF8", "--locale=C"]);
  started = true;
  command("pg_ctl", ["-D", data, "-l", path.join(tmp, "postgres.log"), "-o", "-h 127.0.0.1 -p " + port, "-w", "start"]);
  await sql("create role anon; create role authenticated; create role service_role bypassrls;" +
    "create table public.reservations_baleines (" +
    "id uuid primary key default gen_random_uuid(), date_sortie text, depart text," +
    "responsable_prenom text, responsable_nom text, responsable_email text, responsable_telephone text," +
    "participants jsonb, nombre_mise_eau integer, nombre_observateurs integer," +
    "montant_total integer default 0, devise text default 'XPF'," +
    "statut_paiement text, paye boolean, source_paiement text, facture_numero text,created_at timestamptz default now());" +
    "grant select,insert,update on public.reservations_baleines to anon,authenticated,service_role;");
  // Reproduce the real case BEFORE migration, with synthetic data only.
  await sql(insert(6, 0));
  const legacyId = await sql(insert(1, 0, { source: "payzen_baleines" }));
  const before = await sql("select json_agg(r order by id) from public.reservations_baleines r;");
  const migration = fs.readFileSync(path.join(__dirname, "../migrations/202609300001_enforce_baleines_capacity.sql"), "utf8");
  await sql(migration);
  const after = await sql("select json_agg(t order by id) from (select id,date_sortie,depart,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,participants,nombre_mise_eau,nombre_observateurs,montant_total,devise,statut_paiement,paye,source_paiement,facture_numero,created_at from public.reservations_baleines) t;");
  assert.deepEqual(JSON.parse(after), JSON.parse(before), "Migration must preserve all existing values");
  assert.equal(await sql("select count(*) from public.reservations_baleines where capacity_hold_expires_at is not null;"), "0");
  assert.deepEqual(await counts(), [{ date_sortie: "2026-10-01", depart: "07:00", mise_eau: 6, observateurs: 0 }]);
  await sql(rpc(1, 0), "PBC01");
  await sql("update public.reservations_baleines set statut_paiement='paid',paye=true where id=" + quote(legacyId) + ";", "PBC01");
  assert.equal(await sql("select statut_paiement from public.reservations_baleines where id=" + quote(legacyId) + ";"), "pending");
  passed++; console.log("PASS real-case fixture: admin 6 + legacy pending 1; no backfill; 0 remaining; late confirmation rejected");

  for (const [existing, requested, accept] of [[0,6,true],[6,1,false],[5,1,true],[5,2,false]]) {
    await test(existing + " + " + requested + " swimmers => " + (accept ? "accepted" : "rejected"), async () => {
      if (existing) await sql(insert(existing, 0));
      await sql(rpc(requested, 0), accept ? undefined : "PBC01");
      assert.equal((await counts())[0].mise_eau, accept ? existing + requested : existing);
    });
  }
  await test("2 observers + 1 => rejected; swimmer capacity independent", async () => {
    await sql(insert(0, 2)); await sql(rpc(0, 1), "PBC01"); await sql(rpc(6, 0));
    assert.equal((await counts())[0].observateurs, 2);
  });
  for (const status of ["cancelled","canceled","failed","refused","abandoned","unpaid"]) {
    await test(status + " releases capacity even with paid=true and external source", async () => {
      await sql(insert(6, 2, { status, paid: true })); await sql(rpc(6, 2));
    });
  }
  for (const status of ["paid","paye","deposit_paid"]) {
    await test(status + " counts without paid flag", async () => {
      await sql(insert(6, 0, { status, source: "salon_admin" })); await sql(rpc(1, 0), "PBC01");
    });
  }
  await test("new public pending: 30-minute hold, then expiry releases seats", async () => {
    const id = await sql(rpc(6, 0));
    assert.equal(await sql("select capacity_hold_expires_at > clock_timestamp()+interval '29 minutes' and capacity_hold_expires_at <= clock_timestamp()+interval '30 minutes' from public.reservations_baleines where id=" + quote(id) + ";"), "t");
    await sql(rpc(1, 0), "PBC01");
    await sql("update public.reservations_baleines set capacity_hold_expires_at=clock_timestamp()-interval '1 second' where id=" + quote(id) + ";");
    assert.deepEqual(await counts(), []);
    await sql(insert(6, 0));
    await sql("update public.reservations_baleines set paye=true,statut_paiement='paid' where id=" + quote(id) + ";", "PBC01");
  });
  await test("failed public pending releases its unexpired hold immediately", async () => {
    const id = await sql(rpc(6, 0));
    await sql("update public.reservations_baleines set statut_paiement='failed' where id=" + quote(id) + ";");
    await sql(rpc(6, 0));
  });
  await test("confirmation consumes own hold once; invoice update allowed", async () => {
    const id = await sql(rpc(6, 0));
    await sql("update public.reservations_baleines set paye=true,statut_paiement='paid' where id=" + quote(id) + ";");
    await sql("update public.reservations_baleines set facture_numero='LOCAL-TEST' where id=" + quote(id) + ";");
    assert.equal((await counts())[0].mise_eau, 6);
  });
  await test("direct insert, increase, move and inconsistent counts cannot bypass guard", async () => {
    await sql(insert(6, 0));
    await sql(insert(1, 0), "PBC01");
    await sql(insert(1, 0, { source: "carnet_baleines" }), "PBC01");
    const other = await sql(insert(1, 0, { slot: "13:15" }));
    await sql("update public.reservations_baleines set depart='07:00' where id=" + quote(other) + ";", "PBC01");
    await sql("update public.reservations_baleines set nombre_mise_eau=7 where id=" + quote(other) + ";", "PBC01");
    await sql("insert into public.reservations_baleines(date_sortie,depart,participants,nombre_mise_eau,nombre_observateurs,paye,statut_paiement) values('2026-10-01','07:00','[{\"role\":\"mise_eau\"}]',0,0,true,'paid');", "PBC01");
    await sql(rpc(6, 0, "2026-10-02"));
  });
  await test("aggregate RPC public access; insertion RPC service-only", async () => {
    await sql(insert(6, 0));
    const response = JSON.parse(await sql("set role anon; select json_agg(t) from public.get_baleines_capacity('2026-10-01','2026-10-01') t;"));
    assert.deepEqual(Object.keys(response[0]).sort(), ["date_sortie","depart","mise_eau","observateurs"]);
    await sql("set role anon;" + rpc(1, 0), "42501");
    await sql("set role authenticated;" + rpc(1, 0), "42501");
    await sql("set role service_role;" + rpc(1, 0), "PBC01");
    await sql("set role anon; select * from public.baleines_capacity_locks;", "42501");
  });
  await test("two connections on last swimmer place => one success", async () => {
    await sql(insert(5, 0)); await concurrency("water-race", rpc(1, 0), rpc(1, 0));
    assert.equal((await counts())[0].mise_eau, 6);
    assert.equal(await sql("select count(*) from public.reservations_baleines;"), "2");
  });
  await test("two connections on last observer place => one success", async () => {
    await sql(insert(0, 1)); await concurrency("observer-race", rpc(0, 1), rpc(0, 1));
    assert.equal((await counts())[0].observateurs, 2);
  });
  await test("concurrent public/admin insertion => one success", async () => {
    await sql(insert(5, 0)); await concurrency("admin-race", rpc(1, 0), insert(1, 0));
    assert.equal((await counts())[0].mise_eau, 6);
  });
  await test("repeatable-read stale snapshot cannot overbook", async () => {
    await sql(insert(5, 0)); await concurrency("snapshot-race", rpc(1, 0), rpc(1, 0), "40001", "repeatable read");
    assert.equal((await counts())[0].mise_eau, 6);
  });
  console.log("RESULT: " + passed + " targeted PostgreSQL tests passed, including real multi-connection lock waits.");
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  for (const child of children) child.kill();
  if (started) command("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"]);
  const resolved = fs.realpathSync(tmp), tempRoot = fs.realpathSync(os.tmpdir());
  if (path.dirname(resolved) !== tempRoot || !path.basename(resolved).startsWith("baleines-capacity-")) {
    throw new Error("Refusing cleanup outside the dedicated temporary directory");
  }
  fs.rmSync(resolved, { recursive: true, force: true });
});
