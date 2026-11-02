const assert=require('assert'),path=require('path');const p=path.resolve(__dirname,'../app/src/main/assets');
const E=require(p+'/engine.js');require(p+'/upgrade.js');require(p+'/nmck-advanced.js');const S=require(p+'/sheet-engine.js');S.setEngine(E);require(p+'/nmck-template.js');const H=require(p+'/financial-formulas.js');const R=require(p+'/review.js');
let n=0;
for(const level of ['easy','medium','hard'])for(let k=0;k<100;k++)for(const kind of ['nmck','budget','financial']){
 const t=E.generate(kind,level),w=S.create(t); assert(S.grade(w).results.every(x=>x.status==="empty"||(x.blankIsZero&&x.answer===0&&x.status==="ok"))); assert(w.targets.every(x=>!w.sheets[x.sheet].values[x.addr]));
 if(kind==='nmck'){assert(t.rows[0].prices.length>=3&&t.rows[0].prices.length<=5);assert.equal(t.questions.filter(q=>q.id==='total').length,1);assert(R.facts(t).example.includes('контракта'));}
 if(kind==='budget'){const d=t.summary['Доход'].actual-t.summary['Расход'].actual;assert.equal(R.facts(t).status,d>0?'профицит':d<0?'дефицит':'сбалансирован');assert(R.review(t,'').includes('Сначала'));}
 if(kind==='financial')for(const c of ['C','D'])for(let i=0;i<24;i++){let target=w.targets.find(x=>x.addr===c+(i+3)&&x.sheet==='Анализ'), h=H.suggest(t,'Анализ',c,i+3,E);assert.equal(h.length,1, target?.label);S.write(w,'Анализ',target.addr,h[0][1]);let v=S.value(w,'Анализ',target.addr);assert(Math.abs(v-target.answer)<=.011,`${target.label}: ${v} != ${target.answer} ${h[0][1]}`);}
 n++;
}
console.log('PASS: '+n+' tasks, all financial hints checked, empty workbooks, written feedback');
