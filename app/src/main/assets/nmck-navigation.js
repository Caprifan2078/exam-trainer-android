/* Universal editable-cell navigation: NMCK, budget, balance analysis. */
(function() {
'use strict';
const $=id=>document.getElementById(id),tool=document.querySelector('.excel-tool'),grid=tool&&tool.querySelector('.excel-grid-box');
if(!tool||!grid)return;
const node=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e;};
const strip=node('div',undefined,'nmck-navigation');
strip.setAttribute('aria-label','Переход по расчётным ячейкам');
const prev=node('button','← Ячейка','nmck-nav-button'),next=node('button','Ячейка →','nmck-nav-button');
const center=node('div',undefined,'nmck-nav-center'),counter=node('strong','Шаг 1','nmck-nav-step'),detail=node('span','Выберите ячейку','nmck-nav-detail');
center.append(counter,detail);strip.append(prev,center,next);
for(const b of [prev,next])b.type='button';
const zoom=tool.querySelector('.sheet-zoom');tool.insertBefore(strip,zoom||grid);
function visible(){return !$('work').hidden;}
function editable(){return Array.from(grid.querySelectorAll('td.excel-editable[data-addr]'));}
function selected(){const value=tool.querySelector('.excel-addr')?.textContent||'';const i=value.lastIndexOf('!');return i>=0?value.slice(i+1):'';}
function go(index){
 const all=editable();if(!all.length)return;
 const i=Math.max(0,Math.min(index,all.length-1)),cell=all[i];
 tool.querySelector('.excel-commit')?.click();
 cell.click();cell.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
 requestAnimationFrame(update);
}
function update(){
 const on=visible();strip.hidden=!on;if(!on)return;
 const all=editable();const current=selected(),idx=all.findIndex(e=>e.dataset.addr===current);
 if(all.length===0){counter.textContent='Лист исходных данных';detail.textContent='Можно увеличить таблицу. Для расчётов открой лист «Анализ».';
   prev.disabled=true;next.disabled=true;return;}
 if(idx<0){counter.textContent='Выбери жёлтую ячейку';detail.textContent='Нажми на нужное поле в таблице';}
 else{
  counter.textContent='Расчёт '+(idx+1)+' из '+all.length;
  const info=tool.querySelector('.excel-info')?.textContent||'';
  detail.textContent=current+(info?' · '+info:'');
 }
 prev.disabled=idx<=0;next.disabled=idx<0||idx>=all.length-1;
}
prev.addEventListener('click',()=>{const a=editable(),i=a.findIndex(e=>e.dataset.addr===selected());go(i-1);});
next.addEventListener('click',()=>{const a=editable(),i=a.findIndex(e=>e.dataset.addr===selected());go(i+1);});
/* When a formula is saved, advance to the next calculation rather than
   forcing users to hunt for the next yellow cell in a wide spreadsheet. */
const commit=tool.querySelector('.excel-commit');
if(commit)commit.addEventListener('click',()=>requestAnimationFrame(update));
const address=tool.querySelector('.excel-addr');
if(address){new MutationObserver(()=>update()).observe(address,{childList:true,characterData:true,subtree:true});}
$('start').addEventListener('click',()=>setTimeout(update,0));
$('again').addEventListener('click',()=>setTimeout(update,0));
$('back').addEventListener('click',()=>setTimeout(update,0));
tool.querySelector('.excel-tabs')?.addEventListener('click',()=>setTimeout(update,0));
window.addEventListener('pageshow',()=>setTimeout(update,0));
update();
})();
