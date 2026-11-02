'use strict';const assert=require('node:assert/strict'),path=require('node:path');const p=path.resolve(__dirname,'../app/src/main/assets');const E=require(p+'/engine.js');require(p+'/upgrade.js');require(p+'/nmck-advanced.js');
const sum=(b,ks)=>ks.reduce((n,k)=>n+(b[k]||0),0);
for(let i=0;i<1000;i++){
 const t=E.generate('financial',['easy','medium','hard'][i%3]);for(const y of ['2023','2024','2025']){const b=t.balance[y];assert.equal(sum(b,['1110','1120','1130','1140','1150','1160','1170','1180','1190']),b['1100']);assert.equal(sum(b,['1210','1215','1220','1230','1240','1250','1260']),b['1200']);assert.equal(b['1100']+b['1200'],b['1600']);assert.equal(sum(b,['1310','1320','1340','1350','1360','1370']),b['1300']);assert.equal(sum(b,['1410','1420','1430','1450']),b['1400']);assert.equal(sum(b,['1510','1520','1530','1540','1550']),b['1500']);assert.equal(sum(b,['1300','1400','1500']),b['1700']);assert.equal(b['1600'],b['1700']);}
 for(const y of ['2024','2025']){const x=t.pl[y];assert.equal(x['2110']+x['2120'],x['2100']);assert.equal(sum(x,['2100','2210','2220']),x['2200']);assert.equal(sum(x,['2200','2310','2320','2330','2340','2350']),x['2300']);assert.equal(sum(x,['2300','2410','2460']),x['2400']);}
 const b=E.generate('budget',['easy','medium','hard'][i%3]);for(const k of ['Доход','Расход'])for(const f of ['plan','actual'])assert.equal(b.rows.filter(x=>x.kind===k).reduce((a,x)=>a+x[f],0),b.summary[k][f]);
}
console.log('PASS: 1000 случайных финансовых отчётностей и бюджетов; арифметическая связность строк и итогов.');
