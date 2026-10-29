(function(){
'use strict';
const $=id=>document.getElementById(id),E=window.ExamEngine;
let current=null;
const fmt=n=>typeof n==='number'?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n):String(n);
function elt(tag,attrs,text){let e=document.createElement(tag);for(const [k,v] of Object.entries(attrs||{})){if(k==='className')e.className=v;else e.setAttribute(k,v);}if(text!==undefined)e.textContent=String(text);return e;}
function table(parent,heads,rows){const wrap=elt('div',{className:'table-wrap'}),t=elt('table');let h=elt('tr');heads.forEach(x=>h.appendChild(elt('th',{},x)));t.appendChild(h);for(let row of rows){const tr=elt('tr');row.forEach(x=>tr.appendChild(elt('td',{},x)));t.appendChild(tr);}wrap.appendChild(t);parent.appendChild(wrap);}
function sourceBox(label){const e=elt('div',{className:'sourcebox'});e.appendChild(elt('h4',{},label));$('sources').appendChild(e);return e;}
function renderSources(t){$('sources').replaceChildren();
 if(t.kind==='nmck')t.rows.forEach((r,i)=>{const e=sourceBox('Позиция '+(i+1)+' · '+r.name+', '+r.quantity+' шт.');table(e,['Предложение поставщика','Цена, руб.'],r.prices.map((p,i)=>['№ '+(i+1),fmt(p)]));});
 if(t.kind==='budget'){const e=sourceBox('Статьи бюджета (тыс. руб.)');table(e,['Показатель','План','Исполнено'],t.rows.map(r=>[r.name,fmt(r.plan),fmt(r.actual)]));}
 if(t.kind==='financial'){
   const b=sourceBox('Бухгалтерский баланс, тыс. руб.');table(b,['Код · показатель','2025','2024','2023'],E.bnames.map(([code,name])=>[code+' · '+name,...['2025','2024','2023'].map(y=>fmt(t.balance[y][code]))]));
   const p=sourceBox('Финансовые результаты, тыс. руб.');table(p,['Код · показатель','2025','2024'],E.pnames.map(([code,name])=>[code+' · '+name,fmt(t.pl['2025'][code]),fmt(t.pl['2024'][code])]));
 }
}
function renderQuestions(t){let p=$('questions');p.replaceChildren();let groups={};
for(let q of t.questions){let key=q.group||'Расчёты';if(!groups[key]){let box=elt('div',{className:'qgroup'});box.appendChild(elt('h4',{},key));p.appendChild(box);groups[key]=box;}
 const row=elt('div',{className:'question'}),lab=elt('label',{for:'q_'+q.id},q.label);row.appendChild(lab);
 if(typeof q.answer==='string'){let sel=elt('select',{id:'q_'+q.id,'data-question':q.id});sel.appendChild(elt('option',{value:''},'— Выберите ответ —'));let opts=q.answer==='Доход'||q.answer==='Расход'?['Доход','Расход']:['Дефицит','Профицит','Сбалансирован'];opts.forEach(s=>sel.appendChild(elt('option',{value:s},s)));row.appendChild(sel);}
 else row.appendChild(elt('input',{id:'q_'+q.id,'data-question':q.id,'inputmode':'decimal',autocomplete:'off',placeholder:'Ваш ответ'}));
 row.appendChild(elt('small',{className:'status',id:'status_'+q.id},''));groups[key].appendChild(row);
}}
function start(){try{current=E.generate($('kind').value,$('level').value);$('work').hidden=false;$('home').hidden=true;$('task-title').textContent=current.title;$('task-org').textContent=current.company;$('task-meta').textContent='Вариант '+current.id+' · '+current.questions.length+' ответов';$('task-notes').textContent=current.notes;renderSources(current);renderQuestions(current);$('results').hidden=true;$('hints').hidden=true;window.scrollTo(0,0);}catch(e){alert('Ошибка генерации: '+e.message);}}
function read(){let values={};for(const q of current.questions){const field=$('q_'+q.id);values[q.id]=field.value;}return values;}
function check(){if(!current)return;try{const g=E.grade(current,read());for(let detail of g.details){const s=$('status_'+detail.id);s.className='status '+detail.status;s.textContent=detail.status==='ok'?'✓ Верно':detail.status==='bad'?'✕ Ошибка':'— Не заполнено';}
 $('results').hidden=false;$('hints').hidden=true;$('score').textContent='Результат: '+g.ok+' из '+g.total+' ('+g.percent+'%)';$('message').textContent=g.ok===g.total?'Все ответы верные!':'Исправь ошибки и нажми «Проверить» ещё раз. Правильные значения можно открыть ниже.';save(g.percent);$('results').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){alert('Ошибка проверки: '+e.message);}}
function hints(){const box=$('hints');box.replaceChildren();current.questions.forEach(q=>{const r=elt('div',{className:'hint'});r.appendChild(elt('div',{},q.label));r.appendChild(elt('strong',{},'Ответ: '+fmt(q.answer)));r.appendChild(elt('div',{className:'muted'},q.hint||''));box.appendChild(r);});box.hidden=false;}
function save(pct){try{const old=JSON.parse(localStorage.getItem('examStats')||'{"count":0,"best":0}');old.count++;old.best=Math.max(old.best,pct);localStorage.setItem('examStats',JSON.stringify(old));drawStats();}catch(e){}}
function drawStats(){try{const s=JSON.parse(localStorage.getItem('examStats')||'{"count":0,"best":0}');$('stats').textContent='Проверено работ: '+s.count+' · Лучший результат: '+s.best+'%';}catch(e){$('stats').textContent='История недоступна; задания работают и без неё.';}}
$('start').addEventListener('click',start);$('again').addEventListener('click',start);$('check').addEventListener('click',check);$('hints-button').addEventListener('click',hints);
$('back').addEventListener('click',()=>{$('work').hidden=true;$('home').hidden=false;window.scrollTo(0,0);});drawStats();
})();