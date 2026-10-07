/* eslint-disable @typescript-eslint/no-require-imports */
// In-memory PostgreSQL only: no environment files, production or network.
const { PGlite } = require("@electric-sql/pglite");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table reservations_baleines (
        id uuid primary key, paye boolean, statut_paiement text,
        responsable_email text, montant_total integer, date_sortie text, depart text,
        participants jsonb, facture_numero text, facture_url text,
        email_sent boolean default false, email_sent_at timestamptz);
      create function confirm_baleines_departure(uuid,boolean) returns jsonb language plpgsql as $$
      begin raise exception 'Calendar must never be called'; end; $$;`);
    const historical = fs.readFileSync("supabase/migrations/202610060001_baleines_shared_departure_invoice.sql", "utf8");
    await db.exec(historical.slice(historical.indexOf("create table public.baleines_invoice_deliveries"), historical.indexOf("create or replace function public.claim_baleines_invoice")));
    await db.exec(fs.readFileSync("supabase/migrations/202610060002_baleines_invoice_payment_only.sql", "utf8"));
    const id = "11111111-2222-4333-8444-555555555555";
    await db.query("insert into reservations_baleines(id,paye,statut_paiement,responsable_email,montant_total,date_sortie,depart,participants) values ($1,true,'paid','test@example.invalid',30000,'2026-10-13','07:00','[]')", [id]);
    const claim = async () => (await db.query("select claim_baleines_invoice($1) as job", [id])).rows[0].job;
    const finish = async (job, action) => db.query("select finish_baleines_invoice($1,$2,$3,$4)", [id,job.token,action,action === "failed" ? "Simulated email failure" : null]);
    const row = async () => (await db.query("select * from reservations_baleines where id=$1", [id])).rows[0];
    let job = await claim();
    assert.ok(job.token);
    console.log("PASS SQL paid booking claimed despite calendar rejection");
    await assert.rejects(claim(), /deja en cours/);
    await finish(job,"invoice");
    assert.equal((await row()).facture_numero, job.invoice_number);
    await finish(job,"customer_attempt");
    await finish(job,"failed");
    assert.equal((await row()).paye,true);
    assert.equal((await row()).email_sent,false);
    const retry = await claim();
    assert.equal(retry.invoice_number, job.invoice_number);
    assert.equal(retry.invoice_path, job.invoice_path);
    assert.notEqual(retry.token,job.token);
    await assert.rejects(finish(job,"invoice"), /Verrou facture invalide/);
    console.log("PASS SQL duplicate claim blocked; failed email preserves payment and invoice on retry");
    await finish(retry,"customer");
    const sent = await row();
    assert.equal(sent.email_sent,true); assert.ok(sent.email_sent_at);
    // Failure after successful customer delivery must allow resume without resending.
    await finish(retry,"failed");
    job = await claim(); assert.ok(job.customer_sent_at);
    await finish(job,"sent");
    assert.equal((await row()).email_sent_at.getTime(),sent.email_sent_at.getTime());
    assert.equal((await claim()).already_sent,true);
    console.log("PASS SQL customer flags persisted immediately; completed delivery never reclaimed");
    await db.query("delete from baleines_invoice_deliveries where reservation_id=$1",[id]);
    await db.query("update reservations_baleines set paye=false,statut_paiement='pending',facture_numero=null,facture_url=null,email_sent=false,email_sent_at=null where id=$1",[id]);
    await assert.rejects(claim(), /Paiement Baleines non confirme/);
    console.log("PASS SQL unpaid booking rejected");
    console.log("RESULT: 4 in-memory SQL checks passed; no production access.");
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
