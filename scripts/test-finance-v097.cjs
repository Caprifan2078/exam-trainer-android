'use strict';
const assert=require('node:assert/strict');
const E=require('../app/src/main/assets/engine.js');
require('../app/src/main/assets/upgrade.js');
const S=require('../app/src/main/assets/sheet-engine.js');
const H=require('../app/src/main/assets/financial-formulas.js');
S.setEngine(E);
let worksheets=0,formulas=0;
for(const level of ['easy','medium','hard'])for(let i=0;i<90;i++){
 const t=E.generate('financial',level),w=S.create(t);
 assert.equal(t.metrics.length,24);
 assert.equal(w.targets.length,48);
 assert.equal(t.questions[0].group,'Ликвидность');
 assert.equal(t.metrics.filter(x=>x.section==='Финансовая устойчивость').length,5);
 assert.equal(t.metrics.filter(x=>x.section==='Рентабельность').length,3);
 for(const [column,year] of [['C','2025'],['D','2024']]){
  const b=t.balance[year];
  const result=t.questions.find(q=>q.label==='Коэффициент финансовой устойчивости — '+year);
  assert(result,'Missing financial-stability coefficient for '+year);
  assert.equal(result.answer,E.round((b['1300']+b['1400'])/b['1600']));
  for(let idx=16;idx<24;idx++){
    const addr=column+(idx+3);
    const candidates=H.suggest(t,'Анализ',column,idx+3,E);
    assert.equal(candidates.length,1,'Missing linked-cell suggestion for '+idx+'/'+year);
    const [label,formula]=candidates[0];assert(formula.startsWith('='));
    assert(/Баланс!/.test(formula)||/ОФР!/.test(formula));
    S.write(w,'Анализ',addr,formula);
    const target=w.targets.find(x=>x.sheet==='Анализ'&&x.addr===addr);
    assert(target&&target.id==='f'+idx+year,addr+' / '+year+' wrong target id');
    const evaluated=S.value(w,'Анализ',addr);
    assert.equal(typeof evaluated,'number',formula+' should evaluate');
    assert(Math.abs(evaluated-target.answer)<=.0101,'Wrong formula '+formula+': got '+evaluated+', expected '+target.answer);
    formulas++;
  }
 }
 assert.equal(H.suggest(t,'Анализ','C',3,E).length,0,'No shortcut for liquidity');
 assert.equal(H.suggest(t,'Баланс','C',19,E).length,0);
 assert.equal(w.sheets.Анализ.values.A3.raw,'Ликвидность');
 worksheets++;
}
for(const level of ['easy','medium','hard']){
 const t=E.generate('budget',level),w=S.create(t);
 assert(!t.questions.some(q=>q.id==='balance'));
 assert(!w.targets.some(q=>q.id==='balance'));
 assert(!Object.values(w.sheets.Бюджет.values).some(x=>/сальдо бюджета/i.test(String(x.raw))));
}
console.log('PASS',worksheets,'financial workbooks /',formulas,'linked formulas, budget no saldo');
