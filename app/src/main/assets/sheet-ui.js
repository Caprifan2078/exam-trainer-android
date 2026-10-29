/* ExamTrainer v0.8: mobile spreadsheet as the primary, not a form quiz. */
(function(){'use strict';
const $=id=>document.getElementById(id),E=window.ExamEngine,S=window.ExamSheets;
S.setEngine(E);
let task=null,w=null,active='',selected='',checked=null,editDirty=false;
const fmt=n=>typeof n==='number'?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n):String(n??'');
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e;};
const sheetRoot=$('sources');
$('work').querySelector('h3').textContent='01 · Таблица Excel';
$('work').querySelectorAll('h3')[1].textContent='02 · Проверь свою работу';
$('questions').replaceChildren();$('questions').hidden=true;
$('check').textContent='Проверить таблицу ✓';
$('hints-button').textContent='Показать правильные значения (после проверки)';
$('task-notes').textContent='';
const toolbar=node('div',undefined,'excel-tool');
const tabs=node('div',undefined,'excel-tabs');
const bar=node('div',undefined,'excel-formula-bar');
const address=node('span','A1','excel-addr');address.setAttribute('aria-label','Адрес выбранной ячейки');
const fx=node('span','fx','excel-fx');
const input=node('input',undefined,'excel-input');input.type='text';input.autocomplete='off';input.spellcheck=false;input.placeholder='Выбери ячейку и введи формулу =…';
input.setAttribute('aria-label','Ввод формул');
const commit=node('button','✓','excel-commit');commit.type='button';commit.setAttribute('aria-label','Применить формулу');
bar.append(address,fx,input,commit);
const gridbox=node('div',undefined,'excel-grid-box');gridbox.tabIndex=0;
const info=node('div','Выбирай жёлтую ячейку, вводи =формулу в строку fx. Синие значения — исходные.','excel-info');
const controls=node('div',undefined,'excel-controls');
const helpButton=node('button','? Подсказка','secondary');helpButton.type='button';
const sheetHelp=node('div',undefined,'excel-help');sheetHelp.hidden=true;
const exportButton=node('button','Скачать XLSX','secondary');exportButton.type='button';
const formulaExample=node('button','Примеры формул','secondary');formulaExample.type='button';
controls.append(helpButton,formulaExample,exportButton);
toolbar.append(tabs,bar,gridbox,info,controls,sheetHelp);
sheetRoot.replaceChildren(toolbar);
const footer=node('div',undefined,'excel-check-help');$('questions').insertAdjacentElement('afterend',footer);
const kindGuides={nmck:[
  'Исходные данные — количество в колонке D и коммерческие цены в колонках E–I.',
  'Кликни J4: =SUM(E4:I4) для 5 коммерческих предложений. Или =СУММ(E4:I4).',
  'K4: =AVERAGE(E4:I4) (СРЗНАЧ). L4: =STDEV.S(E4:I4) (СТАНДОТКЛОН.В).',
  'M4: =L4/K4*100. N4: =ROUND(K4;2)*D4. Итог — сумма значений N по позициям.',
  'Подсказка: диапазон E4:I4 должен соответствовать фактическому количеству предложений; пустые ячейки функции SUM и AVERAGE игнорируют.'
],budget:[
  'Формулировка статьи находится в колонке B, раздел — в C, план — в D, факт — в E.',
  'В F впиши доход или расход — это группировка. Колонка G — доля фактической статьи среди всех фактических доходов или расходов.',
  'Для сумм доходов используй =SUMIF(F4:F19;"Доход";E4:E19) (или СУММЕСЛИ); последние строки таблицы содержат итоги.',
  'В H рассчитай процент исполнения =E4/D4*100; в I отклонение =E4-D4.',
  'Результат: фактические доходы минус фактические расходы. Положительное значение — профицит, отрицательное — дефицит.'
],financial:[
  'На вкладке «Баланс» три года и коды строк: 1100/1200/1600 — актив, 1300/1400/1500/1700 — пассив.',
  'На вкладке «ОФР» выручка 2110, чистая прибыль 2400. На вкладке «Анализ» жёлтые поля под 2025 и 2024 — твои ответы.',
  'Переключайся между листами и используй ссылки: =Баланс!C5/Баланс!C9. Реальные адреса найди по коду строки.',
  'Средняя величина за год = (показатель на конец года + показатель на конец прошлого года) / 2.',
  'Периоды оборота в днях = 365/коэффициент оборачиваемости. Для рентабельности проценты указывай числом, например 5,25 вместо 0,0525.'
]};
function showHelp(lines){sheetHelp.replaceChildren();for(const line of lines)sheetHelp.appendChild(node('p',line));sheetHelp.hidden=false;sheetHelp.scrollIntoView({block:'nearest'});}
function renderGrid(){const sh=w.sheets[active];tabs.replaceChildren();for(const name of w.order){const b=node('button',name,'excel-tab'+(name===active?' is-active':''));b.type='button';b.addEventListener('click',()=>{flush();active=name;selected='';checked=null;renderGrid();});tabs.appendChild(b);}
const table=node('table',undefined,'excel-grid');const thead=node('thead'),hr=node('tr');hr.appendChild(node('th','', 'excel-corner'));
for(let c=0;c<sh.cols;c++)hr.appendChild(node('th',S.col(c),'excel-col'));thead.appendChild(hr);table.appendChild(thead);
const tbody=node('tbody');for(let r=0;r<sh.rows;r++){
 const tr=node('tr');tr.appendChild(node('th',r+1,'excel-row'));for(let c=0;c<sh.cols;c++){
   const a=S.addr(c,r),raw=sh.values[a],editable=!!sh.editable[a];
   const td=node('td',raw?fmt(S.value(w,active,a)):'',editable?'excel-editable':raw?'excel-locked':'excel-blank');
   td.dataset.addr=a;td.title=raw?.raw?.toString()||a;
   if(r===0)td.classList.add('excel-header');
   if(selected===a)td.classList.add('excel-selected');
   td.addEventListener('click',()=>select(a));tr.appendChild(td);
 }tbody.appendChild(tr);}
 table.appendChild(tbody);gridbox.replaceChildren(table);
 select(selected||firstEditable(sh),false);}
function firstEditable(sh){return Object.keys(sh.editable)[0]||'A1';}
function select(a,focus=false){if(editDirty)flush();selected=a;const sh=w.sheets[active],raw=sh.values[a];address.textContent=active+'!'+a;input.value=raw?String(raw.raw):'';editDirty=false;
 input.disabled=!sh.editable[a];commit.disabled=!sh.editable[a];
 info.textContent=!sh.editable[a]?'Исходная ячейка '+a+' защищена. Используй её в формулах.':(w.hintMap[active+'!'+a]||'Жёлтая ячейка: введи формулу, начинающуюся с =');
 for(const el of gridbox.querySelectorAll('.excel-selected'))el.classList.remove('excel-selected');
 const chosen=Array.from(gridbox.querySelectorAll('td[data-addr]')).find(e=>e.dataset.addr===a);if(chosen)chosen.classList.add('excel-selected');
 if(focus&&!input.disabled)input.focus();}
function flush(){if(!w||!active||!selected||!editDirty)return;try{S.write(w,active,selected,input.value);editDirty=false;refreshValues();saveDraft();}catch(e){info.textContent=e.message;}}
function refreshValues(){if(!w)return;for(const cell of gridbox.querySelectorAll('td[data-addr]')){const v=w.sheets[active].values[cell.dataset.addr];cell.textContent=v?fmt(S.value(w,active,cell.dataset.addr)):'';cell.classList.remove('excel-pass','excel-fail','excel-needs');}
 if(checked)for(const r of checked.results)if(r.sheet===active){const el=Array.from(gridbox.querySelectorAll('td[data-addr]')).find(x=>x.dataset.addr===r.addr);if(el)el.classList.add(r.status==='ok'?'excel-pass':r.status==='need-formula'?'excel-needs':'excel-fail');}}
function check(){flush();checked=S.grade(w);refreshValues();$('results').hidden=false;$('hints').hidden=true;
 $('score').textContent='Проверка: '+checked.passed+' из '+checked.total+' ('+checked.percent+'%)';
 const errs=checked.results.filter(x=>x.status!=='ok');$('message').textContent=errs.length?`${errs.length} ячеек требуют исправления. Красный — ошибка или пусто, оранжевый — верное число без формулы.`:'Отлично! Все вычисления выполнены верно с формулами.';
 footer.replaceChildren();for(const r of errs.slice(0,14)){const b=node('button',r.sheet+'!'+r.addr+' · '+(r.status==='need-formula'?'Нужна формула':r.status==='empty'?'Пусто':'Ошибка'),'excel-err-button');b.type='button';b.addEventListener('click',()=>{active=r.sheet;selected=r.addr;renderGrid();document.getElementById('sources').scrollIntoView({block:'start'});});footer.appendChild(b);}
 saveStats(checked.percent);$('results').scrollIntoView({block:'start',behavior:'smooth'});}
function showAnswers(){const box=$('hints');box.replaceChildren();for(const r of (checked?.results||[])){const el=node('p',r.sheet+'!'+r.addr+' — '+r.label+': '+fmt(r.answer)+(r.hint?' · '+r.hint:''),'excel-answer');box.appendChild(el);}box.hidden=false;}
function saveDraft(){try{localStorage.setItem('examSheetsDraft',JSON.stringify({task,entries:S.save(w),active}));}catch(e){}}
function restoreDraft(){try{const v=JSON.parse(localStorage.getItem('examSheetsDraft')||'null');if(!v?.task?.kind||!Array.isArray(v.task.questions))return;task=v.task;w=S.create(task);S.load(w,v.entries);active=w.sheets[v.active]?v.active:w.order[0];showWork();}catch(e){}}
function saveStats(pct){try{const old=JSON.parse(localStorage.getItem('examStats')||'{"count":0,"best":0}');old.count++;old.best=Math.max(old.best,pct);localStorage.setItem('examStats',JSON.stringify(old));$('stats').textContent=`Проверено работ: ${old.count} · Лучший результат ${old.best}%`;}catch(e){}}
function showWork(){$('work').hidden=false;$('home').hidden=true;$('task-title').textContent=task.title+' · Таблицы';$('task-org').textContent=task.company;
 $('task-meta').textContent=task.questions.length+' исходных вопросов · '+w.targets.length+' ячеек для проверки · '+w.order.length+' лист(а)';
 $('task-notes').textContent='Жёлтые ячейки — ввод формул. Таблицы работают автономно. Числа не подставляются в расчёты.';
 $('results').hidden=true;checked=null;footer.replaceChildren();renderGrid();window.scrollTo(0,0);}
function start(){if(w&&Object.values(S.save(w)).some(x=>Object.keys(x).length)&&!confirm('Создать новый вариант? Черновик предыдущего будет заменён.'))return;
 try{task=E.generate($('kind').value,$('level').value);w=S.create(task);active=w.order[w.order.length-1];selected='';showWork();saveDraft();}catch(e){alert('Ошибка создания таблицы: '+e.message);}}
input.addEventListener('input',()=>{editDirty=true;});input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();flush();input.blur();}else if(e.key==='Escape'){e.preventDefault();select(selected);}});
commit.addEventListener('click',flush);$('start').addEventListener('click',start);$('again').addEventListener('click',start);$('check').addEventListener('click',check);
$('hints-button').addEventListener('click',showAnswers);
$('back').addEventListener('click',()=>{flush();saveDraft();$('work').hidden=true;$('home').hidden=false;window.scrollTo(0,0);});
helpButton.addEventListener('click',()=>{flush();if(sheetHelp.hidden)showHelp(kindGuides[task.kind]);else sheetHelp.hidden=true;});
formulaExample.addEventListener('click',()=>showHelp(['Доступные функции: SUM/СУММ, AVERAGE/СРЗНАЧ, STDEV.S/СТАНДОТКЛОН.В, ROUND/ОКРУГЛ, SQRT/КОРЕНЬ, IF/ЕСЛИ, SUMIF/СУММЕСЛИ, COUNT/СЧЁТ, MIN, MAX, ABS.',
'Поддерживаются ссылки на одну ячейку, диапазон A1:C8 и другие листы: =Баланс!C5+Баланс!D5. В формулах используй ; между аргументами.',
'Сначала заполни промежуточные ячейки, после этого итоговые. Для редактирования нажми жёлтую ячейку и введи формулу в поле fx.',
'Правильные значения можно увидеть только после нажатия «Проверить».']));
exportButton.addEventListener('click',()=>{flush();try{const b64=window.ExamXlsx.exportBase64(w);const filename='exam-training-'+task.kind+'-'+Date.now()+'.xlsx';
 if(window.ExamNative&&typeof window.ExamNative.saveXlsx==='function')window.ExamNative.saveXlsx(filename,b64);
 else{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=node('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 }catch(e){alert('Не удалось сохранить XLSX: '+e.message);}});
restoreDraft();try{const st=JSON.parse(localStorage.getItem('examStats')||'{}');$('stats').textContent='Проверено работ: '+(st.count||0)+' · Лучший результат '+(st.best||0)+'%';}catch(e){}
})();