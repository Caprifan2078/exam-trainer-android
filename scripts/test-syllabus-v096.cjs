'use strict';
const assert=require('node:assert/strict');
const E=require('../app/src/main/assets/engine.js');
require('../app/src/main/assets/upgrade.js');
const S=require('../app/src/main/assets/sheet-engine.js');
S.setEngine(E);
for(const level of ['easy','medium','hard']){
 for(let i=0;i<150;i++){
  const t=E.generate('financial',level),w=S.create(t);
  const a=w.sheets['Анализ'];
  assert(a&&w.sheets['Баланс']&&w.sheets['ОФР']);
  assert.equal(t.metrics.length,24,'Full coefficient list must always appear');
  assert.equal(w.targets.length,48,'2025 and 2024 must have all coefficients');
  assert.equal(t.questions.length,48,'No preparatory average rows allowed');
  assert.equal(t.questions[0].group,'Ликвидность','First category should be liquidity');
  assert(!t.questions.some(q=>q.group==='Средние величины'||q.id.startsWith('avg')));
  assert.equal(a.values['A3'].raw,'Ликвидность');
  assert.equal(a.values['C1'].raw,'2025');
  assert.equal(a.values['D1'].raw,'2024');
  const stability=t.metrics.filter(m=>m.section==='Финансовая устойчивость');
  assert.equal(stability.length,5,'Autonomy/dependence/leverage/maneuverability/stability ratio');
  assert.equal(stability[4].name,'Коэффициент финансовой устойчивости');
  const profitability=t.metrics.filter(m=>m.section==='Рентабельность');
  assert.equal(profitability.length,3,'ROA ROS ROE');
  for(const word of ['ROA','ROS','ROE'])
    assert(profitability.some(m=>m.name.startsWith(word+' ')),word+' missing');
  for(const yr of ['2024','2025']){
   const b=t.balance[yr],p=t.pl[yr],prev=t.balance[String(Number(yr)-1)];
   const vals=t.questions;
   const get=(n)=>vals.find(q=>q.id==='f'+n+yr)?.answer;
   assert.equal(get(16),E.round(b['1300']/b['1600']));
   assert.equal(get(17),E.round(b['1600']/b['1300']));
   assert.equal(get(18),E.round((b['1400']+b['1500'])/b['1300']));
   assert.equal(get(19),E.round((b['1300']-b['1100'])/b['1300']));
   assert.equal(get(20),E.round((b['1300']+b['1400'])/b['1600']));
   assert.equal(get(21),E.round(100*p['2400']/((b['1600']+prev['1600'])/2)));
   assert.equal(get(22),E.round(100*p['2400']/p['2110']));
   assert.equal(get(23),E.round(100*p['2400']/b['1300']));
  }
  const budget=E.generate('budget',level),wb=S.create(budget),sh=wb.sheets['Бюджет'];
  assert(!budget.questions.some(q=>q.id==='balance'||/сальдо/i.test(q.label)));
  assert(!Object.values(sh.values).some(x=>/сальдо бюджета/i.test(String(x.raw))));
  assert(!wb.targets.some(x=>x.id==='balance'));
  const income=budget.summary.Доход.actual,expense=budget.summary.Расход.actual;
  assert.equal(budget.questions.find(q=>q.id==='status').answer,
     income>expense?'Профицит':income<expense?'Дефицит':'Сбалансирован');
  const pos=budget.rows.length+9;
  assert.equal(sh.values['B'+pos].raw,'ДЕФИЦИТ / ПРОФИЦИТ');
 }
}
console.log('PASS: 450 random samples, 24 financial ratios including 5 stability, ROA/ROS/ROE, no pre-liquidity task or budget saldo');
