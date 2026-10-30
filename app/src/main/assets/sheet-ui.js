/* ExamTrainer v0.8: mobile spreadsheet as the primary, not a form quiz. */
(function(){'use strict';
/* Android System WebView compatibility: replaceChildren() is absent in older builds. */
if(typeof Element.prototype.replaceChildren!=='function'){
 Element.prototype.replaceChildren=function(...children){
   while(this.firstChild)this.removeChild(this.firstChild);
   for(const x of children)this.appendChild(typeof x==='string'?document.createTextNode(x):x);
 };
}

const $=id=>document.getElementById(id),E=window.ExamEngine,S=window.ExamSheets;
S.setEngine(E);
let task=null,w=null,active='',selected='',checked=null,editDirty=false;
const history=[];
const fmt=n=>typeof n==='number'?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n):String(n??'');
// Blank formulas must stay visually empty, not display '0' after Undo.
const shown=(sheet,a,v)=>v&&String(v.raw??'').trim()!==''?fmt(S.value(w,sheet,a)):'';
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
const undo=node('button','↶','excel-undo');undo.type='button';undo.setAttribute('aria-label','Отменить последнюю формулу');undo.disabled=true;
bar.append(address,fx,input,undo,commit);
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
const progressBox=node('div',undefined,'excel-progress'),progressLabel=node('span','Прогресс выполнения','excel-progress-label');
const progressBar=document.createElement('progress');progressBar.max=1;progressBar.value=0;progressBar.setAttribute('aria-label','Заполнение расчётных ячеек');
const progressHead=node('div',undefined,'excel-progress-head');
const jumpButton=node('button','К расчётам ↓','excel-jump');jumpButton.type='button';
jumpButton.setAttribute('aria-label','Показать выбранную расчётную ячейку в таблице');
progressHead.append(progressLabel,jumpButton);
progressBox.append(progressHead,progressBar);toolbar.prepend(progressBox);
jumpButton.addEventListener('click',()=>{
 const cell=gridbox.querySelector('td.excel-selected')||gridbox.querySelector('td.excel-editable');
 if(!cell)return;
 cell.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});
});
function updateProgress(){
 if(!w)return;
 const filled=w.targets.filter(t=>String(w.sheets[t.sheet]?.values[t.addr]?.raw??'').trim()!=='').length;
 progressLabel.textContent='Заполнено '+filled+' из '+w.targets.length+' расчётных ячеек · черновик сохраняется';
 progressBar.max=Math.max(1,w.targets.length);progressBar.value=filled;
 jumpButton.disabled=!gridbox.querySelector('td.excel-editable');
}
function invalidateCheck(){checked=null;$('results').hidden=true;footer.replaceChildren();}
function jumpTo(t){
 if(!t||!w.sheets[t.sheet])return;
 flush();active=t.sheet;selected=t.addr;renderGrid();
 const cell=Array.from(gridbox.querySelectorAll('td[data-addr]')).find(x=>x.dataset.addr===t.addr);
 if(cell)cell.scrollIntoView({block:'nearest',inline:'center'});
 sheetRoot.scrollIntoView({block:'start'});
}
const kindGuides={nmck:[
  'Исходные данные — количество в колонке D и коммерческие цены в колонках E–I.',
  'В НМЦК вычисления начинаются со строки 6. Диапазон коммерческих предложений — E6:G6 (3 КП), E6:H6 (4 КП), E6:I6 (5 КП).',
  'В первой расчётной колонке введи =СРЗНАЧ(E6:G6), в следующей =СТАНДОТКЛОН.В(E6:G6). Для 4 или 5 КП расширь диапазон.',
  'Коэффициент вариации = (отклонение / средняя цена) * 100; цена позиции = ОКРУГЛ(средняя цена;2) * количество.',
  'Под таблицей находится общая НМЦК. Вводи формулы в жёлтые ячейки; «Вставить формулу» показывает пример для выбранного расчёта.',
  'Важно: пустые ячейки должны игнорироваться в СРЗНАЧ, СТАНДОТКЛОН.В и СЧЁТ. Коэффициент вариации — число в процентах (5,5 означает 5,5%).'
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
function renderGrid(){const sh=w.sheets[active];tabs.replaceChildren();for(const name of w.order){const b=node('button',name,'excel-tab'+(name===active?' is-active':''));b.type='button';b.addEventListener('click',()=>{flush();active=name;selected='';renderGrid();});tabs.appendChild(b);}
const table=node('table',undefined,'excel-grid');const thead=node('thead'),hr=node('tr');hr.appendChild(node('th','', 'excel-corner'));
for(let c=0;c<sh.cols;c++)hr.appendChild(node('th',S.col(c),'excel-col'));thead.appendChild(hr);table.appendChild(thead);
const tbody=node('tbody');for(let r=0;r<sh.rows;r++){
 const tr=node('tr');tr.appendChild(node('th',r+1,'excel-row'));for(let c=0;c<sh.cols;c++){
   const a=S.addr(c,r),raw=sh.values[a],editable=!!sh.editable[a];
   const td=node('td',shown(active,a,raw),editable?'excel-editable':raw?'excel-locked':'excel-blank');
   td.dataset.addr=a;td.title=raw?.raw?.toString()||a;
   const colspan=sh.spans&&sh.spans[a];if(Number.isInteger(colspan)&&colspan>1){td.colSpan=colspan;c+=colspan-1;}
   if(r===0)td.classList.add('excel-header');
   if(selected===a)td.classList.add('excel-selected');
   td.addEventListener('click',()=>{
    if(editDirty && !input.disabled && selected!==a && input.value.trim().startsWith('=')){
      const pos=input.selectionStart===null?input.value.length:input.selectionStart;
      input.value=input.value.slice(0,pos)+a+input.value.slice(pos);
      editDirty=true;input.focus();
      input.setSelectionRange(pos+a.length,pos+a.length);
      info.textContent='Добавлена ссылка '+a+'. Продолжи формулу и нажми ✓ для сохранения.';
    }else select(a);
   });tr.appendChild(td);
 }tbody.appendChild(tr);}
 table.appendChild(tbody);gridbox.replaceChildren(table);
 select(selected||firstEditable(sh),false);}
function firstEditable(sh){return Object.keys(sh.editable)[0]||'A1';}
function select(a,focus=false){if(editDirty)flush();selected=a;const sh=w.sheets[active],raw=sh.values[a];address.textContent=active+'!'+a;input.value=raw?String(raw.raw):'';editDirty=false;
 input.disabled=!sh.editable[a];commit.disabled=!sh.editable[a];
 info.textContent=!sh.editable[a]?'Исходная ячейка '+a+' защищена. Используй её в формулах.':(w.hintMap[active+'!'+a]||'Жёлтая ячейка: введи формулу, начинающуюся с =');
 for(const el of gridbox.querySelectorAll('.excel-selected'))el.classList.remove('excel-selected');
 const chosen=Array.from(gridbox.querySelectorAll('td[data-addr]')).find(e=>e.dataset.addr===a);if(chosen)chosen.classList.add('excel-selected');
 if(focus&&!input.disabled)input.focus();updateProgress();}
function flush(){if(!w||!active||!selected||!editDirty)return;try{
 const previous=w.sheets[active].values[selected]?.raw??'';
 S.write(w,active,selected,input.value);
 if(String(previous)!==String(input.value)){history.push({sheet:active,addr:selected,raw:previous});if(history.length>30)history.shift();}
 undo.disabled=!history.length;
 editDirty=false;invalidateCheck();refreshValues();saveDraft();updateProgress();info.textContent='Формула сохранена. Выбери следующую ячейку или проверь работу.';}catch(e){info.textContent=e.message;}}
function refreshValues(){if(!w)return;for(const cell of gridbox.querySelectorAll('td[data-addr]')){const v=w.sheets[active].values[cell.dataset.addr];cell.textContent=shown(active,cell.dataset.addr,v);cell.classList.remove('excel-pass','excel-fail','excel-needs');}
 if(checked)for(const r of checked.results)if(r.sheet===active){const el=Array.from(gridbox.querySelectorAll('td[data-addr]')).find(x=>x.dataset.addr===r.addr);if(el)el.classList.add(r.status==='ok'?'excel-pass':r.status==='need-formula'?'excel-needs':'excel-fail');}}
function check(){
 flush();checked=S.grade(w);refreshValues();
 $('results').hidden=false;$('hints').hidden=true;
 $('score').textContent='Проверка: '+checked.passed+' из '+checked.total+' ('+checked.percent+'%)';
 const errors=checked.results.filter(r=>r.status!=='ok');
 const bad=errors.filter(r=>r.status==='bad'),empty=errors.filter(r=>r.status==='empty'),needs=errors.filter(r=>r.status==='need-formula');
 $('message').textContent=errors.length
  ? 'Ошибочные значения: '+bad.length+' · нет формулы: '+needs.length+' · пустые поля: '+empty.length+'. Исправляй их по одной — результаты обновятся после повторной проверки.'
  : 'Отлично! Все расчёты выполнены правильно, с формулами.';
 footer.replaceChildren();
 if(errors.length){
  const first=bad[0]||needs[0]||empty[0];
  const main=node('button','Перейти к исправлению: '+first.sheet+'!'+first.addr,'excel-err-primary');
  main.type='button';main.addEventListener('click',()=>jumpTo(first));footer.appendChild(main);
  const caption=node('p','Ниже — первые 6 проблемных ячеек. Остальные откроются после их исправления.','excel-err-caption');
  footer.appendChild(caption);
  for(const r of errors.slice(0,6)){
   const label=r.status==='need-formula'?'Число без формулы':r.status==='empty'?'Не заполнено':'Ошибка в расчёте';
   const b=node('button',r.sheet+'!'+r.addr+' · '+label,'excel-err-button');b.type='button';
   b.addEventListener('click',()=>jumpTo(r));footer.appendChild(b);
  }
 }
 saveStats(checked.percent);$('results').scrollIntoView({block:'start',behavior:'smooth'});
}
function showAnswers(){const box=$('hints');box.replaceChildren();for(const r of (checked?.results||[])){const el=node('p',r.sheet+'!'+r.addr+' — '+r.label+': '+fmt(r.answer)+(r.hint?' · '+r.hint:''),'excel-answer');box.appendChild(el);}box.hidden=false;}
function saveDraft(){try{localStorage.setItem('examSheetsDraft',JSON.stringify({task,entries:S.save(w),active}));}catch(e){}}
function restoreDraft(){try{const v=JSON.parse(localStorage.getItem('examSheetsDraft')||'null');if(!v?.task?.kind||!Array.isArray(v.task.questions))return;task=v.task;w=S.create(task);S.load(w,v.entries);active=w.sheets[v.active]?v.active:w.order[0];showWork();}catch(e){}}
function saveStats(pct){try{const old=JSON.parse(localStorage.getItem('examStats')||'{"count":0,"best":0}');old.count++;old.best=Math.max(old.best,pct);localStorage.setItem('examStats',JSON.stringify(old));$('stats').textContent=`Проверено работ: ${old.count} · Лучший результат ${old.best}%`;}catch(e){}}
function showWork(){$('work').hidden=false;$('home').hidden=true;document.body.classList.add('exam-solving');$('task-title').textContent=task.title+' · Таблицы';$('task-org').textContent=task.company;
 $('task-meta').textContent=task.questions.length+' исходных вопросов · '+w.targets.length+' ячеек для проверки · '+w.order.length+' лист(а)';
 $('task-notes').textContent='Жёлтые ячейки — ввод формул. Исходные данные защищены.';
 $('results').hidden=true;checked=null;footer.replaceChildren();renderGrid();updateProgress();window.scrollTo(0,0);}
function start(){if(w)flush();if(w&&Object.values(S.save(w)).some(x=>Object.keys(x).length)&&!confirm('Создать новый вариант? Черновик предыдущего будет заменён.'))return;
 try{task=E.generate($('kind').value,$('level').value);w=S.create(task);history.length=0;undo.disabled=true;active=w.order[w.order.length-1];selected='';showWork();saveDraft();}catch(e){alert('Ошибка создания таблицы: '+e.message);}}
input.addEventListener('input',()=>{editDirty=true;});input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();flush();input.blur();}else if(e.key==='Escape'){e.preventDefault();select(selected);}});
commit.addEventListener('click',flush);
undo.addEventListener('click',()=>{
 if(!w||!history.length)return;
 const item=history.pop();if(!w.sheets[item.sheet]?.editable[item.addr])return;
 S.write(w,item.sheet,item.addr,item.raw);undo.disabled=!history.length;invalidateCheck();
 editDirty=false;input.value=String(item.raw??'');active=item.sheet;selected=item.addr;renderGrid();refreshValues();saveDraft();updateProgress();
 info.textContent='Последнее изменение отменено. Можно ввести другую формулу.';
});
$('start').addEventListener('click',start);$('again').addEventListener('click',start);$('check').addEventListener('click',check);
$('hints-button').addEventListener('click',showAnswers);
$('back').addEventListener('click',()=>{flush();saveDraft();$('work').hidden=true;$('home').hidden=false;document.body.classList.remove('exam-solving');window.scrollTo(0,0);});
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