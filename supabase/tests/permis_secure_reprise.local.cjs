// Run only with the disposable in-memory PGlite engine:
// npm exec --yes --package=@electric-sql/pglite -- node supabase/tests/permis_secure_reprise.local.cjs
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = process.env.PATH.split(path.delimiter).find(entry => entry.includes("_npx") && entry.endsWith(".bin"));
if (!root) throw new Error("Run through npm exec with @electric-sql/pglite.");
const { PGlite } = require(path.join(root, "..", "@electric-sql", "pglite"));
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create table public.reservations (
        id bigserial primary key, prenom text, nom text, email text, telephone text,
        formule text, examen text, date_cours text, creneau text, archived boolean default false,
        paiement_effectue boolean default false
      );
      create table public.examens_bloques (date_examen date);
      create schema storage;
      create table storage.objects (id uuid, bucket_id text);
      alter table public.reservations enable row level security;
      alter table storage.objects enable row level security;
      create policy "allow public insert reservations" on public.reservations for insert to public with check(true);
      create policy "allow public select reservations" on public.reservations for select to public using(true);
      create policy "allow public update reservations" on public.reservations for update to public using(true) with check(true);
      create policy "allow public read documents permis" on storage.objects for select to public using(bucket_id='documents-permis');
      create policy "allow public upload documents permis" on storage.objects for insert to public with check(bucket_id='documents-permis');
      grant select,insert,update on public.reservations,storage.objects to anon,authenticated;
      alter default privileges in schema public grant all on tables to anon,authenticated;
    `);
    const policyQuery="select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies order by schemaname,tablename,policyname";
    const before=(await db.query(policyQuery)).rows;
    const grantQuery="select grantee,table_schema,table_name,privilege_type from information_schema.role_table_grants where table_name in ('reservations','objects') order by grantee,table_schema,table_name,privilege_type";
    const grantsBefore=(await db.query(grantQuery)).rows;
    await db.exec(fs.readFileSync("supabase/migrations/202609060001_prepare_permis_secure_reprise.sql","utf8"));
    assert.deepEqual((await db.query(policyQuery)).rows,before);
    assert.deepEqual((await db.query(grantQuery)).rows,grantsBefore);
    await db.exec(fs.readFileSync("supabase/tests/permis_secure_reprise.sql","utf8"));
    await db.exec(fs.readFileSync("supabase/migrations/202609060002_complete_permis_secure_reprise.sql","utf8"));
    assert.deepEqual((await db.query(policyQuery)).rows,before);
    assert.deepEqual((await db.query(grantQuery)).rows,grantsBefore);
    await db.exec(fs.readFileSync("supabase/tests/permis_secure_reprise.sql","utf8"));
    await db.exec(fs.readFileSync("supabase/tests/permis_reprise.sql","utf8"));
    // PGlite queues operations on one backend: tests racing submissions, not two
    // independent PostgreSQL connections. The SQL table lock is reviewed separately.
    await db.exec("begin");
    const rows = (await db.query("insert into public.reservations(prenom,nom,examen) values('Race','One','Plus tard'),('Race','Two','Plus tard') returning id")).rows;
    const day = (await db.query("select ((clock_timestamp() at time zone 'Pacific/Tahiti')::date+30)::text as day")).rows[0].day;
    const attempts = await Promise.all(rows.map(row => db.query(
      "select public.permis_save_planning($1,$2::jsonb,$3::jsonb) as result",
      [String(row.id),JSON.stringify({examen:null,date_cours:null,creneau:null}),JSON.stringify({date_cours:day,creneau:"13h00 - 15h00"})]
    )));
    assert.deepEqual(attempts.map(r=>r.rows[0].result.status).sort(),["changed","conflict"]);
    assert.deepEqual((await db.query(policyQuery)).rows,before);
    assert.deepEqual((await db.query(grantQuery)).rows,grantsBefore);
    await db.exec("rollback");
    console.log("SQL local : migration exécutée en mémoire ; assertions codes/limites/droits/planning OK ; policies et grants existants inchangés.");
  } finally { await db.close(); }
})().catch(error => { console.error(error.message); process.exitCode=1; });
