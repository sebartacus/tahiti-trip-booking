// Local availability/UI regression test. No Production credentials or data access.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const http = require('node:http'), assert = require('node:assert/strict');
const ts = require('typescript');
const root = process.cwd();
const id = '88f2f4e8-d84b-46d9-8353-af983886a304';
const reservation = { id, date_sortie: '2026-10-26', formule: 'full_day', slots: ['morning', 'afternoon'], facture_numero: null };
const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText;
function playwright() {
  try { return require('playwright'); } catch {}
  const cache = path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
  for (const entry of fs.existsSync(cache) ? fs.readdirSync(cache) : []) {
    const p = path.join(cache, entry, 'node_modules', 'playwright');
    if (fs.existsSync(path.join(p, 'package.json'))) return require(p);
  }
  throw Error('Playwright absent du cache local');
}
let rpcResult, moveResult, authenticated = true;
const calls = [];
const routeModule = { exports: {} };
const apiRequire = name => {
  if (name === 'next/server') return require(name);
  if (name === '@/lib/adminSession') return { verifyAdminSession: () => authenticated };
  if (name === '@/lib/salonAdmin') return { getSalonAdminClient: () => ({ storage: { from: () => ({}) }, rpc: async (name, args) => { assert.equal(name, 'check_peche_date_change'); calls.push(args); return rpcResult; } }) };
  if (name === '@/lib/pecheDateChange') return { PecheMoveError: class extends Error {}, movePecheWithInvoiceAndEmail: async () => { if (!moveResult) throw Error('FORBIDDEN MOVE'); return moveResult; } };
  throw Error(name);
};
vm.runInNewContext(transpile(fs.readFileSync('src/app/api/admin/peche/change-date/route.ts', 'utf8')), { module: routeModule, exports: routeModule.exports, require: apiRequire, URL });
const query = new URLSearchParams({ reservationId: id, date: '2026-12-24', expectedDate: '2026-10-26' });
const request = () => new Request('http://localhost/api/admin/peche/change-date?' + query);
const modules = [], ids = new Map();
function bundle(file) {
  if (ids.has(file)) return ids.get(file);
  const index = modules.length; ids.set(file, index); modules.push('');
  let source = fs.readFileSync(file, 'utf8');
  if (/\.tsx?$/.test(file)) source = transpile(source);
  source = source.replace(/require\(["']([^"']+)["']\)/g, (_, name) => {
    if (name === '@/lib/tahiti-date') return '({getTahitiToday:()=>"2026-10-02"})';
    return `require(${bundle(require.resolve(name, { paths: [path.dirname(file)] }))})`;
  });
  modules[index] = `${index}:function(module,exports,require){\n${source}\n}`;
  return index;
}
const component = bundle(path.join(root, 'src/app/admin/components/PecheDateChange.tsx'));
const react = bundle(require.resolve('react')), dom = bundle(require.resolve('react-dom/client'));
const browserCode = `const process={env:{NODE_ENV:'production'}}; const modules={${modules.join(',')}}; const cache={}; function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports;} require(${dom}).createRoot(document.getElementById('root')).render(require(${react}).createElement(require(${component}).default,{reservation:${JSON.stringify(reservation)},onChanged:async()=>{window.changed=(window.changed||0)+1}}));`;
(async () => {
  rpcResult = { data: { reservation }, error: null };
  let response = await routeModule.exports.GET(request());
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { available: true, slots: reservation.slots });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { p_reservation_id: id, p_date: '2026-12-24', p_expected_date: '2026-10-26' });
  for (const [slot, label] of [['morning', 'matin'], ['afternoon', 'après-midi']]) {
    rpcResult = { data: null, error: { code: 'P0001', message: `Créneau bateau indisponible (${slot}).` } };
    response = await routeModule.exports.GET(request());
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { available: false, blockingSlot: slot, error: `Créneau bateau indisponible (${label}).` });
  }
  rpcResult = { data: null, error: { code: 'XX000', message: 'Internal failure' } };
  response = await routeModule.exports.GET(request());
  assert.equal(response.status, 500); assert.equal((await response.json()).error, 'Impossible de vérifier la disponibilité. Réessayez.');
  authenticated = false; assert.equal((await routeModule.exports.GET(request())).status, 401); authenticated = true;
  assert.equal((await routeModule.exports.GET(new Request('http://localhost/?date=bad'))).status, 400);
  for (const emailStatus of ['sent', 'failed']) {
    moveResult = { date: '2026-12-24', invoiceNumber: 'PEC-R-2026-42', emailStatus,
      ...(emailStatus === 'failed' ? { warning: "Date modifiée et facture générée, mais l'email n'a pas pu être envoyé." } : {}) };
    const post = new Request('http://localhost/api/admin/peche/change-date', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(query)) });
    response = await routeModule.exports.POST(post);
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true, ...moveResult });
  }
  moveResult = null;
  console.log('API: success, morning/afternoon conflicts, technical failure, auth and invalid input PASS');
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<div id="root"></div><script>'+browserCode+'</script>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await playwright().chromium.launch({ headless: true, channel: 'msedge' });
    const page = await browser.newPage({ timezoneId: 'Pacific/Tahiti' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let confirmationPayload;
    const requests = []; let payload = { available: true, slots: reservation.slots }, status = 200;
    await page.route('**/api/admin/peche/change-date?*', async route => {
      assert.equal(route.request().method(), 'GET'); requests.push(route.request().url());
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
    });
    await page.route('**/api/admin/peche/change-date', async route => {
      assert.ok(confirmationPayload, 'FORBIDDEN real move'); assert.equal(route.request().method(), 'POST');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(confirmationPayload) });
    });
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.getByRole('button', { name: 'Changer la date', exact: true }).click();
    const date = page.getByLabel('Nouvelle date Pêche');
    await date.fill('2026-12-24');
    await page.getByRole('button', { name: 'Vérifier la disponibilité', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '24 décembre 2026 disponible' }).waitFor();
    assert.equal(await page.getByRole('status').textContent(), '24 décembre 2026 disponible');
    assert.equal(await page.getByRole('button', { name: 'Confirmer le changement', exact: true }).isEnabled(), true);
    const params = new URL(requests[0]).searchParams;
    assert.equal(params.get('reservationId'), id); assert.equal(params.get('expectedDate'), '2026-10-26'); assert.equal(params.get('date'), '2026-12-24');
    await date.fill('2026-12-25'); assert.equal(await page.getByRole('status').count(), 0);
    for (const label of ['matin', 'après-midi']) {
      status = 409; payload = { available: false, error: `Créneau bateau indisponible (${label}).` };
      await page.getByRole('button', { name: 'Vérifier la disponibilité', exact: true }).click();
      await page.getByRole('status').filter({ hasText: label }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Confirmer le changement', exact: true }).count(), 0);
    }
    status = 200; payload = { available: false };
    await page.getByRole('button', { name: 'Vérifier la disponibilité', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Disponibilité non confirmée' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Confirmer le changement', exact: true }).count(), 0);
    for (const emailStatus of ['sent', 'failed']) {
      await page.reload(); await page.getByRole('button', { name: 'Changer la date', exact: true }).click();
      await page.getByLabel('Nouvelle date Pêche').fill('2026-12-24');
      status = 200; payload = { available: true, slots: reservation.slots };
      await page.getByRole('button', { name: 'Vérifier la disponibilité', exact: true }).click();
      await page.getByRole('status').filter({ hasText: '24 décembre 2026 disponible' }).waitFor();
      confirmationPayload = { ok: true, invoiceNumber: 'PEC-R-2026-42', emailStatus,
        ...(emailStatus === 'failed' ? { warning: "Date modifiée et facture générée, mais l'email n'a pas pu être envoyé." } : {}) };
      await page.getByRole('button', { name: 'Confirmer le changement', exact: true }).click();
      await page.getByRole('status').filter({ hasText: emailStatus === 'sent' ? 'email envoyé au client' : "l'email n'a pas pu être envoyé" }).waitFor();
      assert.equal(await page.evaluate(() => window.changed), 1);
      assert.equal(await page.getByLabel('Nouvelle date Pêche').count(), 0);
    }
    assert.deepEqual(errors, []);
    console.log('UI Edge Chromium/Tahiti: exact date, confirmation enabled, date reset, both conflicts and available:false PASS; confirmation/email statuses tested with mocked POST only');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });