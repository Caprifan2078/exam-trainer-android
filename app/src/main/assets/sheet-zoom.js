/* v0.9.8 — universal in-grid zoom for NMCK, municipal budget and financial analysis.
 * Zoom only the spreadsheet; input and navigation remain comfortably touch-sized.
 * Pure math exports are deliberately testable in Node without any browser globals.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 root.ExamSheetZoom=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof document!=='undefined')api.attach(document);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MIN=.15,MAX=2.5,STEP=.05;
 const clamp=x=>Math.max(MIN,Math.min(MAX,Math.round((Number(x)||1)*100)/100));
 const snap=x=>clamp(Math.round(clamp(x)/STEP)*STEP);
 function fitScale(width,columns,nameColumn=true){
  if(!Number.isFinite(width)||width<=0||!Number.isInteger(columns)||columns<1)return 1;
  const base=37+Math.max(0,columns-1)*110+(nameColumn&&columns>=2?155:0);
  return snap(Math.min(1,(width-12)/base));
 }
 const points={cell:110,row:35,font:11,padding:6,index:37,name:265,titleFont:12,titleHeight:43,headerHeight:90};
 function attach(doc){
  const tool=doc.querySelector('.excel-tool'),grid=tool?.querySelector('.excel-grid-box'),work=doc.getElementById('work');
  if(!tool||!grid||!work||tool.querySelector('.sheet-zoom'))return;
  const create=(tag,txt,cls)=>{const el=doc.createElement(tag);if(txt!==undefined)el.textContent=txt;if(cls)el.className=cls;return el;};
  const bar=create('div',undefined,'sheet-zoom');
  const caption=create('span','Масштаб · НМЦК, бюджет, финанализ','sheet-zoom-caption');
  const minus=create('button','−','sheet-zoom-button');
  const plus=create('button','+','sheet-zoom-button');
  const percent=create('button','100%','sheet-zoom-percent');
  const fit=create('button','Вписать','sheet-zoom-fit');
  const range=create('input',undefined,'sheet-zoom-range');
  range.type='range';range.min='15';range.max='250';range.step='5';range.value='100';
  range.setAttribute('aria-label','Масштаб таблицы от 15 до 250 процентов');
  range.setAttribute('title','Изменить масштаб таблицы');
  for(const b of [minus,plus,percent,fit])b.type='button';
  minus.setAttribute('aria-label','Уменьшить таблицу');
  plus.setAttribute('aria-label','Увеличить таблицу');
  percent.setAttribute('aria-label','Масштаб 100 процентов');
  fit.setAttribute('aria-label','Уместить всю таблицу по ширине экрана');
  bar.append(caption,minus,range,plus,percent,fit);
  const hint=create('p','Сведи или разведи два пальца в таблице. Уменьшение — до 15%.','sheet-zoom-hint');
  tool.insertBefore(bar,grid);tool.insertBefore(hint,grid);
  const KEY='exam-sheet-zoom-v098';
  let scale=1;
  try{const value=Number(localStorage.getItem(KEY));if(value>=MIN&&value<=MAX)scale=snap(value);}catch(e){}
  function apply(value,{persist=true}={}){
   const next=snap(value);
   if(Math.abs(next-scale)<.001&&grid.style.getPropertyValue('--exam-cell-w'))return;
   scale=next;
   const dims=[['--exam-cell-w','cell'],['--exam-row-h','row'],['--exam-font','font'],['--exam-padding','padding'],
      ['--exam-index-w','index'],['--exam-name-w','name'],['--exam-title-font','titleFont'],
      ['--exam-title-h','titleHeight'],['--exam-head-h','headerHeight']];
   dims.forEach(([prop,key])=>grid.style.setProperty(prop,(points[key]*next).toFixed(2)+'px'));
   percent.textContent=Math.round(next*100)+'%';percent.title='Нажми для 100%';
   range.value=String(Math.round(next*100));
   minus.disabled=next<=MIN;plus.disabled=next>=MAX;
   if(persist)try{localStorage.setItem(KEY,String(next));}catch(e){}
  }
  function widthFit(){
   const columns=grid.querySelectorAll('thead th.excel-col').length;
   apply(fitScale(grid.clientWidth,columns),{persist:true});
  }
  minus.addEventListener('click',()=>apply(scale-.1));
  plus.addEventListener('click',()=>apply(scale+.1));
  percent.addEventListener('click',()=>apply(1));
  fit.addEventListener('click',widthFit);
  range.addEventListener('input',()=>apply(Number(range.value)/100));
  let pinch=null;
  const distance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  const center=(a,b)=>({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
  grid.addEventListener('touchstart',e=>{
   if(e.touches.length!==2)return;
   const d=distance(e.touches[0],e.touches[1]);
   if(d<5)return;
   const mid=center(e.touches[0],e.touches[1]),rect=grid.getBoundingClientRect();
   pinch={distance:d,scale,
     contentX:(grid.scrollLeft+mid.x-rect.left)/scale,
     contentY:(grid.scrollTop+mid.y-rect.top)/scale};
  },{passive:true});
  grid.addEventListener('touchmove',e=>{
   if(!pinch||e.touches.length!==2)return;
   if(e.cancelable)e.preventDefault();
   const d=distance(e.touches[0],e.touches[1]);if(d<5)return;
   const mid=center(e.touches[0],e.touches[1]),rect=grid.getBoundingClientRect();
   apply(pinch.scale*d/pinch.distance);
   grid.scrollLeft=Math.max(0,pinch.contentX*scale-(mid.x-rect.left));
   grid.scrollTop=Math.max(0,pinch.contentY*scale-(mid.y-rect.top));
  },{passive:false});
  const clear=e=>{if(!e||e.touches.length<2)pinch=null;};
  grid.addEventListener('touchend',clear,{passive:true});
  grid.addEventListener('touchcancel',()=>{pinch=null;},{passive:true});
  grid.addEventListener('wheel',e=>{
   if(!e.ctrlKey||!grid.contains(e.target))return;
   e.preventDefault();apply(scale+(e.deltaY<0?.1:-.1));
  },{passive:false});
  apply(scale,{persist:false});
  // Keep controls visible and useful on every sheet/tab without rebuilding listeners.
  return {getScale:()=>scale,setScale:apply,fit:widthFit};
 }
 return{MIN,MAX,STEP,clamp,snap,fitScale,attach};
});
