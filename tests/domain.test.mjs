import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed, transition, status, countdown, due, paid, total, validateState, migrateState, drawer, openShift, report, localDay, SESSION_REMINDER_MS, sessionEndingSoon, sessionReminderKey } from '../packages/domain/index.ts';

const now = Date.UTC(2026, 9, 11, 8, 0);
const change = (s,a,role='cashier',at=now) => transition(s,a,role,at);
const start = (s,extra={}) => change(s,{type:'start',tableId:3,minutes:120,policy:'postpaid',method:'cash',tendered:160000,...extra});

test('ten-minute reminder includes exact boundary and catches resume, excluding expired/inactive sessions', () => {
  const s=seed(now),table=s.tables[1],expires=table.session.expires;
  assert.equal(sessionEndingSoon(table,expires-SESSION_REMINDER_MS-1),false);
  assert.equal(sessionEndingSoon(table,expires-SESSION_REMINDER_MS),true);
  assert.equal(sessionEndingSoon(table,expires-7*60000),true);
  assert.equal(sessionEndingSoon(table,expires-1),true);
  assert.equal(sessionEndingSoon(table,expires),false);
  assert.equal(sessionEndingSoon(table,expires+60000),false);
  assert.equal(sessionEndingSoon(s.tables[2],now),false);
  assert.equal(sessionEndingSoon({...table,state:'cleaning'},expires-60000),false);
});
test('extension gives a new reminder identity without changing the session identity', () => {
  const s=seed(now),table=s.tables[1],at=table.session.expires-60000,originalKey=sessionReminderKey(table);
  const next=change(s,{type:'extend',tableId:2,minutes:30,method:'cash',tendered:0},'cashier',at);
  assert.equal(next.tables[1].session.id,table.session.id);
  assert.notEqual(sessionReminderKey(next.tables[1]),originalKey);
  assert.equal(sessionEndingSoon(next.tables[1],at),false);
  assert.equal(sessionEndingSoon(next.tables[1],next.tables[1].session.expires-SESSION_REMINDER_MS),true);
});

test('seed and all initial states contain exactly five unique table slots', () => {
  const s = seed(now); assert.equal(validateState(s),true); assert.deepEqual(s.tables.map(t => t.id),[1,2,3,4,5]);
  assert.equal(status(s.tables[4],now),'expired'); assert.equal(status(s.tables[2],now),'available');
});
test('overlapping sessions rejected without mutating original', () => {
  const s = start(seed(now)); const copy = structuredClone(s);
  assert.throws(() => start(s),/belum tersedia/); assert.deepEqual(s,copy);
});
test('postpaid start activates with full outstanding and no payment', () => {
  const s = start(seed(now)), session = s.tables[2].session;
  assert.equal(due(session),160000); assert.equal(paid(session),0); assert.equal(session.expires,now+120*60000);
});
test('prepaid and mixed cash require full tender and record only the charge, not tender', () => {
  for(const policy of ['prepaid','mixed']) {
    assert.throws(() => start(seed(now),{policy,tendered:150000}),/Uang diterima/);
    const s = start(seed(now),{policy,tendered:200000}); assert.equal(paid(s.tables[2].session),160000); assert.equal(due(s.tables[2].session),0);
  }
});
test('pending QRIS start neither activates nor counts as paid; settlement uses quoted rate', () => {
  let s = start(seed(now),{policy:'prepaid',method:'qris'}); assert.equal(s.tables[2].state,'available'); assert.equal(s.tables[2].session,null);
  const intentId = s.intents[0].id;
  s = change(s,{type:'rate',kind:'Standard',price:100000},'owner');
  s = change(s,{type:'settle',intentId}); assert.equal(s.tables[2].state,'active'); assert.equal(s.tables[2].session.rate,80000); assert.equal(paid(s.tables[2].session),160000);
  assert.throws(() => change(s,{type:'settle',intentId}),/sudah diproses/);
});
test('pending start blocks duplicate start and can be cancelled', () => {
  let s = start(seed(now),{policy:'mixed',method:'transfer'}); assert.throws(() => start(s),/pending/);
  s = change(s,{type:'cancel-intent',intentId:s.intents[0].id}); s = start(s); assert.ok(s.tables[2].session);
});
test('expired cutoff clamps clock at zero and blocks F&B without creating late charges', () => {
  const s = seed(now), t=s.tables[4], old=total(t.session);
  assert.equal(countdown(t.session.expires,now),'00:00:00'); assert.equal(status(t,now),'expired');
  assert.throws(() => change(s,{type:'order',tableId:5,productId:'p1',quantity:1}),/sesi aktif/); assert.equal(total(t.session),old);
});
test('extend active adds to previous cutoff; expired reactivates from now', () => {
  const s = seed(now); let next=change(s,{type:'extend',tableId:1,minutes:30,prepaid:false,method:'cash',tendered:0});
  assert.equal(next.tables[0].session.expires,s.tables[0].session.expires+30*60000);
  next=change(s,{type:'extend',tableId:5,minutes:60,prepaid:false,method:'cash',tendered:0});
  assert.equal(next.tables[4].session.expires,now+60*60000); assert.equal(status(next.tables[4],now),'active'); assert.equal(total(next.tables[4].session),240000);
});
test('prepaid extension remains unapplied while pending and applies exactly once on settlement', () => {
  let s = seed(now), old=s.tables[0].session.expires;
  s=change(s,{type:'extend',tableId:1,minutes:60,prepaid:true,method:'qris',tendered:0});
  assert.equal(s.tables[0].session.expires,old); assert.equal(total(s.tables[0].session),160000);
  const intentId=s.intents[0].id; s=change(s,{type:'settle',intentId}); assert.equal(s.tables[0].session.expires,old+60*60000); assert.equal(due(s.tables[0].session),0);
  assert.throws(() => change(s,{type:'settle',intentId}),/sudah diproses/);
});
test('owner price/rate/HPP changes never rewrite session/order snapshots', () => {
  let s=seed(now); s=change(s,{type:'order',tableId:1,productId:'p4',quantity:2});
  s=change(s,{type:'price',productId:'p4',price:25000,cost:9000},'owner'); s=change(s,{type:'rate',kind:'Standard',price:100000},'owner');
  s=change(s,{type:'extend',tableId:1,minutes:60,prepaid:false,method:'cash',tendered:0});
  const charges=s.tables[0].session.charges; assert.equal(charges[1].amount,36000); assert.equal(charges[1].cost,12000); assert.equal(charges[2].amount,80000);
  s=change(s,{type:'order',tableId:1,productId:'p4',quantity:1}); assert.equal(s.tables[0].session.charges.at(-1).amount,25000);
});
test('orders decrement inventory once; fractional/overstock/archived orders rejected', () => {
  let s=seed(now); const stock=s.products[0].stock;
  s=change(s,{type:'order',tableId:1,productId:'p1',quantity:2}); assert.equal(s.products[0].stock,stock-2);
  for(const quantity of [0,1.5,100]) assert.throws(() => change(s,{type:'order',tableId:1,productId:'p1',quantity}),/stok/);
  s=change(s,{type:'toggle-product',productId:'p1'},'owner'); assert.throws(() => change(s,{type:'order',tableId:1,productId:'p1',quantity:1}),/stok/);
});
test('partial cash plus pending noncash keeps balance outstanding until verified simulation', () => {
  let s=start(seed(now)); s=change(s,{type:'payment',tableId:3,method:'cash',amount:60000,tendered:100000}); assert.equal(due(s.tables[2].session),100000);
  s=change(s,{type:'payment',tableId:3,method:'qris',amount:100000,tendered:0}); assert.equal(due(s.tables[2].session),100000);
  assert.throws(() => change(s,{type:'checkout',tableId:3}),/lunas/);
  s=change(s,{type:'settle',intentId:s.intents[0].id}); assert.equal(due(s.tables[2].session),0);
  s=change(s,{type:'checkout',tableId:3}); assert.equal(s.tables[2].state,'cleaning'); assert.equal(s.tables[2].session,null);
  s=change(s,{type:'ready',tableId:3}); assert.equal(s.tables[2].state,'available');
});
test('negative, fractional and excessive cash payments are rejected', () => {
  const s=start(seed(now)); for(const amount of [-1,0,1.5,160001]) assert.throws(() => change(s,{type:'payment',tableId:3,method:'cash',amount,tendered:999999}),/Nominal/);
  assert.throws(() => change(s,{type:'payment',tableId:3,method:'cash',amount:10000,tendered:5000}),/cukup/);
});
test('cashier forbidden from all owner configuration actions', () => {
  const s=seed(now);
  const actions=[{type:'price',productId:'p1',price:9000,cost:1000},{type:'rate',kind:'Standard',price:90000},{type:'stock',productId:'p1',delta:10,reason:'Restock'},{type:'catalog',product:s.products[0]},{type:'toggle-product',productId:'p1'},{type:'staff',staff:s.staff[1]},{type:'approval',id:'approval-demo',decision:'approved'}];
  for(const a of actions) assert.throws(() => change(s,a),/Hanya owner/);
});
test('restock/adjustment requires reason, does not permit negative inventory, and audits', () => {
  let s=seed(now); assert.throws(() => change(s,{type:'stock',productId:'p1',delta:-100,reason:'Rusak'},'owner'),/valid/);
  assert.throws(() => change(s,{type:'stock',productId:'p1',delta:2,reason:''},'owner'),/valid/);
  s=change(s,{type:'stock',productId:'p1',delta:10,reason:'Restock supplier'},'owner'); assert.equal(s.products[0].stock,46); assert.match(s.audit[0].title,/Restock supplier/);
});
test('last active owner cannot be disabled or demoted', () => {
  const s=seed(now); assert.throws(() => change(s,{type:'staff',staff:{...s.staff[0],active:false}},'owner'),/satu owner/);
});
test('approval simulation is audited, cannot be repeated, and does not pretend to refund money', () => {
  let s=seed(now), before=s.records; s=change(s,{type:'approval',id:'approval-demo',decision:'approved'},'owner');
  assert.deepEqual(s.records,before); assert.match(s.audit[0].title,/tidak mengubah ledger/);
  assert.throws(() => change(s,{type:'approval',id:'approval-demo',decision:'approved'},'owner'),/diproses/);
});
test('closing and reopening shift preserves sessions; all transactions require an open shift', () => {
  let s=seed(now); const shift=openShift(s), expected=drawer(s,shift), original=structuredClone(s.tables);
  s=change(s,{type:'shift-close',counted:expected-10000}); assert.equal(s.shifts[0].counted-drawer(s,s.shifts[0]),-10000); assert.deepEqual(s.tables,original);
  assert.throws(() => start(s),/Buka shift/); s=change(s,{type:'shift-open',opening:100000}); assert.ok(openShift(s)); s=start(s); assert.ok(s.tables[2].session);
});
test('shift closure blocks pending payments', () => {
  const s=start(seed(now),{policy:'prepaid',method:'qris'}); assert.throws(() => change(s,{type:'shift-close',counted:0}),/pending/);
});
test('report uses settled records and historical costs; payment cash is not double counted at checkout', () => {
  let s=seed(now), before=report(s,localDay(now)); s=start(s); s=change(s,{type:'order',tableId:3,productId:'p4',quantity:1});
  s=change(s,{type:'payment',tableId:3,method:'cash',amount:178000,tendered:200000}); const beforeCheckout=report(s,localDay(now));
  assert.equal(beforeCheckout.sales,before.sales); assert.equal(beforeCheckout.cash,before.cash+178000);
  s=change(s,{type:'checkout',tableId:3}); const after=report(s,localDay(now)); assert.equal(after.cash,beforeCheckout.cash); assert.equal(after.sales,before.sales+178000); assert.equal(after.cost,before.cost+6000);
});
test('malformed stored data and six-table state rejected, original valid state accepted', () => {
  const s=seed(now); assert.ok(validateState(JSON.parse(JSON.stringify(s))));
  for(const bad of [null,{}, {...s,version:3},{...s,tables:[...s.tables,s.tables[0]]},{...s,products:[{...s.products[0],stock:-1}]},{...s,records:[{}]},{...s,intents:[{}]},{...s,audit:[{}]}]) assert.equal(validateState(bad),false);
});
test('timer reconstructs from persisted timestamp after long tablet sleep', () => {
  const s=seed(now); const restored=JSON.parse(JSON.stringify(s)); assert.equal(status(restored.tables[0],now+3*3600000),'expired'); assert.equal(countdown(restored.tables[0].session.expires,now+3*3600000),'00:00:00');
});
test('invalid duration, odd half-hour rate and missing table rejected', () => {
  const s=seed(now); assert.throws(() => start(s,{minutes:25}),/Durasi/); assert.throws(() => change(s,{type:'rate',kind:'Standard',price:80001},'owner'),/genap/); assert.throws(() => change(s,{type:'ready',tableId:6}),/Meja tidak ditemukan/);
});
test('oversized rental and order totals rejected before mutation rather than creating unreloadable state', () => {
  let s=seed(now); s=change(s,{type:'rate',kind:'Standard',price:100000000},'owner');
  assert.throws(() => start(s),/batas nominal/); assert.equal(s.tables[2].session,null);
  s=change(s,{type:'price',productId:'p1',price:100000000,cost:100000000},'owner');
  assert.throws(() => change(s,{type:'order',tableId:1,productId:'p1',quantity:2}),/batas nominal/); assert.equal(s.products[0].stock,36);
});

test('all five tables share a single Standard rate; alternative classes are rejected', () => {
  const s=seed(now);
  assert.ok(s.tables.every(t=>t.kind==='Standard'));
  assert.deepEqual(s.rates,{Standard:80000});
  assert.equal(validateState({...s,tables:s.tables.map((t,i)=>i===1?{...t,kind:'VIP'}:t)}),false);
  assert.equal(validateState({...s,rates:{...s.rates,VIP:120000}}),false);
  assert.throws(()=>change(s,{type:'rate',kind:'VIP',price:120000},'owner'),/Standard/);
});

test('legacy migration preserves bills, payments, outstanding, pending quotes and historical snapshots', () => {
  const legacy=seed(now);
  legacy.version=1;legacy.rates.VIP=120000;
  legacy.tables[1].kind='VIP';legacy.tables[1].session.rate=120000;
  legacy.tables[1].session.charges[0].amount=360000;
  legacy.tables[1].session.charges[0].label='Sewa 3 jam · VIP';
  legacy.intents.push({id:'legacy-quote',tableId:3,kind:'start',method:'qris',amount:240000,status:'pending',at:now,minutes:120,policy:'prepaid'});
  const before=structuredClone(legacy);
  const result=migrateState(legacy,now);
  assert.equal(result.version,2);assert.equal(result.revision,before.revision+1);
  assert.equal(validateState(result),true);assert.ok(result.tables.every(t=>t.kind==='Standard'));
  assert.deepEqual(result.rates,{Standard:80000});
  for(const field of ['records','intents','products','shifts','staff','approvals'])assert.deepEqual(result[field],before[field]);
  assert.deepEqual(result.tables.map(t=>t.session),before.tables.map(t=>t.session));
  assert.equal(due(result.tables[1].session),360000);
  assert.deepEqual(legacy,before,'migration must not mutate the old dataset');
  assert.strictEqual(migrateState(result,now),result,'migration is idempotent');
  const settled=change(result,{type:'settle',intentId:'legacy-quote'});
  assert.equal(settled.tables[2].session.rate,120000,'a pending quote retains its agreed rate');
  assert.equal(total(settled.tables[2].session),240000);
});

test('malformed legacy data fails migration rather than overwriting saved transactions', () => {
  const legacy={...seed(now),version:1,rates:{Standard:80000,VIP:120000}};
  for(const bad of [{...legacy,rates:{Standard:80000,VIP:-1}},{...legacy,records:[{}]}, {...legacy,tables:[]}, {...legacy,version:0}])assert.throws(()=>migrateState(bad,now),/non valide|pas valide|tidak valid/);
});
