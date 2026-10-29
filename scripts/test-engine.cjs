'use strict';
const assert=require('node:assert/strict');
const E=require('../app/src/main/assets/engine.js');
let count=0;
for(const kind of ['nmck','budget','financial'])for(const level of ['easy','medium','hard'])for(let i=0;i<50;i++){
 const t=E.generate(kind,level);
 assert(t.questions.length>0);
 assert.equal(new Set(t.questions.map(x=>x.id)).size,t.questions.length,'duplicate question id');
 const answers=Object.fromEntries(t.questions.map(q=>[q.id,String(q.answer)]));
 const grade=E.grade(t,answers);
 assert.equal(grade.ok,grade.total,'valid answers rejected for '+kind+'/'+level);
 assert.equal(E.check(t.questions[0],''),'empty');
 const first=t.questions.find(x=>typeof x.answer==='number');
 assert.equal(E.check(first,String(first.answer+Math.max(10,Math.abs(first.answer)*0.5))),'bad');
 if(kind==='nmck'){
   let expected=0;
   t.rows.forEach((r,j)=>{
      const avg=r.prices.reduce((a,b)=>a+b,0)/r.prices.length;
      const sd=Math.sqrt(r.prices.reduce((a,b)=>a+(b-avg)**2,0)/(r.prices.length-1));
      expected+=E.round(avg)*r.quantity;
      assert.equal(t.questions.find(q=>q.id==='n'+j+'sum').answer,r.prices.reduce((a,b)=>a+b,0));
      assert.equal(t.questions.find(q=>q.id==='n'+j+'avg').answer,E.round(avg));
      if(level!=='easy'){
        assert.equal(t.questions.find(q=>q.id==='n'+j+'sd').answer,E.round(sd));
        assert.equal(t.questions.find(q=>q.id==='n'+j+'cv').answer,E.round(100*sd/avg));
      }
   });
   assert.equal(t.questions.find(q=>q.id==='total').answer,E.round(expected));
 }
 if(kind==='budget'){
   for(const type of ['Доход','Расход']){
     const rows=t.rows.filter(x=>x.kind===type);
     assert.equal(t.summary[type].plan,rows.reduce((a,r)=>a+r.plan,0));
     assert.equal(t.summary[type].actual,rows.reduce((a,r)=>a+r.actual,0));
   }
   assert.equal(t.questions.find(q=>q.id==='balance').answer,t.summary.Доход.actual-t.summary.Расход.actual);
 }
 if(kind==='financial'){
   for(const y of ['2023','2024','2025']){
      const b=t.balance[y];
      assert.equal(b['1600'],b['1700']);
      assert.equal(b['1600'],b['1100']+b['1200']);
      assert.equal(b['1700'],b['1300']+b['1400']+b['1500']);
   }
   for(const y of ['2024','2025']){
      const p=t.pl[y];
      assert.equal(p['2400'],p['2300']+p['2410']);
   }
 }
 count++;
}
console.log('PASS: '+count+' randomly generated training variants.');
