/* v0.7 user-facing practice improvements: visible NMCQ offers + non-spoiler help. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const money=v=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(v);
function node(tag,text,css){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(css)e.className=css;return e;}
const help=node('section',undefined,'practice-help');
const trigger=node('button','Как решать? Пошаговые подсказки ▾','secondary practice-guide-toggle');
trigger.type='button';trigger.setAttribute('aria-expanded','false');
const body=node('div',undefined,'practice-help-body');body.hidden=true;
help.append(trigger,body);
$('task-notes').insertAdjacentElement('afterend',help);
function steps(kind){
 if(kind==='nmck')return[
 '1. Для каждого товара выпиши количество единиц и все цены коммерческих предложений.',
 '2. Сложи цены. Раздели на число предложений — получишь среднюю цену одной единицы.',
 '3. Если требуется, рассчитай выборочное стандартное отклонение: корень из суммы квадратов разниц с средней, разделённой на n−1.',
 '4. Коэффициент вариации, % = стандартное отклонение / средняя цена × 100.',
 '5. Умножь среднюю цену единицы (после округления до копеек) на количество. Сложи стоимости всех товаров.',
 'Числовые ответы не показываем: проверь свои расчёты самостоятельно.'];
 if(kind==='budget')return[
 '1. Раздели поступления (налоги, аренда, дотации) и траты (школы, дороги, ЖКХ, социальная помощь).',
 '2. Не складывай раздел «Образование» второй раз с расходами на школы: здесь в исходных данных только отдельные статьи.',
 '3. Суммируй отдельно плановые доходы, фактические доходы, плановые расходы, фактические расходы.',
 '4. Процент исполнения = исполнено / план × 100; отклонение = исполнено − план.',
 '5. Сальдо = фактические доходы − фактические расходы. Плюс — профицит, минус — дефицит.',
 'Суммы указаны в тысячах рублей; все вычисления выполняй в тех же единицах.'];
 return[
 '1. Открой строки бухгалтерского баланса: коды 1100, 1200, 1300, 1400, 1500, 1600, 1700 — итоги разделов.',
 '2. Проверь: 1100+1200=1600; 1300+1400+1500=1700; 1600=1700.',
 '3. Для коэффициентов используй соответствующие строки баланса и отчёта: выручка 2110, чистая прибыль 2400.',
 '4. Средняя величина за 2025 год = (значение строки в 2024 + значение в 2025) / 2.',
 '5. Дни оборота = 365 / оборачиваемость в оборотах. Рентабельность в процентах требует умножения на 100.',
 '6. По каждому показателю сначала запиши формулу на бумаге или в Excel, затем вводи полученный результат.',
 'Это тренировочные данные: нормативы и методику преподавателя уточняйте отдельно.'];
}
function renderHelp(kind){body.replaceChildren();for(const s of steps(kind))body.appendChild(node('p',s));body.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.textContent='Как решать? Пошаговые подсказки ▾';}
trigger.addEventListener('click',()=>{body.hidden=!body.hidden;trigger.setAttribute('aria-expanded',String(!body.hidden));trigger.textContent=body.hidden?'Как решать? Пошаговые подсказки ▾':'Скрыть подсказки ▴';});
function renderNmck(t){
 const root=$('sources');root.replaceChildren();
 const rows=Array.isArray(t.rows)?t.rows:[];
 if(!rows.length){root.appendChild(node('p','Не удалось получить предложения поставщиков. Создай новый вариант.','nmck-error'));return;}
 for(let i=0;i<rows.length;i++){
  const r=rows[i],box=node('div',undefined,'sourcebox');
  box.appendChild(node('h4','Позиция '+(i+1)+': '+r.name));
  box.appendChild(node('p','Количество для закупки: '+r.quantity+' шт. · Цена указана за 1 шт.','muted'));
  const wrap=node('div',undefined,'table-wrap'),table=node('table'),head=node('tr');
  ['Коммерческое предложение','Цена за единицу, руб.'].forEach(x=>head.appendChild(node('th',x)));
  table.appendChild(head);
  (r.prices||[]).forEach((price,j)=>{const tr=node('tr');tr.appendChild(node('td','Предложение № '+(j+1)));tr.appendChild(node('td',money(price)));table.appendChild(tr);});
  wrap.appendChild(table);box.appendChild(wrap);
  if(!Array.isArray(r.prices)||r.prices.length<3)box.appendChild(node('p','Ошибка: недостаточно коммерческих предложений.','nmck-error'));
  root.appendChild(box);
 }
 root.appendChild(node('p','Задание: самостоятельно рассчитай сумму предложений, среднюю цену, вариацию (если требуется), стоимость позиций и общую НМЦК.','muted'));
}
function decorate(){
 const t=window.ExamCurrentTask;if(!t||$('work').hidden)return;
 renderHelp(t.kind);
 if(t.kind==='nmck')renderNmck(t);
 if(t.kind==='budget'){
   const title=$('sources').querySelector('h4');
   if(title)title.textContent='Реальные направления расходов и поступлений · учебные суммы, тыс. руб.';
   const table=$('sources').querySelector('table');
   if(table && table.rows.length){
     const first=table.rows[0];const th=node('th','Раздел');first.insertBefore(th,first.children[1]);
     t.rows.forEach((r,i)=>{const tr=table.rows[i+1];if(tr)tr.insertBefore(node('td',r.category||'—'),tr.children[1]);});
   }
 }
 // Formula hints do not reveal the answer before the user submits it.
 for(const q of t.questions){
  const row=$('q_'+q.id)?.parentElement;
  if(!row)continue;
  const btn=node('button','?','mini-help');
  btn.type='button';btn.setAttribute('aria-label','Подсказка: '+q.label);
  const tip=node('div',q.hint||'Посмотри исходные данные.','field-hint');
  tip.hidden=true;
  btn.addEventListener('click',()=>{tip.hidden=!tip.hidden;btn.setAttribute('aria-expanded',String(!tip.hidden));});
  row.append(btn,tip);
 }
}
$('start').addEventListener('click',decorate);
$('again').addEventListener('click',decorate);
})();
