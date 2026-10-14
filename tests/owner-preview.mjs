import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const filename=resolve('downloads/golden-hand-owner-demo.html');
// The managed Chromium policy blocks file://. Serve the exact portable artifact locally.
// No external asset/server dependency is allowed; direct file opening needs client-device UAT.
const html=await readFile(filename);
const server=createServer((req,res)=>{
    if(!['/','/admin'].includes(req.url))return res.writeHead(404).end();
    res.writeHead(200,{'Content-Type':'text/html'}).end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:900},hasTouch:true});
const page=await context.newPage();const errors=[],remote=[];const key='golden-hand-pos-phase1-v1';
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{
    if(/^https?:/.test(r.url())&&![url,`${url}admin`].includes(r.url()))remote.push(r.url());
});
const data=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
let checks=0;const pass=message=>{checks++;console.log(`PASS ${checks}: ${message}`);};
try {
    await page.goto(url);
    await page.getByRole('button',{name:'Owner Dashboard',exact:true}).click();
    await page.getByRole('heading',{name:'Ringkasan operasional'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Cashier POS',exact:true}).count(),0);
    assert.equal(await page.locator('.owner-tables .table-card').count(),5);
    const uri=await page.locator('.brand img').first().getAttribute('src');
    assert.deepEqual(Buffer.from(uri.split(',')[1],'base64'),await readFile(resolve('apps/web/public/brand/golden-hand-original.jpg')));
    await page.getByText('Demo owner · data di perangkat ini. Belum terhubung ke APK kasir.').waitFor();
    pass('standalone owner artifact opens with five tables, original logo and truthful connection status');
    await page.getByRole('button',{name:'Tarif meja',exact:true}).click();
    await page.getByRole('button',{name:'Ubah tarif',exact:false}).click();
    await page.getByRole('dialog').getByLabel('Tarif per jam (Rp)').fill('100000');
    await page.getByRole('dialog').getByRole('button',{name:'Simpan & lanjutkan'}).click();
    assert.equal((await data()).rates.Standard,100000);assert.equal((await data()).tables[0].session.rate,80000);
    await page.getByRole('button',{name:'Katalog & stok',exact:true}).click();
    await page.getByRole('button',{name:'Edit harga',exact:true}).first().click();
    await page.getByRole('dialog').getByLabel('Harga jual (Rp)').fill('11000');
    await page.getByRole('dialog').getByLabel('HPP / unit (Rp)').fill('4500');
    await page.getByRole('dialog').getByRole('button',{name:'Simpan & lanjutkan'}).click();
    await page.getByRole('button',{name:'Stok ±',exact:true}).first().click();
    await page.getByRole('dialog').getByLabel('Jumlah unit').fill('10');
    await page.getByRole('dialog').getByLabel('Alasan perubahan').fill('Uji restock owner');
    await page.getByRole('dialog').getByRole('button',{name:'Simpan & lanjutkan'}).click();
    assert.equal((await data()).products[0].price,11000);assert.equal((await data()).products[0].cost,4500);assert.equal((await data()).products[0].stock,46);
    pass('owner rate, product price/HPP and inventory edits work without rewriting active-session rates');
    await context.setOffline(true);
    await page.getByRole('button',{name:'Tarif meja',exact:true}).click();
    await page.getByRole('heading',{name:'Tarif meja',exact:true}).waitFor();
    await context.setOffline(false);await page.reload();
    await page.getByRole('heading',{name:'Ringkasan operasional'}).waitFor();assert.equal((await data()).rates.Standard,100000);
    await page.getByRole('button',{name:'Laporan penjualan',exact:true}).click();
    const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Ekspor CSV',exact:true}).click();
    const download=await pending;assert.match(download.suggestedFilename(),/golden-hand-sales/);
    assert.ok((await readFile(await download.path(),'utf8')).includes('Penjualan'));
    pass('owner actions remain available offline; saved changes survive reload and report CSV downloads');
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.getByRole('button',{name:'Buka navigasi'}).click();await page.getByRole('button',{name:'Overview',exact:true}).click();
    await page.screenshot({path:resolve('docs/previews/owner-file-mobile.png'),fullPage:true});
    assert.deepEqual(remote,[]);assert.deepEqual(errors,[]);
    pass('owner mobile viewport fits without horizontal overflow; no remote assets or uncaught errors');
    console.log(`${checks} owner-file checks passed.`);
} finally {await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
