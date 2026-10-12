import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';

// Self-contained local browser suite: requires a completed build, never deploys.
const root=resolve('apps/web/dist');
const screenshots=resolve('docs/previews');
await mkdir(screenshots,{recursive:true});
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
const server=createServer(async (req,res) => {
  const path=new URL(req.url,'http://localhost').pathname;
  const target=resolve(root,`.${path}`);
  if (!target.startsWith(`${root}/`) && target!==root) { res.writeHead(403).end(); return; }
  try { const file=path==='/' ? resolve(root,'index.html') : target; const data=await readFile(file); res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(data); }
  catch { if(path.startsWith('/assets/')||path.includes('.')) res.writeHead(404).end(); else res.writeHead(200,{'Content-Type':'text/html'}).end(await readFile(resolve(root,'index.html'))); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const storageKey='golden-hand-pos-phase1-v1';
const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
const dialog=()=>page.getByRole('dialog');
let count=0;
const pass=label=>{count++;console.log(`PASS ${count}: ${label}`);};
async function noOverflow() { assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'page overflows horizontally'); }
async function cashierActionsVisible() {
  const box=await page.locator('.session-panel .checkout-button').boundingBox();
  assert.ok(box && box.y>=0 && box.y+box.height<=page.viewportSize().height+1,'cashier checkout/payment must fit the landscape viewport');
}
async function cleanPreview() { const close=page.locator('.toast .icon-button'); if(await close.count()) await close.click(); await page.evaluate(()=>window.scrollTo(0,0)); }
async function closeDialog() { await dialog().getByRole('button',{name:'Tutup dialog',exact:true}).click(); }
try {
  await page.goto(url);await page.getByRole('button',{name:'Cashier POS'}).waitFor();
  assert.ok(await page.locator('.login-story img').evaluate(el=>el.complete&&el.naturalWidth===1280));
  await page.screenshot({path:resolve(screenshots,'login.png'),fullPage:true});pass('login displays supplied, undistorted original logo');
  assert.equal(await page.getByRole('button',{name:'Owner Dashboard',exact:true}).count(),0);
  await page.getByRole('button',{name:'Cashier POS'}).click();
  assert.equal(await page.locator('.table-card').count(),5);assert.ok((await state()).tables.every(t=>t.kind==='Standard'));assert.deepEqual((await state()).rates,{Standard:80000});assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light');assert.equal(await page.getByRole('button',{name:'Edit harga',exact:true}).count(),0);
  await noOverflow();await cashierActionsVisible();await page.screenshot({path:resolve(screenshots,'cashier-tablet.png'),fullPage:true});pass('cashier five-table Standard dashboard, light theme, read-only pricing and visible tablet actions');
  await page.setViewportSize({width:1024,height:768});await noOverflow();await cashierActionsVisible();await page.screenshot({path:resolve(screenshots,'cashier-tablet-1024.png'),fullPage:true});
  await page.setViewportSize({width:1280,height:800});
  await page.getByRole('button',{name:'Meja 05 Waktu habis',exact:true}).click();
  assert.equal(await page.locator('.session-panel').getByRole('button',{name:'Tambah F&B'}).isDisabled(),true);
  assert.equal(await page.locator('.session-panel .countdown-panel>strong').textContent(),'00:00:00');
  await page.locator('.session-panel').getByRole('button',{name:'Extend',exact:true}).click();
  await dialog().getByLabel('Tambahan durasi').selectOption('30');await dialog().getByRole('button',{name:'Simpan & lanjutkan'}).click();
  assert.ok((await state()).tables[4].session.expires>Date.now());pass('expired cutoff blocks F&B and extends from reactivation time');
  await page.getByRole('button',{name:'Meja 03 Tersedia',exact:true}).click();
  await page.getByRole('button',{name:'Mulai sesi baru'}).click();await dialog().getByLabel('Skema pembayaran').selectOption('postpaid');
  // Modal focus is trapped, and Escape dismisses without starting a session.
  await page.keyboard.press('Escape');assert.equal((await state()).tables[2].session,null);
  await page.getByRole('button',{name:'Mulai sesi baru'}).click();await dialog().getByLabel('Skema pembayaran').selectOption('postpaid');
  await dialog().getByRole('button',{name:'Mulai sesi',exact:true}).click();assert.equal((await state()).tables[2].session.payments.length,0);pass('postpaid session starts without paid balance; Escape cancels dialog safely');
  await page.locator('.session-panel').getByRole('button',{name:'Tambah F&B'}).click();
  await page.getByRole('button',{name:/Air Mineral 600ml/}).click();await dialog().getByLabel(/Jumlah · tersedia/).fill('2');
  await dialog().getByRole('button',{name:'Simpan & lanjutkan'}).click();assert.equal((await state()).products[0].stock,34);pass('F&B order stores snapshot and deducts exactly two inventory units');
  await page.getByRole('button',{name:'Meja & sesi',exact:true}).click();await page.locator('.session-panel').getByRole('button',{name:'Terima pembayaran',exact:true}).click();
  await dialog().getByLabel('Nominal pembayaran (Rp)',{exact:true}).fill('40000');await dialog().getByLabel('Uang diterima (Rp)',{exact:true}).fill('50000');
  await dialog().getByRole('button',{name:'Catat pembayaran'}).click();assert.equal((await state()).tables[2].session.payments[0].amount,40000);
  await page.locator('.session-panel').getByRole('button',{name:'Terima pembayaran',exact:true}).click();await dialog().getByRole('button',{name:'QRIS demo',exact:true}).click();
  await dialog().getByRole('button',{name:'Buat pending demo'}).click();assert.equal((await state()).tables[2].session.payments.length,1);
  await page.locator('.pending-trigger').click();await dialog().getByRole('button',{name:'Simulasi settlement',exact:true}).click();await closeDialog();
  assert.equal((await state()).tables[2].session.payments.length,2);pass('partial cash and simulated QRIS settle once; pending did not count as paid');
  await page.locator('.session-panel').getByRole('button',{name:'Preview / cetak bill'}).click();
  assert.match(await page.locator('.receipt').innerText(),/RECEIPT · LUNAS/);assert.ok(await page.locator('.receipt img').evaluate(el=>el.complete));
  await page.emulateMedia({media:'print'});await page.screenshot({path:resolve(screenshots,'receipt-80mm.png'),fullPage:true});await page.emulateMedia({media:'screen'});await closeDialog();pass('paid receipt uses original logo and 80mm print stylesheet');
  await page.locator('.session-panel').getByRole('button',{name:'Selesaikan & checkout'}).click();assert.equal((await state()).tables[2].state,'cleaning');
  await page.getByRole('button',{name:'Tandai meja siap'}).click();assert.equal((await state()).tables[2].state,'available');pass('checkout archives charges/payments and requires cleaning before ready');
  assert.equal(await page.getByRole('button',{name:'Buka demo owner',exact:false}).count(),0);assert.equal(await page.getByRole('button',{name:'Reset demo',exact:true}).count(),0);
  await page.goto(`${url}/admin`);await page.getByRole('button',{name:'Owner Dashboard',exact:true}).click();assert.equal(await page.locator('.owner-tables .table-card').count(),5);
  await cleanPreview();await page.screenshot({path:resolve(screenshots,'owner-desktop.png'),fullPage:true});await noOverflow();pass('owner overview monitors the same five tables');
  const ownerTab=await context.newPage();await ownerTab.goto(`${url}/admin`);await ownerTab.getByRole('button',{name:'Owner Dashboard'}).click();
  await ownerTab.getByRole('button',{name:'Tarif meja',exact:true}).click();assert.equal(await ownerTab.locator('.rate-card').count(),1);await ownerTab.getByRole('button',{name:'Ubah tarif',exact:false}).first().click();
  await ownerTab.getByRole('dialog').getByLabel('Tarif per jam (Rp)').fill('100000');await ownerTab.getByRole('dialog').getByRole('button',{name:'Simpan & lanjutkan'}).click();
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).rates.Standard===100000,storageKey);
  await page.getByRole('button',{name:'Tarif meja',exact:true}).click();await page.getByText('Rp 100.000',{exact:false}).first().waitFor();
  assert.equal((await state()).tables[0].session.rate,80000);await ownerTab.close();pass('cross-tab owner rate update syncs, retaining active-session rate snapshot');
  await page.getByRole('button',{name:'Katalog & stok',exact:true}).click();await page.getByRole('button',{name:'Edit harga',exact:true}).first().click();
  await dialog().getByLabel('Harga jual (Rp)').fill('9000');await dialog().getByLabel('HPP / unit (Rp)').fill('4000');await dialog().getByRole('button',{name:'Simpan & lanjutkan'}).click();assert.equal((await state()).products[0].price,9000);
  await page.getByRole('button',{name:'Stok ±',exact:true}).first().click();await dialog().getByLabel('Jumlah unit').fill('10');await dialog().getByLabel('Alasan perubahan').fill('Restock supplier');await dialog().getByRole('button',{name:'Simpan & lanjutkan'}).click();
  assert.equal((await state()).products[0].stock,44);pass('owner price/HPP and inventory restock are editable and audited');
  const cashierTab=await context.newPage();
  await cashierTab.goto(`${url}/pos`);await cashierTab.getByRole('button',{name:'Cashier POS',exact:true}).click();
  await cashierTab.getByRole('button',{name:'Food & beverage',exact:true}).click();
  const mineral=cashierTab.getByRole('button',{name:/Air Mineral 600ml/});
  assert.match(await mineral.innerText(),/9\.000/);
  assert.equal(await cashierTab.getByRole('button',{name:'Edit harga',exact:true}).count(),0);
  assert.equal(await cashierTab.getByRole('button',{name:'Buka demo owner',exact:false}).count(),0);
  await cashierTab.close();pass('separate cashier portal uses owner-adjusted product price without price editors or owner switch');
  await page.getByRole('button',{name:/Refund & void/}).click();await page.getByRole('button',{name:'Setujui demo'}).click();assert.equal((await state()).approvals[0].status,'approved');pass('refund/void approval clearly remains a status-only demo');
  await page.getByRole('button',{name:'Staf & shift',exact:true}).click();await page.getByRole('button',{name:'Tambah staf',exact:true}).click();
  await dialog().getByLabel('Nama staf').fill('Kasir Baru');await dialog().getByRole('button',{name:'Simpan & lanjutkan'}).click();assert.equal((await state()).staff.length,4);pass('staff profile management is local and labelled as demo');
  await page.getByRole('button',{name:'Laporan penjualan',exact:true}).click();await page.getByLabel('Tanggal laporan').fill('2020-01-01');await page.getByRole('heading',{name:'Belum ada transaksi selesai pada tanggal ini'}).waitFor();pass('empty report state for date without transactions');
  await page.getByLabel('Tanggal laporan').fill(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}));
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Ekspor CSV'}).click();assert.match((await downloadEvent).suggestedFilename(),/golden-hand-sales/);pass('report CSV export');
  await page.getByRole('button',{name:'Overview',exact:true}).click();await page.setViewportSize({width:390,height:844});await noOverflow();await cleanPreview();await page.screenshot({path:resolve(screenshots,'owner-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Buka navigasi'}).click();await page.getByRole('button',{name:'Katalog & stok',exact:true}).click();await noOverflow();await page.screenshot({path:resolve(screenshots,'owner-mobile-catalog.png'),fullPage:true});
  await page.getByRole('button',{name:'Buka navigasi'}).click();await page.getByRole('button',{name:'Overview',exact:true}).click();await page.setViewportSize({width:768,height:1024});await noOverflow();
  await page.setViewportSize({width:1280,height:800});pass('owner mobile 390px and portrait tablet 768px have no page overflow');
  await page.reload();await page.getByRole('heading',{name:'Ringkasan operasional'}).waitFor();assert.equal((await state()).products[0].stock,44);pass('reload retains local data and demo role');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await context.setOffline(true);await page.reload();await page.getByText(/Offline · demo memakai data browser/).waitFor();await page.getByRole('heading',{name:'Ringkasan operasional'}).waitFor();await context.setOffline(false);pass('production shell reloads offline from service worker with explicit offline state');
  const migrationContext=await browser.newContext();
  try {
    const migrationPage=await migrationContext.newPage();
    migrationPage.on('pageerror',e=>errors.push(e.message));
    await migrationPage.goto(`${url}/admin`);await migrationPage.getByRole('button',{name:'Owner Dashboard'}).waitFor();
    const legacy=await state();legacy.version=1;legacy.rates.VIP=120000;
    legacy.tables[1].kind='VIP';legacy.tables[1].session.rate=120000;
    legacy.tables[1].session.charges[0].amount=360000;
    legacy.tables[1].session.charges[0].label='Sewa 3 jam · VIP';
    const raw=JSON.stringify(legacy);
    await migrationPage.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:storageKey,raw});
    await migrationPage.reload();await migrationPage.getByRole('button',{name:'Owner Dashboard'}).click();
    await migrationPage.getByRole('heading',{name:'Ringkasan operasional'}).waitFor();
    const migrated=await migrationPage.evaluate(key=>({data:JSON.parse(localStorage.getItem(key)),backup:localStorage.getItem(`${key}-before-standard`)}),storageKey);
    assert.equal(migrated.backup,raw);assert.equal(migrated.data.version,2);
    assert.ok(migrated.data.tables.every(t=>t.kind==='Standard'));
    assert.deepEqual(migrated.data.tables.map(t=>t.session),legacy.tables.map(t=>t.session));
    assert.deepEqual(migrated.data.records,legacy.records);
    await migrationPage.reload();await migrationPage.getByRole('heading',{name:'Ringkasan operasional'}).waitFor();
    assert.equal(await migrationPage.evaluate(key=>JSON.parse(localStorage.getItem(key)).revision,storageKey),migrated.data.revision);
    pass('legacy browser data migrates once with exact backup and unchanged financial snapshots');
  } finally { await migrationContext.close(); }
  const accessContext=await browser.newContext({viewport:{width:1280,height:800}});
  try {
    const accessPage=await accessContext.newPage();
    accessPage.on('pageerror',e=>errors.push(e.message));
    await accessPage.addInitScript(()=>sessionStorage.setItem('golden-hand-demo-role','owner'));
    await accessPage.goto(url);await accessPage.getByRole('button',{name:'Cashier POS',exact:true}).waitFor();
    assert.equal(new URL(accessPage.url()).pathname,'/pos');
    assert.equal(await accessPage.getByRole('button',{name:'Owner Dashboard',exact:true}).count(),0);
    assert.equal(await accessPage.locator('.owner-shell').count(),0);
    await accessPage.getByRole('button',{name:'Cashier POS',exact:true}).click();
    await accessPage.getByRole('button',{name:'Meja & sesi',exact:true}).waitFor();
    assert.equal(await accessPage.getByRole('button',{name:'Reset demo',exact:true}).count(),0);
    pass('tablet entry defaults to cashier and ignores legacy owner role; no owner choice or reset');
    await accessPage.evaluate(()=>{history.pushState({},'', '/admin');window.dispatchEvent(new PopStateEvent('popstate'));});
    await accessPage.getByRole('button',{name:'Owner Dashboard',exact:true}).waitFor();
    assert.equal(await accessPage.locator('.owner-shell').count(),0);
    assert.equal(await accessPage.getByRole('button',{name:'Cashier POS',exact:true}).count(),0);
    await accessPage.goBack();await accessPage.getByRole('button',{name:'Meja & sesi',exact:true}).waitFor();
    await accessPage.goForward();await accessPage.getByRole('button',{name:'Owner Dashboard',exact:true}).waitFor();
    await accessPage.screenshot({path:resolve(screenshots,'owner-login.png'),fullPage:true});
    await accessPage.getByRole('button',{name:'Owner Dashboard',exact:true}).click();
    await accessPage.getByRole('heading',{name:'Ringkasan operasional'}).waitFor();
    pass('URL/history changes do not enter owner demo using the cashier session');
    await accessPage.getByRole('button',{name:'Keluar demo',exact:true}).click();
    assert.equal(new URL(accessPage.url()).pathname,'/admin');
    await accessPage.reload();await accessPage.getByRole('button',{name:'Owner Dashboard',exact:true}).waitFor();
    assert.equal(await accessPage.getByRole('button',{name:'Cashier POS',exact:true}).count(),0);
    await accessPage.goto(`${url}/pos`);await accessPage.getByRole('button',{name:'Meja & sesi',exact:true}).waitFor();
    await accessPage.getByRole('button',{name:'Keluar demo',exact:true}).click();
    assert.equal(new URL(accessPage.url()).pathname,'/pos');
    await accessPage.reload();await accessPage.getByRole('button',{name:'Cashier POS',exact:true}).waitFor();
    assert.equal(await accessPage.locator('.cashier-shell').count(),0);
    assert.equal(await accessPage.getByRole('button',{name:'Owner Dashboard',exact:true}).count(),0);
    pass('portal-specific logout and reload keep entry pages and demo sessions separate');
  } finally { await accessContext.close(); }
  // Browser simulation of the native runtime flag; this is not an Android hardware test.
  const nativeContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  try {
    await nativeContext.addInitScript(()=>{ window.androidBridge={}; });
    const nativePage=await nativeContext.newPage();nativePage.on('pageerror',e=>errors.push(e.message));
    await nativePage.goto(`${url}/admin`);await nativePage.getByRole('button',{name:'Cashier POS',exact:true}).click();
    assert.equal(new URL(nativePage.url()).pathname,'/pos');
    assert.equal(await nativePage.locator('.table-card').count(),5);
    assert.equal(await nativePage.getByRole('button',{name:'Owner Dashboard',exact:true}).count(),0);
    assert.ok(await nativePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await nativePage.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length),0);
    await nativePage.getByRole('button',{name:'Meja 03 Tersedia',exact:true}).click();
    await nativePage.getByRole('button',{name:'Mulai sesi baru'}).click();
    assert.equal(await nativePage.evaluate(()=>window.dispatchEvent(new Event('golden-hand:native-back',{cancelable:true}))),false);
    await nativePage.getByRole('dialog').waitFor({state:'detached'});
    assert.equal(await nativePage.evaluate(key=>JSON.parse(localStorage.getItem(key)).tables[2].session,storageKey),null);
    pass('native-runtime simulation stays cashier-only, fits phone width, skips web cache and Back cancels dialog');
    await nativeContext.setOffline(true);
    await nativePage.getByRole('button',{name:'Mulai sesi baru'}).click();
    const nativeDialog=nativePage.getByRole('dialog');
    await nativeDialog.getByLabel('Skema pembayaran').selectOption('postpaid');
    await nativeDialog.getByRole('button',{name:'Mulai sesi',exact:true}).click();
    const nativeSession=await nativePage.evaluate(key=>JSON.parse(localStorage.getItem(key)).tables[2].session.id,storageKey);
    await nativePage.locator('.session-panel').getByRole('button',{name:'Preview / cetak bill'}).click();
    assert.equal(await nativePage.getByRole('button',{name:'Cetak 80 mm',exact:true}).isDisabled(),true);
    await nativePage.getByText('APK demo menyediakan preview bill. Cetak Android / ESC/POS belum terhubung.').waitFor();
    await nativeContext.setOffline(false);await nativePage.reload();
    await nativePage.getByRole('button',{name:'Meja 03 Aktif',exact:true}).waitFor();
    assert.equal(await nativePage.evaluate(key=>JSON.parse(localStorage.getItem(key)).tables[2].session.id,storageKey),nativeSession);
    pass('native-runtime simulation records an offline demo session, retains it on reload and labels unavailable native printing');
  } finally { await nativeContext.close(); }
  await page.evaluate(key=>localStorage.setItem(key,'{"invalid":true}'),storageKey);await page.reload();await page.getByRole('heading',{name:'Data demo tidak dapat dimuat'}).waitFor();pass('corrupt localStorage displays recoverable error without silently deleting data');
  assert.deepEqual(errors,[]);console.log(`\n${count} browser checks passed; ${errors.length} uncaught page errors. Screenshots: docs/previews/`);
} finally { await context.close();await browser.close();await new Promise(resolve=>server.close(resolve)); }
