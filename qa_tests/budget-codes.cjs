'use strict';
const assert=require('node:assert/strict'),path=require('path');const p=path.resolve(__dirname,'../app/src/main/assets');const E=require(p+'/engine.js');require(p+'/upgrade.js');require(p+'/nmck-advanced.js');const S=require(p+'/sheet-engine.js');S.setEngine(E);require(p+'/nmck-template.js');
let checked=0;for(let i=0;i<300;i++){const task=E.generate('budget','medium'),w=S.create(task);for(const [k,row] of task.rows.entries()){
const addr='C'+(k+4),raw=w.sheets['Бюджет'].values[addr].raw,value=S.value(w,'Бюджет',addr);assert.equal(value,raw,'leading zeros and 20-digit code must remain text');
if(raw!=='уточнить'){assert.equal(raw.replace(/\s/g,'').length,20);assert.match(raw,/^000 /);if(row.name==='Налог на доходы физических лиц')assert.equal(raw,'000 1 01 00000 00 0000 000');if(row.name==='Общее образование')assert.equal(raw,'000 0700 0000000000 000');checked++;}
}}
assert(checked>2000);console.log('PASS: classification strings retain 20 digits including leading zeros in 300 tasks');
