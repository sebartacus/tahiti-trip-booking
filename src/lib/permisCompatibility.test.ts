import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createAdminSessionToken, ADMIN_SESSION_COOKIE } from "./adminSession";
import { GET as list } from "../app/api/admin/permis/route";
import { GET as availability } from "../app/api/permis/disponibilites/route";
import { POST as document } from "../app/api/admin/documents/route";
import { PATCH as status } from "../app/api/admin/permis/[id]/route";
import { POST as access } from "../app/api/permis/reprise/access/route";
import { POST as purchase } from "../app/api/permis/reservation/route";
import { compteursPermis, rechercherPermis } from "./permisPlanning";

async function main() {
  process.env.ADMIN_SESSION_SECRET = "compatibility-test-secret-0123456789";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://compatibility.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-key-test-only";
  process.env.PAYMENT_INTENT_SECRET = "test-payment-secret";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-only";
  const { POST: salon } = await import("../app/api/admin/permis/salon/route");
  const { POST: newSalon } = await import("../app/api/admin/salon/route");
  const token = createAdminSessionToken();
  const request = (body?: unknown, admin = true) => new Request("https://app.invalid/api", {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(admin ? { cookie: ADMIN_SESSION_COOKIE + "=" + token } : {}), "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let mode = "list", updates: Record<string, unknown>[] = [], signatures = 0, calls = 0, uploads = 0;
  let createdRow: Record<string, unknown> = {};
  const realFetch = globalThis.fetch;
  const candidate = { id: 52, prenom: "Alice", nom: "Test", prenom2: "Bob", nom2: "Test", email: "private@example.invalid", telephone: "secret-phone", examen: "Plus tard", date_cours: null, archived: false, statut: "Validé", facture_url: "factures/permis/existing.pdf", certificat_url: "existing-certificate.pdf" };
  const json = (value: unknown, code = 200, extra: Record<string,string> = {}) => new Response(JSON.stringify(value), { status: code, headers: { "Content-Type": "application/json", ...extra } });
  globalThis.fetch = async (input, init) => {
    calls++;
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("apikey"),"server-key-test-only");
    assert.equal(url.host,"compatibility.invalid"); // No real network allowed.
    if (url.pathname.startsWith("/storage/v1/object/documents-permis/")) {
      uploads++;
      assert.ok(Buffer.isBuffer(init?.body));
      assert.equal((init!.body as Buffer).subarray(0,5).toString(),"%PDF-");
      return json({ Key: "existing.pdf" });
    }
    if (url.pathname.endsWith("/rpc/create_salon_permis_sale")) {
      const input = JSON.parse(String(init?.body));
      createdRow = {id:100,prenom:input.p_prenom,nom:input.p_nom,email:null,telephone:input.p_telephone,formule:input.p_formula,examen:input.p_examen,date_cours:null,pricing_amount:input.p_price,pricing_type:"salon_tourisme",mode_paiement:input.p_payment_method};
      return json([{sale_id:"sale-test",reservation_id:"100",item_id:"item-test"}]);
    }
    if (url.pathname.endsWith("/salon_sale_items")) return json({valid_until:"2027-03-06"});
    if (url.pathname.endsWith("/salon_sales") && init?.method === "PATCH") return json({});
    if (url.pathname.startsWith("/storage/v1/object/sign/")) {
      signatures++;
      assert.ok(url.pathname.endsWith("existing-certificate.pdf") || url.pathname.endsWith("factures/permis/existing.pdf"));
      return json({ signedURL: "/object/sign/documents-permis/allowed.pdf?token=test" });
    }
    if (url.pathname.endsWith("/examens_bloques")) return json([{date_examen:"2026-09-16",motif:"must-not-leak"}]);
    if (url.pathname.endsWith("/reservations")) {
      if (init?.method === "PATCH") {
        const update = JSON.parse(String(init.body));
        if (mode === "salon" || mode === "newSalon") {
          assert.deepEqual(Object.keys(update).sort(),["facture_numero","facture_url"]);
          return json({});
        }
        updates.push(update);
        assert.deepEqual(Object.keys(update).sort(),["date_reussite_examen","statut"]);
        return json({id:52,...update});
      }
      if (init?.method === "POST") {
        assert.ok(mode === "purchase" || mode === "salon");
        const inserted = JSON.parse(String(init.body));
        assert.equal(inserted.prenom,"Alice");
        if (mode === "salon") { createdRow = {id:99,...inserted}; return json(createdRow); }
        assert.equal(inserted.paiement_effectue,false);
        return json({id:99,pricing_amount:inserted.pricing_amount,pricing_type:inserted.pricing_type});
      }
      if (url.searchParams.get("select")==="creneau") {
        assert.equal(url.searchParams.get("date_cours"),"eq.15/09/2026");
        return json([{creneau:"07h00 - 09h00",email:"must-not-leak"},{creneau:"07h00 - 09h00"},{creneau:"private@example.invalid"},{creneau:null}],200,{"Content-Range":"0-3/4"});
      }
      if (mode === "newSalon") return json(createdRow);
      if (mode==="missing") return json([]);
      if (mode==="db-error") return json({message:"sensitive-backend-error"},500);
      return json([candidate],200,{"Content-Range":"0-0/1"});
    }
    throw new Error("Unexpected backend request: "+url.pathname);
  };
  try {
    assert.equal((await list(request(undefined,false))).status,401);
    assert.equal((await document(request({reservationId:52,field:"facture_url"},false))).status,401);
    assert.equal((await status(request({action:"status",statut:"Validé"},false),{params:Promise.resolve({id:"52"})})).status,401);
    assert.equal(calls,0);
    const listed=await list(request());
    assert.equal(listed.status,200);
    assert.equal(listed.headers.get("cache-control"),"no-store");
    const payload=await listed.json();
    assert.deepEqual(payload.reservations,[candidate]);
    assert.deepEqual(compteursPermis(payload.reservations),{sansDates:2,sansExamen:2,sansCours:2,incomplets:1});
    assert.equal(rechercherPermis(payload.reservations[0],"Bob"),true);

    const available=await availability(new Request("https://app.invalid/api?date=2026-09-15"));
    assert.equal(available.status,200);
    assert.deepEqual(await available.json(),{blockedExams:["2026-09-16"],occupiedSlots:["07h00 - 09h00"]});
    assert.equal((await availability(new Request("https://app.invalid/api?date=2026-02-31"))).status,400);
    assert.equal((await availability(new Request("https://app.invalid/api?date=15/09/2026"))).status,400);
    assert.deepEqual(await (await availability(new Request("https://app.invalid/api"))).json(),{blockedExams:["2026-09-16"],occupiedSlots:[]});

    for(const field of ["certificat_url","facture_url"]) {
      const opened=await document(request({reservationId:52,field}));
      assert.equal(opened.status,200);
      assert.ok((await opened.json()).signedUrl.includes("token=test"));
    }
    assert.equal(signatures,2);
    assert.equal((await document(request({reservationId:52,field:"facture_url",path:"arbitrary.pdf"}))).status,400);
    assert.equal((await document(request({reservationId:52,field:"email"}))).status,400);
    mode="missing";
    assert.equal((await document(request({reservationId:1234,field:"facture_url"}))).status,404);
    assert.equal(signatures,2);
    mode="list";

    for(const statut of ["En attente","Validé","Incomplet","Permis obtenu"]) {
      const changed=await status(request({action:"status",statut}),{params:Promise.resolve({id:"52"})});
      assert.equal(changed.status,200);
      const update=updates.at(-1)!;
      assert.equal(update.statut,statut);
      if(statut==="Permis obtenu") assert.match(String(update.date_reussite_examen),/^\d{2}\/\d{2}\/\d{4}$/);
      else assert.equal(update.date_reussite_examen,null);
    }
    assert.equal((await status(request({action:"status",statut:"Hacked"}),{params:Promise.resolve({id:"52"})})).status,400);
    assert.equal((await status(request({action:"status",statut:"Validé",paiement_effectue:true}),{params:Promise.resolve({id:"52"})})).status,400);
    assert.equal(updates.length,4);
    mode="db-error";
    const failed=await list(request());
    assert.equal(failed.status,500);
    assert.ok(!(await failed.text()).includes("sensitive-backend-error"));

    mode="purchase";
    const bought=await purchase(request({prenom:"Alice",nom:"Test",email:"test@example.invalid",telephone:"000000",formule:"Classique",nombreParticipants:1,examen:"Plus tard"}));
    assert.equal(bought.status,201);
    mode="salon";
    const sale=await salon(request({prenom:"Alice",nom:"Test",telephone:"000000",email:"",formule:"Classique",examen:"Plus tard",cours_plus_tard:true,mode_paiement:"especes"}));
    assert.equal(sale.status,201);
    assert.ok((await sale.json()).reservation.facture_url.startsWith("factures/permis/"));
    mode="newSalon";
    const newSale=await newSalon(request({offerCode:"permis_classique",firstName:"Alice",lastName:"Test",phone:"000000",email:"",paymentMethod:"especes",bookingLater:true}));
    assert.equal(newSale.status,201);
    assert.ok((await newSale.json()).invoiceNumber);
    assert.equal(uploads,2);
    // All writes and invoice uploads above target only the fake fetch implementation.
    assert.equal((await salon(request({},false))).status,401);
    assert.equal((await newSalon(request({},false))).status,401);
    delete process.env.PERMIS_REPRISE_ACCESS_ENABLED;
    assert.equal((await access(request({action:"request",email:"test@example.invalid"}))).status,503);
  } finally { globalThis.fetch=realFetch; }

  for(const file of [
    "src/app/reprendre-reservation/page.tsx",
    "src/app/api/permis/reservation/route.ts",
    "src/app/api/admin/permis/salon/route.ts",
    "src/app/api/admin/salon/route.ts",
    "src/app/api/payzen/route.ts",
    "src/app/api/payzen-notification/route.ts",
    "src/lib/permisInvoice.ts","src/lib/permisPricing.ts",
    "src/app/admin/components/SuiviPermis.tsx","src/lib/permisPlanning.ts",
    "src/app/api/permis/reprise/access/route.ts"
  ]) {
    const before=execFileSync("git",["show","HEAD:"+file],{encoding:"utf8"}).replace(/\r\n/g,"\n");
    assert.equal(readFileSync(file,"utf8").replace(/\r\n/g,"\n"),before,"Unchanged: "+file);
  }
  for(const file of ["src/app/permis/page.tsx","src/app/admin/permis/nouvelle-reservation/page.tsx"]) {
    const source=readFileSync(file,"utf8");
    assert.ok(!source.includes("supabase"));
    assert.ok(source.includes("/api/permis/disponibilites"));
  }
  console.log("Compatibilité Permis : routes, autorisations, statuts, documents, disponibilités sans PII et invariants existants OK.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
