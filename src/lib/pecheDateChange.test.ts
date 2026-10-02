import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { before, after, beforeEach } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { movePecheWithInvoice, type PecheMoveDatabase, type PecheMoveStorage } from "./pecheDateChange";
import { buildPecheInvoicePdf, getPecheInvoiceNumber } from "./pecheInvoice";

const db = new PGlite();
const migration = readFileSync("supabase/migrations/202610010001_peche_date_change_invoices.sql", "utf8");
const oldDate = "2099-10-26", newDate = "2099-10-27";
const id = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const files = new Map<string, Buffer>();
const removed: string[] = [];
const storage: PecheMoveStorage = {
  async assertExists(path) { assert.ok(files.has(path), "PDF source absent"); },
  async upload(path, pdf) { assert.ok(!files.has(path), "écrasement interdit"); files.set(path, pdf); },
  async remove(path) { removed.push(path); files.delete(path); },
};
const adapter: PecheMoveDatabase = {
  async rpc(name, params) {
    const allowed = ["prepare_peche_date_change","move_peche_reservation","check_peche_date_change"];
    assert.ok(allowed.includes(name));
    const args = [params.p_reservation_id,params.p_date,params.p_expected_date];
    if (name === "move_peche_reservation") args.push(params.p_prepared);
    try {
      const { rows } = await db.query<{ context: unknown }>(
        `SELECT public.${name}($1::uuid,$2::date,$3::date${args.length === 4 ? ",$4::jsonb" : ""}) AS context`,args);
      return { data: rows[0].context, error: null };
    } catch (error) {
      const failure = error as { code?: string; message: string };
      return { data: null, error: { code: failure.code, message: failure.message } };
    }
  },
};
async function row(sql: string, args: unknown[] = []) { return (await db.query<Record<string, unknown>>(sql, args)).rows[0]; }
async function snapshot() {
  return row(`SELECT (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM reservations_peche r) AS reservations,
    (SELECT jsonb_agg(to_jsonb(c) ORDER BY date,slot) FROM boat_calendar_slots c) AS calendar,
    (SELECT jsonb_agg(to_jsonb(f) ORDER BY id) FROM factures_peche f) AS invoices`);
}
async function seed(formula = "morning", invoice = true, reservationId = id, date = oldDate, people = 2) {
  const slots = formula === "full_day" ? ["morning","afternoon"] : [formula];
  await db.query(`INSERT INTO reservations_peche
    (id,date_sortie,formule,slots,nombre_personnes,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,
    montant_total,montant_paye,type_paiement,statut_paiement,paye,facture_numero,facture_url)
    VALUES($1,$2,$3,$4,$5,'Client','Test','test@example.invalid','000',95000,28500,'deposit','paid',true,$6,$7)`,
    [reservationId,date,formula,slots,people,invoice ? "PEC-2026-111111" : null,invoice ? "factures/peche/PEC-2026-111111.pdf" : null]);
  for (const slot of slots) await db.query(`INSERT INTO boat_calendar_slots(date,slot,status,activity,reservation_id,reservation_table)
    VALUES($1,$2,'reserved','peche',$3,'reservations_peche') ON CONFLICT(date,slot) DO NOTHING`,[date,slot,reservationId]);
  if (invoice) files.set("factures/peche/PEC-2026-111111.pdf", Buffer.from("ORIGINAL PDF"));
}
async function move(reservationId = id, date = newDate, expectedDate = oldDate, store = storage, connection = adapter) {
  return movePecheWithInvoice(connection, store, { reservationId, date, expectedDate });
}
before(async () => {
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;");
  await db.exec(readFileSync("supabase/migrations/202606290001_create_reservations_peche.sql","utf8"));
  await db.exec(readFileSync("supabase/migrations/202607060001_add_boat_reservation_email_status.sql","utf8").split("alter table public.reservations_baleines")[0]);
  await db.exec(readFileSync("supabase/migrations/202607080001_add_manual_peche_reservations.sql","utf8"));
  const calendar = readFileSync("supabase/migrations/202606280003_create_boat_calendar_slots.sql","utf8");
  await db.exec(calendar.slice(0,calendar.indexOf("insert into public.boat_calendar_slots")));
  await db.exec(`ALTER TABLE boat_calendar_slots ADD COLUMN expires_at timestamptz;
    CREATE TABLE reservations_baleines(id uuid PRIMARY KEY,paye boolean,statut_paiement text);
    CREATE TABLE salon_sales(id uuid PRIMARY KEY, payment_method text,montant_total int,montant_encaisse int,montant_solde int,
      facture_numero text,facture_url text,facture_generee_at timestamptz);
    CREATE TABLE salon_sale_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sale_id uuid REFERENCES salon_sales,
      reservation_type text,reservation_id text,offer_code text,libelle text,valid_until date);`);
  await db.exec(migration);
});
beforeEach(async () => {
  await db.exec("TRUNCATE factures_peche,boat_calendar_slots,reservations_peche,salon_sale_items,salon_sales;");
  files.clear(); removed.length = 0;
});
after(async () => { await db.close(); });

test("demi-journée : même réservation, paiement/client identiques, ancien créneau libéré, historique et PDF remplacé", async () => {
  await seed();
  const previous = await row("SELECT to_jsonb(r) AS r FROM reservations_peche r WHERE id=$1",[id]);
  const oldPdf = Buffer.from(files.values().next().value!);
  const result = await move();
  assert.match(result.invoiceNumber!, /^PEC-R-\d{4}-\d+$/);
  assert.notEqual(result.invoiceNumber, getPecheInvoiceNumber(id));
  const current = await row("SELECT to_jsonb(r) AS r FROM reservations_peche r WHERE id=$1",[id]);
  const before = previous.r as Record<string,unknown>, after = current.r as Record<string,unknown>;
  const allowed = ["date_sortie","facture_numero","facture_url"];
  assert.deepEqual(Object.fromEntries(Object.entries(after).filter(([k])=>!allowed.includes(k))),
    Object.fromEntries(Object.entries(before).filter(([k])=>!allowed.includes(k))));
  assert.equal(after.date_sortie,newDate);
  assert.equal((await row("SELECT status FROM boat_calendar_slots WHERE date=$1",[oldDate])).status,"available");
  const destination = await row("SELECT * FROM boat_calendar_slots WHERE date=$1",[newDate]);
  assert.equal(destination.reservation_id,id); assert.equal(destination.status,"reserved");
  assert.equal(destination.expires_at,null);
  const invoices = (await db.query<Record<string,unknown>>("SELECT * FROM factures_peche ORDER BY created_at,id")).rows;
  assert.equal(invoices.length,2);
  const archived = invoices.find(f=>f.numero==="PEC-2026-111111")!;
  const replacement = invoices.find(f=>f.numero===result.invoiceNumber)!;
  assert.equal(replacement.remplace_facture_id,archived.id);
  assert.equal(archived.date_emission,null);
  assert.equal(replacement.pdf_path,after.facture_url);
  assert.deepEqual(files.get(before.facture_url as string),oldPdf);
  const pdf = files.get(after.facture_url as string)!.toString("latin1");
  assert.ok(pdf.includes(result.invoiceNumber!));
  assert.ok(pdf.includes("Annule et remplace la facture n° PEC-2026-111111"));
  assert.ok(pdf.includes("Date de sortie : "+newDate));
  assert.ok(pdf.includes("28 500"));
  assert.deepEqual(removed,[]);
});
test("full_day réserve les deux nouveaux slots et libère les deux anciens", async () => {
  await seed("full_day",false); await move();
  const slots = (await db.query<Record<string,unknown>>("SELECT * FROM boat_calendar_slots WHERE date=$1 ORDER BY slot",[newDate])).rows;
  assert.equal(slots.length,2);
  assert.ok(slots.every(s=>s.reservation_id===id && s.status==="reserved"));
  assert.equal((await row("SELECT count(*)::int AS n FROM boat_calendar_slots WHERE date=$1 AND status='available'",[oldDate])).n,2);
  assert.equal(files.size,0);
});
test("full_day : après-midi occupé, rollback total y compris morning absent", async () => {
  await seed("full_day");
  await db.query("INSERT INTO boat_calendar_slots(date,slot,status) VALUES($1,'afternoon','blocked')",[newDate]);
  const before = await snapshot();
  await assert.rejects(move(), /indisponible/);
  assert.deepEqual(await snapshot(),before); assert.equal(files.size,1);
});
test("échec upload : date, calendrier et historique entièrement annulés", async () => {
  await seed(); const before = await snapshot();
  await assert.rejects(move(id,newDate,oldDate,{...storage,async upload(){throw new Error("upload failed");}}), /upload failed/);
  assert.deepEqual(await snapshot(),before); assert.equal(files.size,1); assert.deepEqual(removed,[]);
});
test("échec SQL après déplacement interne : rollback RPC et suppression du seul nouveau PDF", async () => {
  await seed(); const before = await snapshot();
  await db.exec(`CREATE FUNCTION test_reject_replacement() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.remplace_facture_id IS NOT NULL THEN RAISE EXCEPTION 'finalization failed' USING ERRCODE='23514'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER reject_replacement BEFORE INSERT ON factures_peche FOR EACH ROW EXECUTE FUNCTION test_reject_replacement();`);
  try {
    await assert.rejects(move(), /finalization failed/);
    assert.deepEqual(await snapshot(),before);
    assert.equal(files.size,1); assert.equal(removed.length,1); assert.match(removed[0], /remplacements\/PEC-R-/);
  } finally {
    await db.exec("DROP TRIGGER reject_replacement ON factures_peche; DROP FUNCTION test_reject_replacement();");
  }
});

test("ancien PDF absent : aucun déplacement", async () => {
  await seed(); files.clear(); const before = await snapshot();
  await assert.rejects(move(), /PDF source absent/); assert.deepEqual(await snapshot(),before);
});
test("deux déplacements successifs : chaîne historique et trois PDF conservés", async () => {
  await seed(); const first = await move();
  const second = await move(id,"2099-10-28",newDate);
  assert.notEqual(first.invoiceNumber,second.invoiceNumber);
  assert.equal((await row("SELECT count(*)::int AS n FROM factures_peche")).n,3);
  assert.equal(files.size,3);
  const current = await row("SELECT facture_numero FROM reservations_peche WHERE id=$1",[id]);
  assert.equal(current.facture_numero,second.invoiceNumber);
});
test("prévisualisation sans écriture et confirmation périmée refusée", async () => {
  await seed(); const before = await snapshot();
  await db.query("SELECT public.check_peche_date_change($1,$2,$3)",[id,newDate,oldDate]);
  assert.deepEqual(await snapshot(),before);
  await move();
  const moved = await snapshot();
  await assert.rejects(move(id,"2099-10-28",oldDate), /a changé/);
  assert.deepEqual(await snapshot(),moved);
});
test("requêtes concurrentes sur dernier slot : une seule gagne (file PostgreSQL PGlite)", async () => {
  await seed("morning",false);
  await seed("morning",false,secondId,"2099-10-25");
  const results = await Promise.allSettled([
    move(id,newDate,oldDate),
    move(secondId,newDate,"2099-10-25"),
  ]);
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
  assert.equal(results.filter(r=>r.status==="rejected").length,1);
  assert.equal((await row("SELECT count(*)::int AS n FROM reservations_peche WHERE date_sortie=$1",[newDate])).n,1);
});
async function shared(reservationId: string) {
  await db.query(`INSERT INTO salon_sales(id,payment_method,montant_total,montant_encaisse,montant_solde)
    VALUES($1,'tpe',28500,28500,0)`,[reservationId]);
  await db.query(`INSERT INTO salon_sale_items(sale_id,reservation_type,reservation_id,offer_code,libelle,valid_until)
    VALUES($1,'reservations_peche',$2,'peche_place_morning','Place Pêche','2099-12-31')`,[reservationId,reservationId]);
}
test("Salon partagé : ancien blocage réattribué au client restant", async () => {
  await seed("morning",false,id,oldDate,1); await seed("morning",false,secondId,oldDate,1);
  await shared(id); await shared(secondId); await move();
  const old = await row("SELECT * FROM boat_calendar_slots WHERE date=$1",[oldDate]);
  assert.equal(old.status,"reserved"); assert.equal(old.reservation_id,secondId);
  assert.equal((await row("SELECT date_sortie::text AS d FROM reservations_peche WHERE id=$1",[secondId])).d,oldDate);
});
test("Salon : capacité 4 et privatisation respectées", async () => {
  await seed("morning",false,id,oldDate,2); await shared(id);
  await seed("morning",false,secondId,newDate,3); await shared(secondId);
  const before = await snapshot();
  await assert.rejects(move(), /Capacité/); assert.deepEqual(await snapshot(),before);
  await db.query("UPDATE reservations_peche SET nombre_personnes=2 WHERE id=$1",[secondId]);
  await move();
  assert.equal((await row("SELECT sum(nombre_personnes)::int AS n FROM reservations_peche WHERE date_sortie=$1",[newDate])).n,4);
});
test("Salon : privatisation interdit un créneau partagé", async () => {
  await seed("morning",false,id,oldDate,1); await shared(id);
  await seed("morning",false,secondId,newDate,1);
  await assert.rejects(move(), /privatisation/);
});
test("holds : expiré libéré, payé actif bloquant, impayé actif libérable", async () => {
  await seed("morning",false);
  await db.query(`INSERT INTO boat_calendar_slots(date,slot,status,activity,reservation_id,reservation_table,expires_at)
    VALUES($1,'morning','hold','peche',$2,'reservations_peche',now()-interval '1 minute')`,[newDate,secondId]);
  await move();
  await db.query("UPDATE boat_calendar_slots SET status='hold',expires_at=now()+interval '30 minutes' WHERE date=$1",[newDate]);
  await seed("morning",false,secondId,"2099-10-25");
  await assert.rejects(move(secondId,newDate,"2099-10-25"), /indisponible/);
  await db.query("UPDATE reservations_peche SET paye=false,statut_paiement='pending' WHERE id=$1",[id]);
  await move(secondId,newDate,"2099-10-25");
});
test("ancienne numérotation dupliquée permise, série nouvelle unique, RPC non publiques", async () => {
  await seed();
  await db.query(`INSERT INTO factures_peche(reservation_id,numero,pdf_path,date_sortie)
    VALUES($1,'PEC-2026-111111','legacy-a.pdf',$2),($1,'PEC-2026-111111','legacy-b.pdf',$2)`,[id,oldDate]);
  await db.query(`INSERT INTO factures_peche(reservation_id,numero,pdf_path,date_sortie) VALUES($1,'PEC-R-2099-999','new-a.pdf',$2)`,[id,oldDate]);
  await assert.rejects(db.query(`INSERT INTO factures_peche(reservation_id,numero,pdf_path,date_sortie) VALUES($1,'PEC-R-2099-999','new-b.pdf',$2)`,[id,oldDate]), /duplicate/);
  const permissions = await row(`SELECT has_function_privilege('anon','public.move_peche_reservation(uuid,date,date,jsonb)','EXECUTE') AS a,
    has_function_privilege('authenticated','public.check_peche_date_change(uuid,date,date)','EXECUTE') AS b,
    has_function_privilege('service_role','public.move_peche_reservation(uuid,date,date,jsonb)','EXECUTE') AS s`);
  assert.deepEqual(permissions,{a:false,b:false,s:true});
});
test("PDF existant sans options : numérotation historique conservée", () => {
  const invoice = buildPecheInvoicePdf({id,date_sortie:oldDate,formule:"morning",slots:["morning"],nombre_personnes:2,
    responsable_prenom:"A",responsable_nom:"B",responsable_email:null,responsable_telephone:null,montant_paye:28500},new Date("2026-10-01T12:00:00Z"));
  assert.equal(invoice.invoiceNumber,getPecheInvoiceNumber(id,new Date("2026-10-01T12:00:00Z")));
  assert.ok(!invoice.pdf.toString("latin1").includes("Annule et remplace"));
});

test("RPC validée mais réponse perdue : PDF conservé et résultat signalé indéterminé", async () => {
  await seed();
  const ambiguous: PecheMoveDatabase = { async rpc(name,args) {
    const result = await adapter.rpc(name,args);
    if (name === "move_peche_reservation" && !result.error) throw new Error("response lost after commit");
    return result;
  }};
  await assert.rejects(move(id,newDate,oldDate,storage,ambiguous), /Confirmation interrompue/);
  assert.equal((await row("SELECT date_sortie::text AS d FROM reservations_peche WHERE id=$1",[id])).d,newDate);
  assert.equal(files.size,2); assert.deepEqual(removed,[]);
});

test("Salon facturé : référence courante et date d'émission archivées, totaux inchangés", async () => {
  await seed(); await shared(id);
  await db.query(`UPDATE salon_sales SET facture_numero='PEC-2026-111111',facture_url='factures/peche/PEC-2026-111111.pdf',
    facture_generee_at='2026-10-01T12:00:00Z',montant_total=95000,montant_encaisse=28500,montant_solde=66500 WHERE id=$1`,[id]);
  const result = await move();
  const sale = await row("SELECT * FROM salon_sales WHERE id=$1",[id]);
  assert.equal(sale.facture_numero,result.invoiceNumber);
  assert.equal(sale.montant_total,95000); assert.equal(sale.montant_encaisse,28500); assert.equal(sale.montant_solde,66500);
  const old = await row("SELECT date_emission FROM factures_peche WHERE numero='PEC-2026-111111'");
  assert.equal(new Date(old.date_emission as string).toISOString(),"2026-10-01T12:00:00.000Z");
  const pdf = files.get(sale.facture_url as string)!.toString("latin1");
  assert.ok(pdf.includes("95 000")); assert.ok(pdf.includes("28 500")); assert.ok(pdf.includes("66 500"));
});
test("route admin : GET/POST publics refusés avant toute connexion", async () => {
  const { GET, POST } = await import("../app/api/admin/peche/change-date/route");
  assert.equal((await GET(new Request("http://localhost/api/admin/peche/change-date"))).status,401);
  assert.equal((await POST(new Request("http://localhost/api/admin/peche/change-date",{method:"POST",body:"{}"}))).status,401);
  const { createAdminSessionToken, ADMIN_SESSION_COOKIE } = await import("./adminSession");
  const headers = { cookie: ADMIN_SESSION_COOKIE+"="+createAdminSessionToken(), "Content-Type":"application/json" };
  assert.equal((await POST(new Request("http://localhost/api/admin/peche/change-date",{method:"POST",headers,
    body:JSON.stringify({reservationId:id,date:"2099-02-31",expectedDate:oldDate})}))).status,400);
});

test("dernier client partagé : libération même si le calendrier pointe vers un ancien participant", async () => {
  await seed("morning",false); await shared(id);
  await db.query("UPDATE boat_calendar_slots SET reservation_id=$1 WHERE date=$2",[secondId,oldDate]);
  await move();
  assert.equal((await row("SELECT status FROM boat_calendar_slots WHERE date=$1",[oldDate])).status,"available");
});

test("préparation : aucun déplacement ni archivage avant stockage, numéro consommé distinct", async () => {
  await seed(); const before = await snapshot();
  const one = await adapter.rpc("prepare_peche_date_change",{p_reservation_id:id,p_date:newDate,p_expected_date:oldDate});
  const two = await adapter.rpc("prepare_peche_date_change",{p_reservation_id:id,p_date:newDate,p_expected_date:oldDate});
  assert.deepEqual(await snapshot(),before);
  assert.notEqual((one.data as {invoice_number:string}).invoice_number,(two.data as {invoice_number:string}).invoice_number);
});
test("destination occupée pendant upload : revalidation RPC, aucun déplacement, nouveau PDF nettoyé", async () => {
  await seed("full_day");
  await assert.rejects(move(id,newDate,oldDate,{
    ...storage, async upload(path,pdf) {
      await storage.upload(path,pdf);
      await db.query("INSERT INTO boat_calendar_slots(date,slot,status) VALUES($1,'afternoon','blocked')",[newDate]);
    },
  }), /indisponible/);
  assert.equal((await row("SELECT date_sortie::text AS d FROM reservations_peche WHERE id=$1",[id])).d,oldDate);
  assert.equal((await row("SELECT count(*)::int AS n FROM boat_calendar_slots WHERE date=$1 AND status='reserved'",[oldDate])).n,2);
  assert.equal((await row("SELECT count(*)::int AS n FROM boat_calendar_slots WHERE date=$1 AND slot='morning'",[newDate])).n,0);
  assert.equal((await row("SELECT count(*)::int AS n FROM factures_peche")).n,0);
  assert.equal(files.size,1);
});
test("données client modifiées après préparation : PDF périmé refusé, références intactes", async () => {
  await seed();
  await assert.rejects(move(id,newDate,oldDate,{
    ...storage, async upload(path,pdf) {
      await storage.upload(path,pdf);
      await db.query("UPDATE reservations_peche SET responsable_nom='Nouveau nom' WHERE id=$1",[id]);
    },
  }), /a changé/);
  const current = await row("SELECT date_sortie::text AS d,responsable_nom,facture_numero FROM reservations_peche WHERE id=$1",[id]);
  assert.deepEqual(current,{d:oldDate,responsable_nom:"Nouveau nom",facture_numero:"PEC-2026-111111"});
  assert.equal(files.size,1);
});
test("après-midi seul : conserve le créneau, sans réserver le matin", async () => {
  await seed("afternoon",false); await move();
  const slots = (await db.query<{slot:string}>("SELECT slot FROM boat_calendar_slots WHERE date=$1",[newDate])).rows;
  assert.deepEqual(slots,[{slot:"afternoon"}]);
});
