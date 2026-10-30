'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../app/src/main/assets');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const html=read('index.html'),ui=read('sheet-ui.js'),nmck=read('nmck-practice-ui.js'),css=read('mobile-review.css'),zoom=read('sheet-zoom.js');
const app=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
const version=app.match(/versionName\s+'([^']+)'/)?.[1];
assert(version==='0.9.9' && html.includes('0.9.9'));
assert(html.includes('mobile-review.css'));
assert(ui.includes("document.body.classList.add('exam-solving')"));
assert(ui.includes("document.body.classList.remove('exam-solving')"));
assert(ui.includes("String(v.raw??'').trim()!==''"),'Cleared cells must not display spurious zero after undo');
assert(ui.includes('shown(active,a,raw)')&&ui.includes('shown(active,cell.dataset.addr,v)'),'Both initial and updated table render must preserve blank cells');
assert(css.includes('body.exam-solving #work>.hero'));
assert(css.includes('body.exam-solving #work .excel-tool'));
assert(css.includes('body.exam-solving #work .condition-preview-row'));
assert(css.includes('body.exam-solving #work .excel-progress'));
assert(nmck.includes("let collapsed=true") && nmck.includes("preview.append(item)"));
assert(nmck.includes("row.prices.map(fmt).join(' / ')"),'Compact preview must include every commercial price');
assert(zoom.includes("table.getBoundingClientRect().width"),'Fit action must measure real table width');
for(const file of [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(m=>m[1]))assert(fs.existsSync(path.join(root,file)),'Missing UI file '+file);
for(const file of ['sheet-ui.js','sheet-zoom.js','nmck-practice-ui.js','nmck-navigation.js'])
 assert.doesNotThrow(()=>new Function(read(file)),file+' invalid JS');
const E=require(path.join(root,'engine.js'));
require(path.join(root,'upgrade.js'));require(path.join(root,'nmck-advanced.js'));
const S=require(path.join(root,'sheet-engine.js'));require(path.join(root,'nmck-template.js'));
S.setEngine(E);
let tested=0;
for(const kind of ['nmck','budget','financial'])for(const level of ['easy','medium','hard'])for(let i=0;i<30;i++){
 const task=E.generate(kind,level),w=S.create(task);
 assert(w.targets.length>0&&w.order.length>0);
 assert.equal(S.grade(w).passed,0);
 const cell=w.targets[0];S.write(w,cell.sheet,cell.addr,'='+cell.answer);
 const saved=S.save(w),fresh=S.create(task);S.load(fresh,saved);
 assert.equal(S.value(fresh,cell.sheet,cell.addr),S.value(w,cell.sheet,cell.addr));
 tested++;
}
console.log('PASS: 270 workbook restore and grader scenarios; compact, NMCK task preview, measured fit and UI syntax');
