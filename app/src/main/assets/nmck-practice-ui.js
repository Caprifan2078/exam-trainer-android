/* Conditions and per-cell optional formula hints; universal zoom is now in sheet-zoom.js. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const kind=$('kind'),start=$('start'),again=$('again'),panel=kind&&kind.closest('.panel');
const tool=document.querySelector('.excel-tool'),grid=tool&&tool.querySelector('.excel-grid-box');
if(!panel||!grid)return;
const mk=(tag,text,css)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(css)x.className=css;return x;};
const nmckOptions=mk('div',undefined,'nmck-options');
nmckOptions.id='nmck-options';
const offerLabel=mk('label','Коммерческих предложений'),offer=mk('select');offer.id='offers-count';offerLabel.htmlFor=offer.id;
[['random','Случайно: 3–5'],['3','3 предложения'],['4','4 предложения'],['5','5 предложений']].forEach(([v,t])=>{const e=mk('option',t);e.value=v;offer.append(e);});
nmckOptions.append(offerLabel,offer);panel.insertBefore(nmckOptions,start);
const onKind=()=>{nmckOptions.hidden=kind.value!=='nmck';};kind.addEventListener('change',onKind);onKind();

const condition=mk('section',undefined,'nmck-condition');const source=$('sources');
source.insertBefore(condition,tool);
const quick=mk('div',undefined,'excel-quick');tool.insertBefore(quick,grid);

const fmt=x=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(x);
function getTask(){
 const now=window.ExamCurrentTask;
 if(!now&&$('work').hidden)return null;
 if(now&&now.kind==='nmck')return now;
 try{return JSON.parse(localStorage.getItem('examSheetsDraft')||'null')?.task||now;}catch(e){return now;}
}
function drawCondition(t){
 condition.replaceChildren();
 if(!t||t.kind!=='nmck'){condition.hidden=true;document.getElementById('work').dataset.nmckSheet='no';return;}
 condition.hidden=false;document.getElementById('work').dataset.nmckSheet='yes';
 const top=mk('div',undefined,'condition-heading');
 top.append(mk('div','ОДИН КОНТРАКТ · '+t.rows[0].prices.length+' ЦЕН','condition-eyebrow'));
 const btn=mk('button',undefined,'condition-toggle');btn.type='button';
 const content=mk('div',undefined,'condition-body');
 const preview=mk('div',undefined,'condition-preview');
 for(const [i,row] of t.rows.entries()){
  const item=mk('p',undefined,'condition-preview-row');
  item.append(mk('b',(i+1)+'. '+row.name+' · '+row.quantity+' шт.'));
  item.append(mk('span','КП: '+row.prices.map(fmt).join(' / ')+' ₽'));
  preview.append(item);
 }
 let collapsed=true;
 try{collapsed=localStorage.getItem('exam-condition-collapsed')!=='false';}catch(e){}
 const update=()=>{content.hidden=collapsed;preview.hidden=!collapsed;btn.textContent=collapsed?'Подробнее ↓':'Скрыть подробности ↑';btn.setAttribute('aria-expanded',String(!collapsed));};
 btn.addEventListener('click',()=>{collapsed=!collapsed;update();try{localStorage.setItem('exam-condition-collapsed',String(collapsed));}catch(e){}});
 const goTable=mk('button','К таблице ↓','condition-jump');
 goTable.type='button';
 goTable.addEventListener('click',()=>{
  const formula=document.querySelector('.excel-formula-bar');
  if(formula)formula.scrollIntoView({block:'start',behavior:'smooth'});
 });
 top.append(btn,goTable);condition.append(top,preview,content);update();
 content.append(mk('h3','Обоснование начальной (максимальной) цены контракта'));
 content.append(mk('p','Заказчик: '+t.company));
 content.append(mk('p','Метод: сопоставимых рыночных цен (анализа рынка). По каждому предложению указана цена за одну единицу товара или услуги.'));
 t.rows.forEach((r,i)=>{
  const block=mk('div',undefined,'condition-lot');
  block.append(mk('strong','Позиция № '+(i+1)+': '+r.name));
  block.append(mk('p','Единица измерения: штуки. Количество: '+r.quantity+'. Коммерческих предложений: '+r.prices.length+'.'));
  const sub=mk('div',undefined,'condition-prices');
  r.prices.forEach((p,j)=>{const label=mk('span','КП №'+(j+1));const price=mk('b',fmt(p)+' ₽');const item=mk('div',undefined,'condition-price');item.append(label,price);sub.append(item);});
  block.append(sub);content.append(block);
 });
 content.append(mk('p','Задача: сначала самостоятельно перенести цены предложений в таблицу, затем заполнить расчётные ячейки формулами Excel. Определить среднюю цену, отклонение и вариацию. Затем выбрать предложение с ближайшей ценой строго ниже средней и умножить его цену на количество. Порог вариации для учебного задания — 33%.','condition-instruction'));
}
function suggestion(t,col,row){
 const n=t.rows.length,offers=t.rows[0].prices.length;
 const avg=String.fromCharCode(69+offers),sd=String.fromCharCode(70+offers),cv=String.fromCharCode(71+offers);
 const calc=String.fromCharCode(72+offers),unit=String.fromCharCode(73+offers),amount=String.fromCharCode(74+offers);
 if(row>=6&&row<=5+n){
  const range='E'+row+':'+String.fromCharCode(68+offers)+row;
  const formulas={
   [avg]:['СРЗНАЧ','=СРЗНАЧ('+range+')'],
   [sd]:['Отклонение','=СТАНДОТКЛОН.В('+range+')'],
   [cv]:['Вариация, %','='+sd+row+'/'+avg+row+'*100'],
   [calc]:['Расчёт НМЦК','=ОКРУГЛ('+avg+row+';2)*D'+row],
   [unit]:['Выбери предложение','Выбери цену ниже средней и ближе всех к ней'],
   [amount]:['НМЦК позиции','='+unit+row+'*D'+row]
  };
  return formulas[col]?[formulas[col]]:[];
 }
 if(col===amount&&row===n+6)return[['Итог НМЦК','=СУММ('+amount+'6:'+amount+(n+5)+')']];
 return [];
}
function showQuick(){
 quick.replaceChildren();
 const t=getTask(),label=document.querySelector('.excel-addr'),field=document.querySelector('.excel-input');
 if(!t||$('work').hidden||!label||!field||field.disabled){quick.hidden=true;return;}
 const match=/^([^!]+)!([A-Z]+)(\d+)$/.exec(label.textContent);
 let choices=[];
 if(match&&t.kind==='nmck'&&match[1]==='НМЦК')choices=suggestion(t,match[2],Number(match[3]));
 if(match&&t.kind==='financial'&&window.ExamFinanceHints)choices=window.ExamFinanceHints.suggest(t,match[1],match[2],Number(match[3]),window.ExamEngine);
 quick.hidden=!choices.length;
 if(!choices.length)return;
 const reveal=mk('button','Показать подсказку для '+match[2]+match[3],'excel-quick-button');reveal.type='button';quick.append(reveal);const details=mk('div');details.hidden=true;quick.append(details);reveal.addEventListener('click',()=>{details.hidden=!details.hidden;reveal.textContent=details.hidden?'Показать подсказку':'Скрыть подсказку';});details.append(mk('span',choices.map(x=>x[1]).join(' или '),'excel-quick-label'));
 for(const [caption,formula] of choices){
  if(!formula.startsWith('='))continue;
  const b=mk('button',caption,'excel-quick-button');b.type='button';b.title=formula;
  b.addEventListener('click',()=>{
   field.value=formula;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();
   const info=document.querySelector('.excel-info');if(info)info.textContent='Формула вставлена. Нажми ✓ для расчёта и затем проверь результат.';
  });details.append(b);
 }
}
function refresh(){
 const t=getTask();
 drawCondition(t);
 showQuick();
}
const kindChanged=()=>{if(!$('work').hidden)refresh();};
start.addEventListener('click',refresh);
again.addEventListener('click',refresh);
document.addEventListener('click',e=>{if(e.target.closest('.excel-grid')||e.target.closest('.excel-tabs')||e.target.closest('#back'))setTimeout(showQuick,0);});
window.addEventListener('pageshow',()=>{if(!$('work').hidden)refresh();});
if(!$('work').hidden)refresh();
})();
