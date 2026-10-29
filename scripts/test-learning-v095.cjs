'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../app/src/main/assets');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const html=read('index.html'),ui=read('sheet-ui.js'),nmck=read('nmck-practice-ui.js');
assert(html.includes('<small>0.9.5</small>'),'Version must match APK');
for(const script of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1])){
 assert(fs.existsSync(path.join(root,script)),'Missing app script '+script);
}
for(const src of ['sheet-ui.js','nmck-navigation.js','nmck-practice-ui.js'])assert.doesNotThrow(()=>new Function(read(src)),src+' has syntax errors');
assert(ui.includes('function invalidateCheck()') && ui.includes('invalidateCheck();refreshValues();saveDraft();'),'Changing formula must invalidate old grade');
assert(ui.includes('function updateProgress()') && ui.includes('progressBar.value=filled'),'Live progress count missing');
assert(ui.includes('function jumpTo(t)') && ui.includes('Перейти к исправлению'),'Error navigation missing');
assert(ui.includes("input.value.slice(0,pos)+a+input.value.slice(pos)"),'Tap-to-reference must insert address at caret');
assert(ui.includes('const history=[];') && ui.includes('↶'),'One-step undo unavailable');
assert(nmck.includes("'Позиция № '"),'Procurement positions should be labeled accurately');
const E=require(path.join(root,'engine.js'));
require(path.join(root,'upgrade.js'));
require(path.join(root,'nmck-advanced.js'));
const S=require(path.join(root,'sheet-engine.js'));
require(path.join(root,'nmck-template.js'));
S.setEngine(E);
for(const offers of [3,4,5])for(const lots of [1,2,3])for(let i=0;i<20;i++){
 const task=E.generate('nmck','medium',{offers,lots}),w=S.create(task);
 assert.equal(w.nmckLayout.offers,offers);assert.equal(w.nmckLayout.lots,lots);
 assert.equal(w.targets.length,lots*6+1);
 const first=w.targets[0],sh=first.sheet;
 S.write(w,sh,first.addr,'=AVERAGE(E6:'+S.col(3+offers)+'6)');
 assert.notEqual(S.value(w,sh,first.addr),'#REF!');
 const data=S.save(w),loaded=S.create(task);S.load(loaded,data);
 assert.equal(S.value(loaded,sh,first.addr),S.value(w,sh,first.addr));
}
for(const kind of ['budget','financial']){
 const task=E.generate(kind,'easy'),book=S.create(task);
 assert(book.targets.length>0 && book.order.length>0);
}
console.log('PASS: app scripts, v0.9.5 learning UX contracts, 180 NMCK cases and all 3 modules');
