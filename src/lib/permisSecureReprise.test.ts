import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPermisCookie, generatePermisCode, hashPermisCode, hashPermisLimit, newPermisChallengeId, permisCookieOptions, validPermisOrigin, verifyPermisCookie } from "./permisCandidateAccess";
import { requestPermisAccess, verifyPermisAccess, type AccessDependencies } from "./permisServer";
import { sendPermisAccessCodeEmail } from "./permisEmail";
import { normalizePermisPlanning, parsePermisSlot, permisSlotsOverlap, validatePermisPlanning } from "./permisScheduling";
import { POST } from "../app/api/permis/reprise/access/route";

async function main() {
  process.env.PERMIS_ACCESS_SECRET = "test-only-secret-not-for-deployment-0123456789";
  process.env.PERMIS_REPRISE_ORIGIN = "https://example.test";
  const codes = Array.from({length:100},generatePermisCode);
  assert.ok(codes.every(code=>/^\d{6}$/.test(code)));
  assert.ok(new Set(codes).size > 90);
  const id = newPermisChallengeId(), hash = hashPermisCode(id,"123456");
  assert.equal(hash.length,64);
  assert.notEqual(hash,"123456");
  assert.notEqual(hash,hashPermisCode(newPermisChallengeId(),"123456"));
  assert.notEqual(hash,hashPermisCode(id,"000000"));
  const now = Date.now();
  const cookie = createPermisCookie("52",now);
  assert.equal(verifyPermisCookie(cookie,now),"52");
  assert.equal(verifyPermisCookie(cookie,now+1800_000),null);
  assert.equal(verifyPermisCookie(cookie+"x",now),null);
  assert.equal(verifyPermisCookie(cookie.replace(cookie[0],cookie[0]==="A"?"B":"A"),now),null);
  assert.equal(verifyPermisCookie(cookie+".extra",now),null);
  const payload=JSON.parse(Buffer.from(cookie.split(".")[0],"base64url").toString());
  assert.deepEqual(Object.keys(payload).sort(),["exp","nonce","purpose","rid","v"]);
  assert.equal(permisCookieOptions().httpOnly,true);
  assert.equal(permisCookieOptions().sameSite,"lax");
  assert.equal(permisCookieOptions().maxAge,1800);
  for(const origin of ["https://evil.test","null",null]) assert.equal(validPermisOrigin(new Request("https://example.test/api",{headers:origin?{origin}:{}})),false);
  assert.equal(validPermisOrigin(new Request("https://example.test/api",{headers:{origin:"https://example.test"}})),true);
  assert.equal(validPermisOrigin(new Request("https://example.test/api",{headers:{origin:"https://example.test","sec-fetch-site":"cross-site"}})),false);
  delete process.env.PERMIS_REPRISE_ACCESS_ENABLED;
  assert.equal((await POST(new Request("https://example.test/api",{method:"POST"}))).status,503);

  // Service orchestration contract; PostgreSQL semantics are exercised by the SQL suite.
  let destination:string|null = "stored@example.test", issuedHash="", issuedId="", deliveredCode="", deliveries=0;
  const deps:AccessDependencies={
    async issue(input){issuedHash=input.codeHash;issuedId=input.id;return destination;},
    async consume(input){return input.id===issuedId && input.codeHash===issuedHash ? "52" : null;},
    async send(email,code){assert.equal(email,"stored@example.test");deliveries++;deliveredCode=code;}
  };
  const found=await requestPermisAccess("browser@example.test",hashPermisLimit("test"),deps);
  assert.equal(deliveries,1);
  assert.equal(verifyPermisCookie(await verifyPermisAccess(found.challengeId,deliveredCode,hashPermisLimit("test"),deps)),"52");
  assert.equal(await verifyPermisAccess(found.challengeId,deliveredCode==="000000"?"111111":"000000",hashPermisLimit("test"),deps),null);
  assert.equal(await verifyPermisAccess("52",deliveredCode,hashPermisLimit("test"),deps),null);
  destination=null; // unknown, ambiguous, no-email and throttled all use the same contract.
  const absent=await requestPermisAccess("unknown@example.test",hashPermisLimit("test"),deps);
  assert.equal(found.message,absent.message);
  assert.deepEqual(Object.keys(found),Object.keys(absent));
  assert.equal(deliveries,1);
  assert.notEqual(found.challengeId,absent.challengeId);

  const oldKey=process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY="test-placeholder";
  let emailCalls=0;
  const fetchMock:typeof fetch=async (_url,init)=>{
    emailCalls++;
    const body=JSON.parse(String(init?.body));
    assert.deepEqual(body.to,["stored@example.test"]);
    assert.ok(body.html.includes("123456"));
    assert.equal(body.attachments,undefined);
    return new Response("{}",{status:200});
  };
  await sendPermisAccessCodeEmail("stored@example.test","123456",fetchMock);
  assert.equal(emailCalls,1);
  await assert.rejects(()=>sendPermisAccessCodeEmail("stored@example.test","<script>",fetchMock));
  await assert.rejects(()=>sendPermisAccessCodeEmail("stored@example.test","123456",async()=>new Response("",{status:500})));
  if(oldKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=oldKey;

  const empty={examen:null,date_cours:null,creneau:null};
  assert.equal(normalizePermisPlanning({...empty,examen:"Plus tard"}).examen,null);
  assert.equal(validatePermisPlanning(empty,{examen:"16/09/2026"},"2026-09-06").changed,true);
  assert.equal(validatePermisPlanning(empty,{date_cours:"15/09/2026",creneau:"07h00 - 09h00"},"2026-09-06").after.examen,null);
  assert.equal(validatePermisPlanning({...empty,examen:"16 septembre 2026"},{examen:"16/09/2026"},"2026-09-06").changed,false);
  assert.throws(()=>validatePermisPlanning(empty,{date_cours:"17/09/2026",creneau:"07h00 - 09h00",examen:"16/09/2026"},"2026-09-06"));
  assert.throws(()=>validatePermisPlanning(empty,{date_cours:"15/09/2026"},"2026-09-06"));
  assert.equal(permisSlotsOverlap("09h00 - 11h00","11h00 - 13h00"),false);
  assert.equal(permisSlotsOverlap("13h00 - 17h00","15h00 - 17h00"),true);
  assert.equal(parsePermisSlot("25h00 - 26h00"),null);

  const sql=readFileSync("supabase/migrations/202609060001_prepare_permis_secure_reprise.sql","utf8");
  assert.ok(!/\b(?:drop|create|alter)\s+policy\b/i.test(sql));
  assert.ok(!/alter\s+table\s+(?:public\.)?reservations\b/i.test(sql));
  assert.ok(!/storage\.objects/i.test(sql.replace(/--[^\n]*/g,"")));
  const revokes=sql.match(/revoke[^;]+;/gi)||[];
  assert.ok(revokes.length>0);
  for(const statement of revokes) assert.match(statement,/on (?:function public\.permis_|public\.permis_access_)/i);
  for(const name of ["permis_access_challenges","permis_access_limits"]) assert.ok(sql.includes("alter table public."+name+" enable row level security"));
  const functions=[...sql.matchAll(/create function public\.(\w+)\(/g)].map(m=>m[1]);
  for(const name of functions) {
    assert.ok(sql.includes("revoke all on function public."+name+"("));
    assert.ok(sql.includes("grant execute on function public."+name+"("));
  }
  assert.equal((sql.match(/set search_path = pg_catalog, public/g)||[]).length,functions.length);
  assert.match(sql,/for update/);
  assert.match(sql,/c\.attempts >= 5/);
  assert.match(sql,/c\.expires_at <= clock_timestamp\(\)/);
  assert.match(sql,/c\.consumed_at is not null/);
  assert.match(sql,/cardinality\(v_ids\),0\) <> 1/);
  console.log("Socle Permis : tests TypeScript, email simulé et contrôles SQL statiques OK.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
