const assert=require('assert'),path=require('path');const p=path.resolve(__dirname,'../app/src/main/assets');const E=require(p+'/engine.js');require(p+'/upgrade.js');require(p+'/nmck-advanced.js');const R=require(p+'/review.js');let count={budget:0,nmck:0,financial:0};
for(let j=0;j<1000;j++)for(const kind of Object.keys(count)){
 const t=E.generate(kind,['easy','medium','hard'][j%3]);const ex=R.facts(t).example;assert(ex&&ex.length);
 if(kind==='budget'){const a=t.summary['Доход'].actual,b=t.summary['Расход'].actual;assert(ex.includes(String(a))&&ex.includes(String(b)));assert(ex.includes(a>b?'профицит':a<b?'дефицит':'сбалансирован'));}
 if(kind==='nmck'){const prices=t.rows[0].prices,m=prices.reduce((a,b)=>a+b,0)/prices.length,sd=Math.sqrt(prices.reduce((a,x)=>a+(x-m)**2,0)/(prices.length-1)),v=sd/m*100;assert(ex.includes(String(t.questions.find(q=>q.id==='total').answer)));assert(ex.includes(v>33?'превышает 33%':'не превышает 33%'));}
 if(kind==='financial'){const a=t.pl['2025'],b=t.pl['2024'];for(const k of ['2110','2400'])assert(ex.includes(String(a[k]))&&ex.includes(String(b[k])));let match=[...ex.matchAll(/показатель (увеличился|уменьшился|не изменился)/g)].map(x=>x[1]);let dir=x=>x>0?'увеличился':x<0?'уменьшился':'не изменился';assert.deepStrictEqual(match,[dir(a['2110']-b['2110']),dir(a['2400']-b['2400']),dir(t.questions.find(q=>q.id==='f02025').answer-t.questions.find(q=>q.id==='f02024').answer)]);}
 count[kind]++;
}console.log('PASS: сгенерированы и сверены '+JSON.stringify(count)+' примеров выводов');
