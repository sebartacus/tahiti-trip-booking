// Own loopback-only temporary PostgreSQL cluster. No application database URL.
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";

const bin = ["C:/Program Files/PostgreSQL/18/bin",resolve("node_modules/@embedded-postgres/windows-x64/native/bin")]
  .find(path=>existsSync(join(path,"psql.exe")));
if (!bin) throw new Error("Exécutables PostgreSQL locaux introuvables.");
const directory = mkdtempSync(join(tmpdir(),"peche-rpc-test-"));
const data = join(directory,"data");
const children = new Set<ChildProcessWithoutNullStreams>();
let port: number, started = false;
const exe = (name: string) => join(bin!,name+".exe");
const quote = (value: unknown) => "'"+String(value).replaceAll("'","''")+"'";
function command(name: string, args: string[]) {
  const result = spawnSync(exe(name),args,{encoding:"utf8",windowsHide:true,timeout:30000,stdio:name==="pg_ctl"?"ignore":"pipe"});
  if(result.error || result.status!==0) throw new Error(name+": "+(result.error?.message || result.stderr));
}
function session(name = "peche-rpc-test") {
  const proc = spawn(exe("psql"),["-X","-qAt","-h","127.0.0.1","-p",String(port),"-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1"],
    {windowsHide:true,env:{...process.env,PGAPPNAME:name,PGCLIENTENCODING:"UTF8",PGPASSWORD:""}});
  children.add(proc);
  let stdout="",stderr="",mark!:()=>void;
  const marker = new Promise<void>(resolve=>{mark=resolve;});
  proc.stdout.on("data",chunk=>{stdout+=chunk.toString();if(stdout.includes("PECHE_LOCK_HELD"))mark();});
  proc.stderr.on("data",chunk=>{stderr+=chunk.toString();});
  const done = new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{
    proc.on("error",reject);
    proc.on("close",code=>{children.delete(proc);resolve({code,stdout:stdout.trim(),stderr});});
  });
  return {proc,done,marker};
}
async function sql(query: string) {
  const s=session();s.proc.stdin.end(query+"\n");
  const result=await s.done;
  assert.equal(result.code,0,result.stderr);return result.stdout;
}
async function main() {
  const socket=createServer();
  await new Promise<void>(resolve=>socket.listen(0,"127.0.0.1",resolve));
  const address=socket.address();assert.ok(address&&typeof address!=="string");port=address.port;
  await new Promise<void>(resolve=>socket.close(()=>resolve()));
  command("initdb",["-D",data,"-U","postgres","-A","trust","--encoding=UTF8","--locale=C"]);
  started=true;
  command("pg_ctl",["-D",data,"-l",join(directory,"postgres.log"),"-o","-h 127.0.0.1 -p "+port,"-w","start"]);
  await sql("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;");
  await sql(readFileSync("supabase/migrations/202606290001_create_reservations_peche.sql","utf8"));
  await sql(readFileSync("supabase/migrations/202607060001_add_boat_reservation_email_status.sql","utf8").split("alter table public.reservations_baleines")[0]);
  const calendar=readFileSync("supabase/migrations/202606280003_create_boat_calendar_slots.sql","utf8");
  await sql(calendar.slice(0,calendar.indexOf("insert into public.boat_calendar_slots")));
  await sql(`ALTER TABLE boat_calendar_slots ADD COLUMN expires_at timestamptz;
    CREATE TABLE reservations_baleines(id uuid PRIMARY KEY,paye boolean,statut_paiement text);
    CREATE TABLE salon_sales(id uuid PRIMARY KEY,payment_method text,montant_total int,montant_encaisse int,montant_solde int,facture_numero text,facture_url text,facture_generee_at timestamptz);
    CREATE TABLE salon_sale_items(id uuid PRIMARY KEY,sale_id uuid,reservation_type text,reservation_id text,offer_code text,libelle text,valid_until date);`);
  await sql(readFileSync("supabase/migrations/202610010001_peche_date_change_invoices.sql","utf8"));
  const first="11111111-1111-4111-8111-111111111111",second="22222222-2222-4222-8222-222222222222";
  for(const formula of ["morning","full_day"]) {
    await sql("TRUNCATE factures_peche,boat_calendar_slots,reservations_peche;");
    const slots=formula==="full_day"?["morning","afternoon"]:["morning"];
    for(const [id,date] of [[first,"2099-10-25"],[second,"2099-10-26"]]) {
      await sql(`INSERT INTO reservations_peche(id,date_sortie,formule,slots,nombre_personnes,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,montant_total,montant_paye,type_paiement,statut_paiement,paye)
        VALUES(${quote(id)},${quote(date)},${quote(formula)},array[${slots.map(quote).join(",")}],2,'Test','Client','test@example.invalid','000',95000,28500,'deposit','paid',true);`);
      for(const slot of slots)await sql(`INSERT INTO boat_calendar_slots(date,slot,status,activity,reservation_id,reservation_table)
        VALUES(${quote(date)},${quote(slot)},'reserved','peche',${quote(id)},'reservations_peche');`);
    }
    const preparedA=await sql(`SELECT prepare_peche_date_change('${first}','2099-10-27','2099-10-25');`);
    const preparedB=await sql(`SELECT prepare_peche_date_change('${second}','2099-10-27','2099-10-26');`);
    const a=session("peche-first");
    a.proc.stdin.write(`BEGIN; SELECT move_peche_reservation('${first}','2099-10-27','2099-10-25',${quote(preparedA)}::jsonb);\n\\echo PECHE_LOCK_HELD\n`);
    await Promise.race([a.marker,a.done.then(r=>{throw new Error(r.stderr);})]);
    const b=session("peche-second");
    b.proc.stdin.end(`SELECT move_peche_reservation('${second}','2099-10-27','2099-10-26',${quote(preparedB)}::jsonb);\n`);
    let waiting=false;
    for(let i=0;i<40;i++){
      if(await sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='peche-second' AND wait_event_type='Lock';")==="1"){waiting=true;break;}
      await new Promise(resolve=>setTimeout(resolve,25));
    }
    a.proc.stdin.end("COMMIT;\n");
    const [winner,loser]=await Promise.all([a.done,b.done]);
    assert.ok(waiting,"Second session must wait on the RPC lock");
    assert.equal(winner.code,0,winner.stderr);assert.notEqual(loser.code,0);assert.match(loser.stderr,/indisponible/);
    assert.equal(await sql("SELECT count(*) FROM boat_calendar_slots WHERE date='2099-10-27' AND reservation_id='"+first+"';"),String(slots.length));
    assert.equal(await sql("SELECT date_sortie::text||','||montant_paye||','||statut_paiement FROM reservations_peche WHERE id='"+second+"';"),"2099-10-26,28500,paid");
    console.log("PASS RPC "+formula+": independent connections, lock wait, one winner, loser unchanged.");
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
  for(const child of children)child.kill();
  if(started)command("pg_ctl",["-D",data,"-m","immediate","-w","stop"]);
  console.log("Local test server stopped: "+directory);
});
