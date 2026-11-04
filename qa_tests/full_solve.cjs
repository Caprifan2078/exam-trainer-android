'use strict';const assert=require('assert'),path=require('path');const p=path.resolve(__dirname,'../app/src/main/assets');const E=require(p+'/engine.js');require(p+'/upgrade.js');require(p+'/nmck-advanced.js');const S=require(p+'/sheet-engine.js');S.setEngine(E);require(p+'/nmck-template.js');const H=require(p+'/financial-formulas.js');
for(const level of ['easy','medium','hard'])for(const kind of ['nmck','budget','financial'])for(let n=0;n<50;n++){
 const t=E.generate(kind,level),w=S.create(t);
 for(const x of w.targets){let raw;if(!x.formula)raw=String(x.answer);else if(kind==='nmck')raw=x.hint;else if(kind==='budget'){if(false&&x.id.endsWith('share')){const r=Number(x.addr.slice(1)),denom=t.rows.length+(t.rows[r-4].kind==='Доход'?6:7);raw='=E'+r+'/E'+denom+'*100';}else raw=x.hint;}else{const m=/([A-Z]+)(\d+)/.exec(x.addr);raw=H.suggest(t,x.sheet,m[1],Number(m[2]),E)[0][1];}S.write(w,x.sheet,x.addr,raw);}
 const g=S.grade(w);assert.equal(g.passed,g.total,kind+' '+level+' '+JSON.stringify(g.results.filter(x=>x.status!=='ok').slice(0,3)));
}
console.log('PASS: 450 работ решены целиком, 3 раздела x 3 уровня');

assert.equal(E.check({answer:1.31},'1.30'),'bad','An error of 0.01 must not pass');
assert.equal(E.check({answer:1.31},'1.3051'),'ok','An unrounded result that rounds correctly must pass');
{
 const t=E.generate('financial','medium'),w=S.create(t),x=w.targets.find(x=>x.formula);
 S.write(w,x.sheet,x.addr,'='+String(x.answer-0.01));
 assert.equal(S.grade(w).results.find(y=>y.id===x.id).status,'bad','Spreadsheet must reject a one-hundredth error');
}
{
 const t=E.generate('nmck','medium',{offers:3}),r=t.rows[0];r.quantity=3;r.prices=[100,110,120];
 for(const [id,v] of Object.entries({n0avg:110,n0sd:10,n0cv:9.09,n0amount:330,n0selected:100,n0selectedTotal:300,total:330}))t.questions.find(q=>q.id===id).answer=v;
 const w=S.create(t);for(const x of w.targets)S.write(w,x.sheet,x.addr,x.formula?x.hint:String(x.answer));
 assert.equal(S.grade(w).percent,100);assert.equal(S.value(w,'НМЦК','K6'),300,'Formula price must follow the selected offer');assert.equal(S.value(w,'НМЦК','M6'),300);
}
