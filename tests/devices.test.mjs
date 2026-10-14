import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEscPosReceipt, monochromeRaster, escPos80, PrinterAdapters, EdcCoordinator } from '../packages/devices/index.ts';

const bill={id:'demo-123',table:1,timestamp:'14/10/2026 12:00 WIB',settled:false,demo:true,
  rows:[{label:'Sewa 1 jam',amount:'Rp80.000'},{label:'Air mineral',amount:'Rp10.000'}],
  total:'Rp90.000',payments:[{label:'Tunai',amount:'Rp50.000'}],outstanding:'Rp40.000'};
const request={requestId:'attempt-1',billId:'demo-123',amount:40000,currency:'IDR'};
const approved=r=>({status:'approved',requestId:r.requestId,amount:r.amount,currency:r.currency,reference:'terminal-ref'});

test('raster is monochrome, MSB first, row-padded, and composites transparency against white',()=>{
  const rgba=new Uint8Array(9*2*4).fill(255);
  for(const index of [0,8,10])rgba.set([0,0,0,255],index*4);
  rgba.set([0,0,0,0],4);
  assert.deepEqual([...monochromeRaster(9,2,rgba)],[0x80,0x80,0x40,0]);
  for(const [w,h,data] of [[0,1,rgba],[833,1,rgba],[9,1.5,rgba],[9,2,rgba.slice(1)]])assert.throws(()=>monochromeRaster(w,h,data),/Raster/);
});
test('ESC/POS preserves demo/unpaid state, widths and balances while blocking injected controls',()=>{
  const bytes=buildEscPosReceipt({...bill,rows:[...bill.rows,{label:'Café\x1b\x1d'+'x'.repeat(90),amount:'Rp1.000'}]});
  assert.deepEqual([...bytes.slice(0,5)],[27,64,27,116,0]);
  const text=new TextDecoder().decode(bytes);
  assert.match(text,/BILL - BELUM LUNAS/);assert.match(text,/DEMO - BUKAN TRANSAKSI NYATA/);
  assert.match(text,/Cafe\?\?/);assert.match(text,/Sisa bayar +Rp40\.000/);
  assert.equal(bytes.filter(b=>b===27).length,5,'only encoder-owned ESC commands allowed');
  assert.equal(bytes.includes(29),false,'no cutter unless the profile explicitly enables it');
  const printable=['\x1b@','\x1bt\x00','\x1ba\x00','\x1ba\x01'].reduce((value,command)=>value.replaceAll(command,''),text);
  for(const line of printable.split('\n'))assert.ok(line.length<=48);
  assert.throws(()=>buildEscPosReceipt({...bill,table:6}),/Identitas/);
  assert.throws(()=>buildEscPosReceipt({...bill,total:'x'.repeat(48)}),/Nominal/);
});
test('optional logo raster and cutter follow the selected device profile',()=>{
  const rgba=new Uint8Array(8*4); // fully transparent, so no black pixels
  const bytes=buildEscPosReceipt({...bill,logo:{width:8,height:1,rgba}},{...escPos80,cut:'partial'});
  const signature=[29,118,48,0,1,0,1,0,0];
  assert.ok(bytes.some((_,i)=>signature.every((b,j)=>bytes[i+j]===b)));
  assert.deepEqual([...bytes.slice(-3)],[29,86,1]);
  assert.throws(()=>buildEscPosReceipt({...bill,logo:{width:577,height:1,rgba:new Uint8Array(577*4)}}),/lebar cetak/);
  assert.throws(()=>buildEscPosReceipt(bill,{...escPos80,columns:12}),/Profil/);
});
test('printer adapters reject disconnected or unsupported devices and never imply paper confirmation',async()=>{
  const registry=new PrinterAdapters();let calls=0;
  await assert.rejects(registry.print('missing','job1',bill),/belum terhubung/);
  for(const transport of ['usb','bluetooth-classic','bluetooth-le','tcp']) {
    registry.register({id:transport,transport,supports:p=>p.id===escPos80.id,submit:async job=>{
      calls++;assert.ok(job.bytes instanceof Uint8Array);assert.equal(job.paperWidthMm,80);
      return {jobId:job.id,status:'submitted',paperConfirmed:false};
    }});
    assert.deepEqual(await registry.print(transport,'job1',bill),{jobId:'job1',status:'submitted',paperConfirmed:false});
  }
  await assert.rejects(registry.print('usb','job2',bill,{...escPos80,id:'other'}),/tidak mendukung/);assert.equal(calls,4);
  assert.throws(()=>registry.register({id:'usb'}),/terdaftar/);
  registry.register({id:'bad',transport:'tcp',supports:()=>true,submit:async()=>({jobId:'different',status:'submitted',paperConfirmed:true})});
  await assert.rejects(registry.print('bad','job3',bill),/Respons/);
});
test('concurrent EDC purchase repeats share one attempt, regardless of property order',async()=>{
  let calls=0;const coordinator=new EdcCoordinator({id:'fake',purchase:async r=>{calls++;return approved(r);},lookup:async r=>approved(r)});
  const [first,second]=await Promise.all([coordinator.purchase(request),coordinator.purchase({currency:'IDR',amount:40000,billId:'demo-123',requestId:'attempt-1'})]);
  assert.equal(calls,1);assert.deepEqual(first,second);assert.equal(first.status,'approved');
  assert.throws(()=>coordinator.purchase({...request,amount:30000}),/tagihan berbeda/);
  await assert.rejects(coordinator.reconcile({...request,billId:'other'}),/tagihan berubah/);
});
test('terminal timeout stays unknown without recharging; lookup recovers matched approval',async()=>{
  let calls=0,lookups=0;
  const coordinator=new EdcCoordinator({id:'fake',purchase:async()=>{calls++;throw new Error('timeout');},lookup:async r=>{lookups++;return approved(r);}});
  assert.equal((await coordinator.purchase(request)).status,'unknown');
  assert.equal((await coordinator.purchase(request)).status,'unknown');assert.equal(calls,1);
  const results=await Promise.all([coordinator.reconcile(request),coordinator.reconcile(request)]);
  assert.ok(results.every(r=>r.status==='approved'));assert.equal(lookups,1);assert.equal(calls,1);
});
test('mismatched terminal approvals cannot be accepted; decline stays declined',async()=>{
  for(const change of [{requestId:'other'},{amount:1},{currency:'USD'},{reference:''}]) {
    const coordinator=new EdcCoordinator({id:'fake',purchase:async r=>({...approved(r),...change}),lookup:async r=>({...approved(r),...change})});
    assert.equal((await coordinator.purchase(request)).status,'unknown');assert.equal((await coordinator.reconcile(request)).status,'unknown');
  }
  let lookups=0;const coordinator=new EdcCoordinator({id:'fake',purchase:async r=>({status:'declined',requestId:r.requestId,reason:'Declined'}),lookup:async r=>{lookups++;return approved(r);}});
  assert.equal((await coordinator.purchase(request)).status,'declined');assert.equal((await coordinator.reconcile(request)).status,'declined');assert.equal(lookups,0);
  for(const amount of [0,-1,1.5,Infinity])assert.throws(()=>coordinator.purchase({...request,amount}),/tidak valid/);
});
