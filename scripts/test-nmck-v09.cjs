'use strict';
const assert=require('node:assert/strict');
const base='../app/src/main/assets/';
const E=require(base+'engine.js');
require(base+'upgrade.js');require(base+'nmck-advanced.js');
const S=require(base+'sheet-engine.js');S.setEngine(E);
const X=require(base+'xlsx-export.js');
let done=0,variationAbove=0;
for(const level of ['easy','medium','hard'])
 for(const offers of [3,4,5])
  for(const lots of [1,2,3])
   for(let i=0;i<40;i++){
    const t=E.generate('nmck',level,{offers,lots});
    assert.equal(t.rows.length,lots);assert.equal(t.offers,offers);
    const w=S.create(t);
    assert(w.targets.some(x=>x.addr==='O4'),'homogeneity target missing');
    for(let j=0;j<lots;j++){
      const r=j+4,prices=t.rows[j].prices,range='E'+r+':I'+r;
      assert.equal(prices.length,offers);
      const mean=prices.reduce((a,b)=>a+b,0)/offers;
      const sd=Math.sqrt(prices.reduce((a,b)=>a+(b-mean)**2,0)/(offers-1));
      const cv=100*sd/mean;
      assert.equal(t.questions.find(x=>x.id==='n'+j+'avg').answer,E.round(mean));
      assert.equal(t.questions.find(x=>x.id==='n'+j+'sd').answer,E.round(sd));
      assert.equal(t.questions.find(x=>x.id==='n'+j+'cv').answer,E.round(cv));
      if(cv>33)variationAbove++;
      const formulas={
       J:'=SUM('+range+')',K:'=AVERAGE('+range+')',L:'=STDEV.S('+range+')',
       M:'=L'+r+'/K'+r+'*100',N:'=ROUND(K'+r+';2)*D'+r,
       O:'=IF(M'+r+'<=33;"Однородны";"Неоднородны")'
      };
      for(const [col,expr] of Object.entries(formulas))S.write(w,'НМЦК',col+r,expr);
      assert.equal(S.value(w,'НМЦК','K'+r),mean,'average must ignore empty prices');
      assert.equal(S.value(w,'НМЦК','O'+r),cv<=33?'Однородны':'Неоднородны');
    }
    S.write(w,'НМЦК','N'+(lots+5),'=SUM(N4:N'+(lots+3)+')');
    const result=S.grade(w);
    assert.equal(result.percent,100,JSON.stringify(result.results.filter(x=>x.status!=='ok')));
    if(i===0){const bytes=X.exportBytes(w);assert(bytes.length>2500);assert.equal(bytes[0],80);assert.equal(bytes[1],75);}
    done++;
   }
const t=E.generate('nmck','easy',{offers:3,lots:1}),w=S.create(t);
S.write(w,'НМЦК','J4','=COUNT(E4:I4)');
assert.equal(S.value(w,'НМЦК','J4'),3,'COUNT must ignore blanks');
S.write(w,'НМЦК','J4','=STDEV.S(E4:I4)');
assert.equal(S.value(w,'НМЦК','J4'),Math.sqrt(t.rows[0].prices.reduce((s,p)=>s+(p-t.rows[0].prices.reduce((a,b)=>a+b,0)/3)**2,0)/2));
console.log('PASS NMCK v0.9:',done,'randomized 3/4/5-offer & 1/2/3-lot workbooks; outlier cases',variationAbove);
