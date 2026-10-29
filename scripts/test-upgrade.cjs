'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const base=path.join(__dirname,'../app/src/main/assets');
require(path.join(base,'engine.js'));
require(path.join(base,'upgrade.js'));
const E=globalThis.ExamEngine;
const sum=(r,arr)=>arr.reduce((a,k)=>a+(r[k]||0),0);
const requiredBal=['1100','1110','1120','1150','1170','1200','1210','1220','1230','1240','1250','1260','1300','1310','1340','1350','1360','1370','1400','1410','1420','1430','1450','1500','1510','1520','1530','1540','1550','1600','1700'];
const requiredPnl=['2110','2120','2100','2210','2220','2200','2310','2320','2330','2340','2350','2300','2410','2411','2412','2460','2400'];
let checked=0, deficit=0, surplus=0;
for(const kind of ['nmck','budget','financial'])for(const level of ['easy','medium','hard'])for(let i=0;i<100;i++){
 const t=E.generate(kind,level);
 assert(t.questions.length>0);
 assert.equal(new Set(t.questions.map(q=>q.id)).size,t.questions.length);
 const all=Object.fromEntries(t.questions.map(q=>[q.id,String(q.answer)]));
 assert.equal(E.grade(t,all).percent,100,kind+'/'+level);
 if(kind==='nmck'){
  assert(t.rows.length>0,'NMCQ offers absent');
  const expected=t.rows.reduce((n,r,j)=>{
   assert(r.name && r.quantity>0 && r.prices.length>=3);
   const avg=r.prices.reduce((a,b)=>a+b,0)/r.prices.length;
   assert.equal(t.questions.find(q=>q.id==='n'+j+'avg').answer,E.round(avg));
   return n+E.round(avg)*r.quantity;
  },0);
  assert.equal(t.questions.find(q=>q.id==='total').answer,E.round(expected));
 }
 if(kind==='budget'){
  for(const side of ['Доход','Расход']){
   const rows=t.rows.filter(r=>r.kind===side);
   assert(rows.length>=1 && rows.every(r=>r.category && r.plan>0 && r.actual>=0));
   assert.equal(rows.reduce((x,r)=>x+r.plan,0),t.summary[side].plan);
   assert.equal(rows.reduce((x,r)=>x+r.actual,0),t.summary[side].actual);
  }
  const saldo=t.summary.Доход.actual-t.summary.Расход.actual;
  assert.equal(t.questions.some(q=>q.id==='balance'),false,'No budget saldo question');
  assert.equal(t.questions.find(q=>q.id==='status').answer,saldo>0?'Профицит':saldo<0?'Дефицит':'Сбалансирован');
  if(saldo<0)deficit++;if(saldo>0)surplus++;
  assert.equal(new Set(t.rows.map(r=>r.name)).size,t.rows.length);
 }
 if(kind==='financial'){
  for(const year of ['2023','2024','2025']){
   const b=t.balance[year];for(const k of requiredBal)assert(Number.isFinite(b[k]),year+' code '+k);
   assert.equal(sum(b,['1110','1120','1130','1140','1150','1160','1170','1180','1190']),b['1100']);
   assert.equal(sum(b,['1210','1215','1220','1230','1240','1250','1260']),b['1200']);
   assert.equal(sum(b,['1310','1320','1340','1350','1360','1370']),b['1300']);
   assert.equal(sum(b,['1410','1420','1430','1450']),b['1400']);
   assert.equal(sum(b,['1510','1520','1530','1540','1550']),b['1500']);
   assert.equal(b['1100']+b['1200'],b['1600']);
   assert.equal(b['1300']+b['1400']+b['1500'],b['1700']);
  }
  for(const year of ['2024','2025']){
   const p=t.pl[year];for(const k of requiredPnl)assert(Number.isFinite(p[k]),year+' pnl '+k);
   assert.equal(p['2100']+p['2210']+p['2220'],p['2200']);
   assert.equal(p['2200']+sum(p,['2310','2320','2330','2340','2350']),p['2300']);
   assert.ok(Math.abs((p['2411']+p['2412'])-p['2410'])<1e-8,'Tax subtotals differ');
   assert.equal(p['2300']+p['2410']+p['2460'],p['2400']);
  }
 }
 checked++;
}
assert(deficit>0&&surplus>0,'Both balanced budget outcomes must occur');
console.log('PASS: '+checked+' enhanced variants; budget deficits '+deficit+', surpluses '+surplus);
