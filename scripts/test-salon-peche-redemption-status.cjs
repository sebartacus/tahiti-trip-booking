/* eslint-disable @typescript-eslint/no-require-imports */
// In-memory PostgreSQL only. No environment files, network or production access.
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const read = name => fs.readFileSync('supabase/migrations/' + name, 'utf8');
(async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
    await db.exec(read('202606290001_create_reservations_peche.sql'));
    await db.exec(read('202607080001_add_manual_peche_reservations.sql'));
    await db.exec(`CREATE TABLE salon_sales(id uuid PRIMARY KEY,client_prenom text,client_nom text,client_email text,client_telephone text,montant_total int,montant_encaisse int,montant_solde int,facture_numero text,facture_url text);
      CREATE TABLE salon_sale_items(id uuid PRIMARY KEY,sale_id uuid,offer_code text,reservation_type text,reservation_id text,status text);
      CREATE TABLE boat_calendar_slots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),date date,slot text,status text,activity text,reservation_id uuid,reservation_table text,expires_at timestamptz,UNIQUE(date,slot));`);
    const rights = read('202608250003_add_salon_peche_sales.sql');
    await db.exec(rights.slice(0, rights.indexOf('alter table')));
    const historical = read('202608260002_add_salon_right_redemption.sql');
    const old = historical.slice(historical.indexOf('create or replace function public.redeem_salon_peche_right('), historical.indexOf('create or replace function public.redeem_salon_charter_right(')).trim();
    const migration = read('202610210001_fix_salon_peche_redemption_payment_status.sql');
    // Prove every other statement, including availability checks, remains identical.
    assert.equal(migration.slice(migration.indexOf('create or replace')).trim(), old.replace("case when v_sale.montant_solde>0 then 'deposit_paid' else 'paid' end", "'paid'"));
    const ids = ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
    const seed = async paid => {
      await db.exec('TRUNCATE salon_peche_rights,salon_sale_items,salon_sales,boat_calendar_slots,reservations_peche CASCADE');
      await db.query("INSERT INTO salon_sales VALUES($1,'Jacques','Sandmann','','87000000',66000,$2,$3,'EXISTING-INVOICE','existing.pdf')", [ids[0],paid,66000-paid]);
      await db.query("INSERT INTO salon_sale_items VALUES($1,$2,'peche_2_plus_1_demi_journee','salon_peche_rights',$3,'unused')", [ids[1],ids[0],ids[2]]);
      await db.query("INSERT INTO salon_peche_rights(id,sale_item_id,offer_code,offer_type,formule,nombre_personnes,montant_paye,valid_until) VALUES($1,$2,'peche_2_plus_1_demi_journee','two_plus_one','half_day',3,$3,'2027-01-31')", [ids[2],ids[1],paid]);
    };
    // Keep fixture setup and redemption within one disposable transaction.
    await db.exec('BEGIN');
    await db.query("SELECT set_config('timezone','UTC',true)");
    // PGlite uses the host clock; future runs move only the fixture validity/date.
    const today = (await db.query('SELECT current_date::text AS day')).rows[0].day;
    const date = today <= '2026-11-07' ? '2026-11-07' : today;
    const redeem = () => db.query('SELECT redeem_salon_peche_right($1,$2,\'afternoon\') AS id', [ids[2],date]);
    await db.exec(old);
    await seed(19800);
    await db.exec('SAVEPOINT regression');
    await assert.rejects(redeem(), /reservations_peche_statut_paiement_check/);
    await db.exec('ROLLBACK TO SAVEPOINT regression');
    console.log('PASS historical deposit fails the actual status constraint');
    await db.exec(migration);
    for (const paid of [19800,66000]) {
      await seed(paid);
      await db.query('UPDATE salon_peche_rights SET valid_until=$1', [date]);
      const before = (await db.query('SELECT * FROM salon_sales')).rows;
      const result = await redeem();
      const row = (await db.query('SELECT *,date_sortie::text AS day FROM reservations_peche')).rows[0];
      assert.equal(row.id,result.rows[0].id);
      assert.equal(row.statut_paiement,'paid');
      assert.equal(row.type_paiement,paid === 19800 ? 'deposit' : 'full');
      assert.equal(row.paye,true);
      assert.equal(row.montant_paye,paid);
      assert.equal(row.montant_total,66000);
      assert.equal(row.montant_total-row.montant_paye,66000-paid);
      assert.equal(row.day,date);
      assert.equal(row.formule,'afternoon');
      assert.deepEqual(row.slots,['afternoon']);
      assert.equal(row.nombre_personnes,3);
      assert.deepEqual((await db.query('SELECT * FROM salon_sales')).rows,before);
      assert.equal((await db.query('SELECT status FROM salon_peche_rights')).rows[0].status,'redeemed');
      assert.equal((await db.query('SELECT status FROM boat_calendar_slots')).rows[0].status,'reserved');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM reservations_peche')).rows[0].n,1);
      console.log(`PASS ${paid === 19800 ? 'deposit 19800 / balance 46200' : 'full 66000 / balance 0'}: paid, amounts, date/slot, rights/calendar and unchanged sale/invoice`);
    }
    // The exact function-diff assertion above proves no payment/invoice call was added.
    const route = fs.readFileSync('src/app/api/admin/salon/redeem/route.ts','utf8');
    assert.doesNotMatch(route,/payzen|send.*invoice|create.*payment/i);
    console.log('PASS no new invoice/payment/PayZen call; all other SQL unchanged');
    await db.exec('ROLLBACK');
    console.log('RESULT: targeted in-memory SQL tests passed; production untouched');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
