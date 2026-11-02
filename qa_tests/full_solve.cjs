'use strict';const assert=require('assert'),path=require('path');const p=path.resolve(__dirname,'../app/src/main/assets');const E=require(p+'/engine.js');require(p+'/upgrade.js');require(p+'/nmck-advanced.js');const S=require(p+'/sheet-engine.js');S.setEngine(E);require(p+'/nmck-template.js');const H=require(p+'/financial-formulas.js');
for(const level of ['easy','medium','hard'])for(const kind of ['nmck','budget','financial'])for(let n=0;n<50;n++){
 const t=E.generate(kind,level),w=S.create(t);
 for(const x of w.targets){let raw;if(!x.formula)raw=String(x.answer);else if(kind==='nmck')raw=x.hint;else if(kind==='budget'){if(false&&x.id.endsWith('share')){const r=Number(x.addr.slice(1)),denom=t.rows.length+(t.rows[r-4].kind==='Доход'?6:7);raw='=E'+r+'/E'+denom+'*100';}else raw=x.hint;}else{const m=/([A-Z]+)(\d+)/.exec(x.addr);raw=H.suggest(t,x.sheet,m[1],Number(m[2]),E)[0][1];}S.write(w,x.sheet,x.addr,raw);}
 const g=S.grade(w);assert.equal(g.passed,g.total,kind+' '+level+' '+JSON.stringify(g.results.filter(x=>x.status!=='ok').slice(0,3)));
}
console.log('PASS: 450 работ решены целиком, 3 раздела x 3 уровня');
