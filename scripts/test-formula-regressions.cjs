'use strict';
const assert=require('node:assert/strict');
const E=require('../app/src/main/assets/engine.js');
require('../app/src/main/assets/upgrade.js');
require('../app/src/main/assets/nmck-advanced.js');
const S=require('../app/src/main/assets/sheet-engine.js');
require('../app/src/main/assets/nmck-template.js');
S.setEngine(E);
let runs=0;
for(const offers of [3,4,5])for(const lots of [1,2,3])for(let i=0;i<50;i++){
 const task=E.generate('nmck','hard',{offers,lots}),w=S.create(task),sh='НМЦК';
 const avg=S.col(4+offers),sd=S.col(5+offers),cv=S.col(6+offers),cal=S.col(7+offers),unit=S.col(8+offers),amount=S.col(9+offers);
 task.rows.forEach((r,j)=>{
  const row=6+j,range='E'+row+':'+S.col(3+offers)+row;
  const formulas=[
   [avg,'=СРЗНАЧ('+range+')'],[sd,'=СТАНДОТКЛОН.В('+range+')'],
   [cv,'='+sd+row+'/'+avg+row+'*100'],[cal,'=ОКРУГЛ('+avg+row+';2)*D'+row],
   [unit,'=ОКРУГЛ('+avg+row+';2)'],[amount,'='+unit+row+'*D'+row]
  ];
  formulas.forEach(([col,form])=>S.write(w,sh,col+row,form));
 });
 S.write(w,sh,amount+(lots+6),'=СУММ('+amount+'6:'+amount+(lots+5)+')');
 let result=S.grade(w);
 assert.equal(result.passed,result.total,'Valid spreadsheet formulas must pass');
 // A branch not taken must never cause a division-by-zero error.
 S.write(w,sh,avg+'6','=ЕСЛИ(D6>0;СРЗНАЧ(E6:'+S.col(3+offers)+'6);1/0)');
 assert.equal(S.grade(w).passed,w.targets.length);
 // Matching answer without a cell reference must prompt user to use a real formula.
 const target=w.targets.find(x=>x.id==='n0avg');
 S.write(w,sh,target.addr,'='+target.answer);
 assert.equal(S.grade(w).results.find(x=>x.id==='n0avg').status,'need-formula');
 S.write(w,sh,target.addr,'=0');
 assert.equal(S.grade(w).results.find(x=>x.id==='n0avg').status,'bad');
 runs++;
}
const budget=E.generate('budget','medium'),book=S.create(budget),any=book.targets.find(x=>x.formula);
S.write(book,any.sheet,any.addr,'=ЕСЛИ(1=0;1/0;7)');
assert.equal(S.value(book,any.sheet,any.addr),7);
assert.notEqual(S.value(book,any.sheet,any.addr),'#ДЕЛ/0!');
console.log('PASS:',runs,'NMCK variants and budget: IF lazy evaluation, source formulas, genuine mistakes');
