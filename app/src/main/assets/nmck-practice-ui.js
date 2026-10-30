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
const lotsLabel=mk('label','Количество позиций'),lots=mk('select');lots.id='lot-count';lotsLabel.htmlFor=lots.id;
[['random','По сложности: 1–3'],['1','1 позиция'],['2','2 позиции'],['3','3 позиции']].forEach(([v,t])=>{const e=mk('option',t);e.value=v;lots.append(e);});
nmckOptions.append(offerLabel,offer,lotsLabel,lots);panel.insertBefore(nmckOptions,start);
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
 top.append(mk('div','УСЛОВИЕ ЗАДАНИЯ · '+t.rows.length+' поз.','condition-eyebrow'));
 const btn=mk('button',undefined,'condition-toggle');btn.type='button';
 const content=mk('div',undefined,'condition-body');
 let collapsed=false;
 try{collapsed=localStorage.getItem('exam-condition-collapsed')==='true';}catch(e){}
 const update=()=>{content.hidden=collapsed;btn.textContent=collapsed?'Развернуть условия ↓':'Свернуть условия ↑';btn.setAttribute('aria-expanded',String(!collapsed));};
 btn.addEventListener('click',()=>{collapsed=!collapsed;update();try{localStorage.setItem('exam-condition-collapsed',String(collapsed));}catch(e){}});
 top.append(btn);condition.append(top,content);update();
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
 content.append(mk('p','Задача: самостоятельно заполнить расчётную таблицу ниже формулами Excel. Определить среднюю цену, среднее квадратичное отклонение, коэффициент вариации, цену за единицу и НМЦК. Порог вариации для учебного задания — 33%.','condition-instruction'));
}
function suggestion(t,col,row){
 const n=t.rows.length,offers=t.rows[0].prices.length;
 const avg=String.fromCharCode(69+offers),sd=String.fromCharCode(70+offers),cv=String.fromCharCode(71+offers);
 const calc=String.fromCharCode(72+offers),unit=String.fromCharCode(73+offers),amount=String.fromCharCode(74+offers);
 if(row>=6&&row<=5+n){
  const range='E'+row+':'+String.fromCharCode(68+offers)+row;
  const formulas={
   [avg]:['СРЗНАЧ','=AVERAGE('+range+')'],
   [sd]:['Отклонение','=STDEV.S('+range+')'],
   [cv]:['Вариация, %','='+sd+row+'/'+avg+row+'*100'],
   [calc]:['Расчёт НМЦК','=ROUND('+avg+row+';2)*D'+row],
   [unit]:['Цена за ед.','=ROUND('+avg+row+';2)'],
   [amount]:['НМЦК позиции','='+unit+row+'*D'+row]
  };
  return formulas[col]?[formulas[col]]:[];
 }
 if(col===amount&&row===n+6)return[['Итог НМЦК','=SUM('+amount+'6:'+amount+(n+5)+')']];
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
 quick.append(mk('span','Вставить формулу для выбранной ячейки:','excel-quick-label'));
 for(const [caption,formula] of choices){
  const b=mk('button',caption,'excel-quick-button');b.type='button';b.title=formula;
  b.addEventListener('click',()=>{
   field.value=formula;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();
   const info=document.querySelector('.excel-info');if(info)info.textContent='Формула вставлена. Нажми ✓ для расчёта и затем проверь результат.';
  });quick.append(b);
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
