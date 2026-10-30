'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'../app/src/main/assets');
const js=name=>fs.readFileSync(path.join(dir,name),'utf8');
const html=js('index.html'),css=js('sheet-zoom.css'),nav=js('nmck-navigation.js');
const Z=require(path.join(dir,'sheet-zoom.js'));
assert.equal(Z.MIN,.15);assert.equal(Z.MAX,2.5);
for(const [x,y] of [[.1,.15],[.15,.15],[.5,.5],[1,1],[2.6,2.5]])assert.equal(Z.clamp(x),y);
assert.equal(Z.snap(.647),.65);
assert(Z.fitScale(360,15)<=.2);
assert(Z.fitScale(360,8)>Z.fitScale(360,15));
assert.equal(Z.fitScale(0,10),1);
assert(html.includes('sheet-zoom.css')&&html.includes('sheet-zoom.js'));
assert(html.includes('<small>0.9.8</small>'));
assert(/function visible\(\)\{return !\$\('work'\)\.hidden;\}/.test(nav),'Navigation must work for ALL workbooks');
assert(!js('nmck-practice-ui.js').includes('scaleTo('),'Legacy NMCK-only zoom must be removed');
assert(css.includes('#work .excel-grid-box .excel-grid td'),'Zoom widths must apply to every workbook, not only NMCK');
assert(css.includes('var(--exam-name-w'),'Spreadsheet name-column must scale');
const globalStore=new Map();global.localStorage={getItem:k=>globalStore.get(k)||null,setItem:(k,v)=>globalStore.set(k,v)};
function element(tag='div'){
 const callbacks={};
 return {tagName:tag.toUpperCase(),children:[],style:{
   values:{},setProperty(k,v){this.values[k]=v;},getPropertyValue(k){return this.values[k]||'';}
 },disabled:false,textContent:'',className:'',value:'',type:'',
 setAttribute(k,v){this[k]=v;},
 append(...a){this.children.push(...a);},
 addEventListener(name,cb){(callbacks[name]??=[]).push(cb);},
 trigger(name,event={}){for(const cb of callbacks[name]||[])cb(event);},
 getBoundingClientRect(){return{left:0,top:0}},
 get _listeners(){return callbacks;}
 };
}
const tool=element(),grid=element(),work=element();
tool.querySelector=(selector)=>selector==='.excel-grid-box'?grid:selector==='.sheet-zoom'?tool.children.find(e=>e.className==='sheet-zoom'):null;
tool.insertBefore=(el,before)=>tool.children.push(el);
const items={};grid.clientWidth=340;grid.scrollLeft=0;grid.scrollTop=0;
grid.querySelectorAll=sel=>sel==='thead th.excel-col'?Array(items.cols||15).fill({}):[];
// Simulate headers/text causing 25% more width than a simple column-count estimate.
const realTable={getBoundingClientRect(){const scale=Number.parseFloat(grid.style.values['--exam-cell-w']||'110')/110;
 return {width:(37+((items.cols||15)-1)*110+155)*scale*1.25};}};
grid.querySelector=sel=>sel==='.excel-grid'?realTable:null;
const doc={querySelector:sel=>sel==='.excel-tool'?tool:null,
 getElementById:id=>id==='work'?work:null,
 createElement:tag=>element(tag)};
const api=Z.attach(doc);
assert(api&&api.getScale()===1,'Universal zoom must attach independently of task type');
const bar=tool.children.find(el=>el.className==='sheet-zoom');
assert(bar&&bar.children.length===6,'Must provide label, minus, slider, plus, reset and fit');
let [caption,minus,slider,plus,percent,fit]=bar.children;
assert.equal(percent.textContent,'100%');
minus.trigger('click');assert.equal(api.getScale(),.9);
plus.trigger('click');assert.equal(api.getScale(),1);
slider.value='15';slider.trigger('input');
assert.equal(api.getScale(),.15);assert.equal(minus.disabled,true);assert.equal(grid.style.values['--exam-cell-w'],'16.50px');
plus.trigger('click');assert.equal(api.getScale(),.25);
percent.trigger('click');assert.equal(api.getScale(),1);
items.cols=15;fit.trigger('click');const wide=api.getScale();assert(wide<=.2);
assert(realTable.getBoundingClientRect().width<=grid.clientWidth+1,'Wide budget/NMCK table must genuinely fit screen');
items.cols=4;fit.trigger('click');const narrow=api.getScale();assert(narrow>wide);
assert(realTable.getBoundingClientRect().width<=grid.clientWidth+1,'Narrow financial table must genuinely fit screen');
api.setScale(1);
const gesture=(x,y)=>({clientX:x,clientY:y});
grid.trigger('touchstart',{touches:[gesture(0,10),gesture(100,10)]});
let prevented=false;
grid.trigger('touchmove',{touches:[gesture(0,10),gesture(200,10)],cancelable:true,preventDefault(){prevented=true;}});
assert(prevented&&api.getScale()>=1.95,'Two-finger pinch must magnify grid and block parent scrolling');
grid.trigger('touchend',{touches:[]});
api.setScale(2.5);assert.equal(plus.disabled,true);
assert.equal(globalStore.get('exam-sheet-zoom-v098'),'2.5','Zoom must be persisted for every workbook');
const second=Z.attach(doc);assert.equal(second,undefined,'Must not attach duplicate controls');
// Also validate workbook sheets. All of them use .excel-grid-box created by sheet-ui.
const E=require(path.join(dir,'engine.js'));require(path.join(dir,'upgrade.js'));require(path.join(dir,'nmck-advanced.js'));
const S=require(path.join(dir,'sheet-engine.js'));require(path.join(dir,'nmck-template.js'));S.setEngine(E);
for(const kind of ['nmck','budget','financial']){
 const t=E.generate(kind,'medium'),w=S.create(t);
 assert(w.order.length>0);
 for(const name of w.order)assert(w.sheets[name].cols>0);
}
console.log('PASS: universal 15–250% zoom, fit, pinch, reset, persistence, three workbook types and mobile controls');
