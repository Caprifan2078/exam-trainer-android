'use strict';
const assert=require('node:assert/strict'),path=require('node:path');const p=path.resolve(__dirname,'../app/src/main/assets');
const E=require(p+'/engine.js');require(p+'/upgrade.js');require(p+'/nmck-advanced.js');const S=require(p+'/sheet-engine.js');S.setEngine(E);require(p+'/nmck-template.js');
const near=(a,b)=>assert(Math.abs(a-b)<0.011,`${a} ≠ ${b}`);
for(const n of [3,4,5])for(const level of ['easy','medium','hard'])for(let j=0;j<200;j++){
 let t=E.generate('nmck',level,{offers:n,lots:3});assert.equal(t.rows.length,1);const r=t.rows[0];assert.equal(r.prices.length,n);
 const mean=r.prices.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(r.prices.reduce((s,x)=>s+(x-mean)**2,0)/(n-1));
 const get=id=>t.questions.find(q=>q.id===id).answer;
 near(get('n0avg'),mean);near(get('n0sd'),sd);near(get('n0cv'),100*sd/mean);near(get('total'),Math.round((Math.round((mean+Number.EPSILON)*100)/100*r.quantity+Number.EPSILON)*100)/100);
 const w=S.create(t);assert.equal(S.grade(w).passed,0);for(const x of w.targets){assert.equal(w.sheets[x.sheet].values[x.addr],undefined);S.write(w,x.sheet,x.addr,x.formula?x.hint:String(x.answer));}const grade=S.grade(w);assert.equal(grade.passed,grade.total,JSON.stringify(grade.results.filter(z=>z.status!=='ok')));
}
console.log('PASS: 1800 заданий; 3/4/5 цен, одна позиция, формулы от исходных цен до итога.');
const sample={kind:'nmck',id:'fixed',rows:[{name:'Учебный товар',quantity:3,prices:[100,110,120]}],questions:[{id:'n0avg',answer:110},{id:'n0sd',answer:10},{id:'n0cv',answer:9.09},{id:'n0amount',answer:330},{id:'total',answer:330}]};
const sw=S.create(sample);for(const x of sw.targets)S.write(sw,x.sheet,x.addr,x.hint);assert.equal(S.grade(sw).percent,100);near(S.value(sw,'НМЦК','H6'),110);near(S.value(sw,'НМЦК','I6'),10);near(S.value(sw,'НМЦК','J6'),9.090909);near(S.value(sw,'НМЦК','M6'),330);
console.log('PASS: известный пример 100/110/120, количество 3: 110, 10, 9,09%, 330.');

const fresh=E.generate('nmck','easy',{offers:3});const fw=S.create(fresh);const price=fw.targets.find(x=>x.id==='n0price0');assert(price&&!fw.sheets['НМЦК'].values[price.addr]);S.write(fw,'НМЦК',price.addr,String(price.answer+1));assert.equal(S.grade(fw).results.find(x=>x.id===price.id).status,'bad');S.write(fw,'НМЦК',price.addr,String(price.answer+0.01));assert.equal(S.grade(fw).results.find(x=>x.id===price.id).status,'bad');S.write(fw,'НМЦК',price.addr,String(price.answer));assert.equal(S.grade(fw).results.find(x=>x.id===price.id).status,'ok');const saved=S.save(fw),again=S.create(fresh);S.load(again,saved);assert.equal(S.value(again,'НМЦК',price.addr),price.answer);delete fresh.manualPrices;const old=S.create(fresh);assert.equal(old.sheets['НМЦК'].values.E6.raw,fresh.rows[0].prices[0]);assert(!old.sheets['НМЦК'].editable.E6);console.log('PASS: ручной ввод цен, обнаружение ошибки, сохранение и старый черновик.');
