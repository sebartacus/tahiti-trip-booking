/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS isolated test harness. */
// Isolated API, email and UI checks: no real database, email or payment calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, resolve, extra = {}) {
  const loaded = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  }}).outputText;
  vm.runInNewContext(source, { module: loaded, exports: loaded.exports, require: resolve, Buffer, ...extra });
  return loaded.exports;
}
const id = '88f2f4e8-d84b-46d9-8353-af983886a304';
const initial = { id, date_sortie: '2026-12-24', responsable_prenom: '<Client>',
  responsable_email: 'client@example.com', facture_numero: 'PEC-R-2026-42', facture_url: 'peche/current-replacement.pdf' };
const pdf = Buffer.from('%PDF-1.7 Annule et remplace CURRENT');
let authenticated = true, row, dbError, downloadError, content, resendResult, thrown, reads, downloads, sends;
function reset() { row = { ...initial }; dbError = downloadError = thrown = null; content = pdf; resendResult = {ok:true}; reads=[]; downloads=[]; sends=[]; }
const route = load('src/app/api/admin/peche/send-invoice/route.ts', name => {
  if (name === 'next/server') return require(name);
  if (name === '@/lib/adminSession') return {verifyAdminSession: () => authenticated};
  if (name === '@/lib/pecheEmail') return {sendPecheInvoiceEmail: async input => {sends.push(input); if(thrown) throw thrown; return resendResult;}};
  if (name === '@/lib/salonAdmin') return { getSalonAdminClient: () => ({
    from: table => { assert.equal(table,'reservations_peche'); return {
      select: columns => { assert.ok(columns.includes('facture_url')); return {
        eq: (key,value) => {assert.equal(key,'id'); reads.push(value); return {maybeSingle:async()=>({data:row,error:dbError})};}
      };}
    };},
    storage: {from: bucket => {assert.equal(bucket,'documents-permis');return {download:async path => { downloads.push(path);return {error:downloadError,data:new Blob([content])};}};}}
  })};
  throw Error('Unexpected dependency: '+name);
}, {Blob});
const request = (body = {reservationId:id, facture_url:'archive/old.pdf', email:'attacker@example.com'}) => new Request('http://local/api/admin/peche/send-invoice', {method:'POST',body:JSON.stringify(body)});
let checks=0;
async function status(expected, req=request()) {const res=await route.POST(req);assert.equal(res.status,expected);checks++;return res.json();}
(async()=>{
  reset();authenticated=false;await status(401);assert.equal(reads.length,0);authenticated=true;
  reset();await status(400,request(null));await status(400,request({reservationId:'bad'}));await status(400,new Request('http://local',{method:'POST',body:'{'}));assert.equal(reads.length,0);
  reset();row=null;await status(404);assert.equal(sends.length,0);
  for(const field of ['facture_numero','facture_url','responsable_email']){reset();row[field]=null;await status(field==='responsable_email'?400:409);assert.equal(downloads.length,0);assert.equal(sends.length,0);}
  reset();dbError=Error('database');await status(500);assert.equal(sends.length,0);
  reset();downloadError=Error('storage');await status(502);assert.equal(sends.length,0);
  reset();content=Buffer.from('not PDF');await status(502);assert.equal(sends.length,0);
  for(const result of [{error:'Resend failure'},{skipped:true,reason:'missing key'}]){reset();resendResult=result;await status(502);assert.deepEqual(row,initial);}
  reset();thrown=Error('network');await status(500);assert.deepEqual(row,initial);
  reset();assert.deepEqual(await status(200),{ok:true,email:initial.responsable_email});assert.deepEqual(downloads,[initial.facture_url]);assert.equal(sends.length,1);assert.equal(sends[0].invoiceNumber,initial.facture_numero);assert.deepEqual(sends[0].invoicePdf,pdf);assert.deepEqual(row,initial);
  // Helper uses the existing Resend transport, one current attachment, only the client.
  const env={RESEND_API_KEY:'test',EMAIL_FROM:'Test <test@example.com>'};
  const email=load('src/lib/pecheEmail.ts',name=>{throw Error(name);},{process:{env},fetch:()=>{throw Error('Real fetch forbidden');}});
  let mail;
  const result=await email.sendPecheInvoiceEmail({reservation:initial,invoiceNumber:initial.facture_numero,invoicePdf:pdf,fetchFn:async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');mail=JSON.parse(options.body);return new Response('{}');}});
  assert.equal(result.ok,true);assert.deepEqual(mail.to,[initial.responsable_email]);assert.deepEqual(mail.attachments,[{filename:initial.facture_numero+'.pdf',content:pdf.toString('base64')}]);assert.ok(mail.html.includes('&lt;Client&gt;'));checks++;
  delete env.RESEND_API_KEY;assert.equal((await email.sendPecheInvoiceEmail({reservation:initial,invoiceNumber:initial.facture_numero,invoicePdf:pdf})).skipped,true);checks++;
  // Execute UI handlers with isolated hooks, testing confirmation, pending guard and feedback.
  let states=[],cursor=0,confirm=true,calls=0,reply,resolveFetch,ref={current:false};
  const ui=load('src/app/admin/components/PecheSendInvoice.tsx',name=>{
    if(name==='react')return {useRef:()=>ref,useState:value=>{const i=cursor++;if(!(i in states))states[i]=value;return [states[i],v=>states[i]=v];}};
    if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
    throw Error(name);
  },{window:{confirm:()=>confirm},fetch:async()=>{calls++;return new Promise(resolve=>resolveFetch=()=>resolve(new Response(JSON.stringify(reply.body),{status:reply.status})));}}).default;
  function render(reservation=initial){cursor=0;return ui({reservation});}
  assert.equal(render({...initial,facture_url:null}),null);assert.equal(render({...initial,facture_numero:null}),null);checks++;
  const button=()=>render().props.children[0];
  confirm=false;await button().props.onClick();assert.equal(calls,0);checks++;
  confirm=true;reply={status:200,body:{ok:true,email:initial.responsable_email}};
  const sending=button().props.onClick();assert.equal(button().props.disabled,true);await button().props.onClick();assert.equal(calls,1);resolveFetch();await sending;
  assert.equal(button().props.disabled,false);assert.equal(render().props.children[1].props.children,'Facture envoyée avec succès à '+initial.responsable_email);checks++;
  reply={status:502,body:{error:'Resend indisponible'}};const failing=button().props.onClick();resolveFetch();await failing;assert.equal(render().props.children[1].props.role,'alert');assert.equal(render().props.children[1].props.children,'Resend indisponible');checks++;
  console.log(checks+' targeted API/email/UI checks PASS (current replacement PDF, auth, errors, no writes/payment, confirmation, duplicate click guard)');
})().catch(error=>{console.error(error);process.exitCode=1;});
