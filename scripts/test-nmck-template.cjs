'use strict';
const assert=require('node:assert/strict');
const E=require('../app/src/main/assets/engine.js');
require('../app/src/main/assets/upgrade.js');
require('../app/src/main/assets/nmck-advanced.js');
const S=require('../app/src/main/assets/sheet-engine.js');
require('../app/src/main/assets/nmck-template.js');
S.setEngine(E);
const X=require('../app/src/main/assets/xlsx-export.js');
let count=0;
for(const offers of [3,4,5])for(const lots of [1,2,3])for(let i=0;i<60;i++){
 const t=E.generate('nmck','hard',{offers,lots});
 assert.equal(t.rows.length,lots);
 assert(t.rows.every(r=>r.prices.length===offers));
 const w=S.create(t),sh=w.sheets['НМЦК'];
 assert.equal(sh.cols,offers+10);
 assert.equal(w.order.length,1);
 assert.equal(sh.values['A1'].raw,'Обоснование начальной (максимальной) цены контракта');
 assert.equal(sh.spans.A1,offers+10);
 assert.equal(sh.spans.E4,offers);
 assert.equal(w.targets.length,6*lots+1);
 const avg=String.fromCharCode(69+offers),sd=String.fromCharCode(70+offers),cv=String.fromCharCode(71+offers);
 const calc=String.fromCharCode(72+offers),unit=String.fromCharCode(73+offers),amount=String.fromCharCode(74+offers);
 for(let k=0;k<lots;k++){
  const row=k+6,range='E'+row+':'+String.fromCharCode(68+offers)+row;
  const steps=[
   [avg,'=AVERAGE('+range+')'],
   [sd,'=STDEV.S('+range+')'],
   [cv,'='+sd+row+'/'+avg+row+'*100'],
   [calc,'=ROUND('+avg+row+';2)*D'+row],
   [unit,'=ROUND('+avg+row+';2)'],
   [amount,'='+unit+row+'*D'+row]
  ];
  for(const [column,formula] of steps)S.write(w,'НМЦК',column+row,formula);
  assert.equal(sh.values['B'+row].raw,t.rows[k].name);
  assert.equal(sh.values['D'+row].raw,t.rows[k].quantity);
 }
 const endRow=lots+5,footer=lots+6;
 S.write(w,'НМЦК',amount+footer,'=SUM('+amount+'6:'+amount+endRow+')');
 const grade=S.grade(w);
 assert.equal(grade.passed,grade.total,JSON.stringify(grade.results.filter(r=>r.status!=='ok')));
 assert.equal(grade.percent,100);
 const rawXlsx=Buffer.from(X.exportBytes(w)).toString('utf8');
 assert(rawXlsx.includes('<mergeCells count=\"'), 'Missing Excel merged NMCK headings');
 assert(rawXlsx.includes('Обоснование начальной'), 'Missing Excel NMCK title');
 assert(rawXlsx.includes('<cellXfs count=\"4\">'), 'Missing style block');
 assert(!rawXlsx.includes('</cellXfs><xf '), 'Malformed XLSX styles XML');
 assert.throws(()=>S.write(w,'НМЦК','E6','=1+1'));
 const restored=S.create(t);S.load(restored,S.save(w));
 assert.equal(S.grade(restored).passed,restored.targets.length);
 count++;
}
// Other exam modules must not be modified by the NMCK wrapper.
for(const kind of ['budget','financial']){
 const t=E.generate(kind,'medium'),w=S.create(t);
 assert(w.order.length&&w.targets.length);
 assert.notEqual(w.template,'nmck-solved');
}
console.log('PASS:',count,'NMCK worksheets, 3/4/5 offers, 1/2/3 lots; formulas, layout, protection, drafts');
