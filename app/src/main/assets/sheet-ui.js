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
let task=null,w=null,active='',selected='',checked=null,editDirty=false,pendingReference=null,session=null;
const history=[];
const viewMemory={};
const fmt=n=>typeof n==='number'?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n):String(n??'');
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e;};
const sheetRoot=$('sources');
$('work').querySelector('h3').textContent='01 · Таблица Excel';
$('verification-title').textContent='02 · Проверь свою работу';
$('questions').replaceChildren();$('questions').hidden=true;
$('check').textContent='Проверить таблицу ✓';
$('hints-button').textContent='Показать правильные значения (после проверки)';
$('task-notes').textContent='';
function hintsAllowed(){return !!task&&(task.practiceMode!=='exam'||!!session?.finished||(!session&&!!task.helpUsed));}
function activeExam(){return !!session&&!session.finished;}
function stageSubmitted(){return activeExam()&&!!session.results[session.index];}
const modePanel=node('div',undefined,'mode-panel'),modeStatus=node('span','','mode-status'),unlockHelp=node('button','Нужна помощь','mode-unlock');
unlockHelp.type='button';modePanel.append(modeStatus,unlockHelp);
window.ExamMode={allowHints:hintsAllowed,allowReviewFeedback:()=>!activeExam(),cellHint:(sheet,addr)=>hintsAllowed()?w?.targets.find(t=>t.sheet===sheet&&t.addr===addr)?.hint:null};
const sessionStatus=node('div','','session-status'),nextSession=node('button','Следующее задание →','secondary');sessionStatus.hidden=true;nextSession.hidden=true;nextSession.type='button';
const saveWorkButton=node('button','Сохранить эту работу','secondary');saveWorkButton.type='button';
const resumeExamButton=node('button','Продолжить экзамен','secondary');
resumeExamButton.type='button';resumeExamButton.hidden=true;
$('start').insertAdjacentElement('afterend',resumeExamButton);
function updateExamControls(){
 const timed=$('mode').value==='exam'||$('mode').value==='full_exam';
 $('kind').hidden=timed;
 const label=document.querySelector('label[for="kind"]');if(label)label.hidden=timed;
 resumeExamButton.hidden=!session;
 resumeExamButton.textContent=session?.finished?'Посмотреть результат экзамена':'Продолжить экзамен';
}
$('mode').addEventListener('change',updateExamControls);
resumeExamButton.addEventListener('click',()=>{
 if(!session||!w)return;
 showWork();saveDraft();
});
updateExamControls();
const mobileCard=node('div',undefined,'mobile-cell-card'),mobileLabel=node('label','Выбранная ячейка','mobile-cell-label'),mobileInput=node('input'),mobileApply=node('button','Сохранить ввод','mobile-cell-apply');
mobileInput.type='text';mobileInput.maxLength=300;mobileInput.setAttribute('aria-label','Ввод в выбранную ячейку');mobileApply.type='button';mobileCard.append(mobileLabel,mobileInput,mobileApply);
const toolbar=node('div',undefined,'excel-tool');
const tabs=node('div',undefined,'excel-tabs');
const bar=node('div',undefined,'excel-formula-bar');
const address=node('span','A1','excel-addr');address.setAttribute('aria-label','Адрес выбранной ячейки');
const fx=node('span','fx','excel-fx');
const input=node('input',undefined,'excel-input');input.type='text';input.autocomplete='off';input.spellcheck=false;input.placeholder='Введи число или формулу =…';
input.setAttribute('aria-label','Ввод формул');input.maxLength=300;
const commit=node('button','✓','excel-commit');commit.type='button';commit.setAttribute('aria-label','Применить формулу');
const undo=node('button','↶','excel-undo');undo.type='button';undo.setAttribute('aria-label','Отменить последнюю формулу');undo.disabled=true;
bar.append(address,fx,input,undo,commit);
const suggestBox=node('div',undefined,'formula-suggestions');suggestBox.hidden=true;suggestBox.setAttribute('role','listbox');
let suggestions=null,suggestionIndex=0,usingMobileCard=false;
function closeSuggestions(){suggestions=null;suggestBox.hidden=true;suggestBox.replaceChildren();}
function acceptSuggestion(index){if(!suggestions||!suggestions.items[index])return false;const v=window.ExamFormulaComplete.insert(input.value,suggestions.start,suggestions.end,suggestions.items[index].name+'(');input.value=v.value;mobileInput.value=v.value;editDirty=true;closeSuggestions();const editor=usingMobileCard?mobileInput:input;editor.focus();editor.setSelectionRange(v.caret,v.caret);input.setSelectionRange(v.caret,v.caret);return true;}
function showSuggestions(){
 closeSuggestions();if(input.disabled||!hintsAllowed())return;
 suggestions=window.ExamFormulaComplete.candidates(input.value,input.selectionStart);if(!suggestions)return;
 suggestionIndex=0;suggestBox.hidden=false;
 suggestions.items.forEach((item,i)=>{const b=node('button',item.name+' — '+item.desc,'formula-suggestion'+(i===0?' active':''));b.type='button';b.setAttribute('role','option');b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',()=>acceptSuggestion(i));suggestBox.appendChild(b);});
}
function moveSuggestion(delta){if(!suggestions)return;const n=suggestions.items.length;suggestionIndex=(suggestionIndex+delta+n)%n;Array.from(suggestBox.children).forEach((x,i)=>x.classList.toggle('active',i===suggestionIndex));}

const cellContext=node('div','Выбери ячейку для расчёта','excel-cell-context');
cellContext.setAttribute('role','status');
function updateCellContext(){
 if(!w||!active||!selected)return;
 const sh=w.sheets[active],p=S.decode(selected);
 if(!p)return;
 const row=p.r+1,heading=String(sh.values['B'+row]?.raw??'').trim();
 const col=S.col(p.c),head=String(sh.values[col+(w.kind==='nmck'?5:1)]?.raw??'').trim();
 const name=heading&&heading.length>120?heading.slice(0,117)+'…':heading;
 const label=[active+'!'+selected,head,name].filter(Boolean).join(' · ');
 cellContext.textContent=label;
 cellContext.title=label;mobileLabel.textContent=label;mobileInput.value=input.value;mobileInput.disabled=input.disabled;mobileApply.disabled=input.disabled;
}
function revealSelected(){
 const el=gridbox.querySelector('td.excel-selected'),viewport=gridbox.getBoundingClientRect();
 if(!el||viewport.width<1)return;
 const rect=el.getBoundingClientRect();
 if(rect.right>viewport.right-12)gridbox.scrollLeft+=rect.right-viewport.right+12;
 else if(rect.left<viewport.left+12)gridbox.scrollLeft-=viewport.left+12-rect.left;
 if(rect.bottom>viewport.bottom-8)gridbox.scrollTop+=rect.bottom-viewport.bottom+8;
 else if(rect.top<viewport.top+8)gridbox.scrollTop-=viewport.top+8-rect.top;
}
const gridbox=node('div',undefined,'excel-grid-box');gridbox.tabIndex=0;gridbox.setAttribute('aria-label','Таблица: стрелки перемещают выделение, Enter открывает ввод');
let inlineCell=null;
function closeInline(){if(!inlineCell)return;bar.insertBefore(input,undo);input.placeholder='Введи число или формулу =…';inlineCell.classList.remove('excel-editing');const v=w?.sheets[active]?.values[inlineCell.dataset.addr];inlineCell.textContent=v&&String(v.raw).trim()?fmt(S.value(w,active,inlineCell.dataset.addr)):'';inlineCell=null;}
function openInline(td){if(input.disabled)return;usingMobileCard=false;closeInline();inlineCell=td;td.classList.add('excel-editing');td.textContent='';input.placeholder='';td.appendChild(input);input.focus();input.setSelectionRange(input.value.length,input.value.length);}
const info=node('div','Выбирай жёлтую ячейку, вводи =формулу в строку fx. Синие значения — исходные.','excel-info');
const controls=node('div',undefined,'excel-controls');
const helpButton=node('button','? Подсказка','secondary');helpButton.type='button';
const sheetHelp=node('div',undefined,'excel-help');sheetHelp.hidden=true;
const exportButton=node('button','Скачать XLSX','secondary');exportButton.type='button';
const formulaExample=node('button','Примеры формул','secondary');formulaExample.type='button';
controls.append(helpButton,formulaExample,exportButton);
const exportFeedback=node('span','','note');controls.appendChild(exportFeedback);
window.addEventListener('exam-native-save',event=>{
 const detail=event.detail||{};
 if(detail.format!=='xlsx')return;
 exportFeedback.textContent=detail.status==='saved'
  ?'Excel-файл успешно записан в выбранную папку.'
  :detail.status==='cancelled'?'Сохранение Excel отменено.'
  :'Не удалось записать Excel. Попробуй другую папку.';
});
toolbar.append(tabs,bar,suggestBox,cellContext,mobileCard,gridbox,info,controls,sheetHelp);
$('results').appendChild(nextSession);$('check').insertAdjacentElement('beforebegin',saveWorkButton);
$('check').insertAdjacentElement('afterend',nextSession);
const submissionNotice=node('p','Задание сдано. Ответы зафиксированы. Ошибки и баллы будут доступны после завершения всего экзамена.','note');
submissionNotice.hidden=true;submissionNotice.setAttribute('role','status');
nextSession.insertAdjacentElement('afterend',submissionNotice);
sheetRoot.replaceChildren(toolbar);
const explainButton=node('button','Разобрать ошибки','secondary'),explanations=node('div',undefined,'error-explanations');explainButton.type='button';explainButton.hidden=true;explanations.hidden=true;$('message').insertAdjacentElement('afterend',explainButton);explainButton.insertAdjacentElement('afterend',explanations);
explainButton.addEventListener('click',()=>{if(!checked||!hintsAllowed())return;explanations.replaceChildren();const issues=checked.results.filter(x=>x.status!=='ok');if(!issues.length)explanations.appendChild(node('p','Ошибок в таблице не найдено.'));for(const x of issues.slice(0,12)){let advice=x.status==='empty'?'Заполни эту ячейку.':x.status==='need-formula'?'Результат верный, но здесь нужна формула со ссылками на ячейки.':task.kind==='budget'?'Проверь, доход это или расход, а также выбранные строки и единицы измерения.':task.kind==='financial'?'Проверь показатель в числителе и знаменателе, год и среднюю величину за два года.':'Проверь диапазон предложений, количество и нужное промежуточное значение.';explanations.appendChild(node('p',x.sheet+'!'+x.addr+' · '+x.label+': '+advice));}explanations.hidden=false;});
const footer=node('div',undefined,'excel-check-help');$('questions').insertAdjacentElement('afterend',footer);
const progressBox=node('div',undefined,'excel-progress'),progressLabel=node('span','Прогресс выполнения','excel-progress-label');
const progressBar=document.createElement('progress');progressBar.max=1;progressBar.value=0;progressBar.setAttribute('aria-label','Заполнение расчётных ячеек');
progressBox.append(progressLabel,progressBar);toolbar.prepend(modePanel,sessionStatus,progressBox);
function updateProgress(){
 if(!w)return;
 const filled=w.targets.filter(t=>String(w.sheets[t.sheet]?.values[t.addr]?.raw??'').trim()!=='').length;
 progressLabel.textContent='Заполнено '+filled+' из '+w.targets.length+' ячеек · черновик сохраняется';
 progressBar.max=Math.max(1,w.targets.length);progressBar.value=filled;
}
function applyMode(){
 const exam=task?.practiceMode==='exam',allowed=hintsAllowed();
 modeStatus.textContent=exam?(allowed?'Экзамен · с подсказками':'Экзамен · без подсказок'):'Обучение · подсказки доступны';
 unlockHelp.hidden=!exam||allowed||!!session;helpButton.hidden=!allowed;formulaExample.hidden=!allowed;
 $('review-example').hidden=!allowed;$('review-check').hidden=activeExam();
 $('hints-button').hidden=!allowed;explainButton.hidden=!allowed||!checked;
 $('again').hidden=!!session;
 if(!allowed)explanations.hidden=true;
 if(!allowed){sheetHelp.hidden=true;$('hints').hidden=true;closeSuggestions();}
 window.dispatchEvent(new Event('exam-mode-change'));
}
unlockHelp.addEventListener('click',()=>{
 if(!task||task.practiceMode!=='exam'||task.helpUsed||session?.finished)return;
 if(!confirm('Открыть подсказки и ответы? В этой работе результат будет отмечен как выполненный с помощью.'))return;
 task.helpUsed=true;applyMode();saveDraft();
 if(checked&&!session)$('score').textContent='Проверка: '+checked.passed+' из '+checked.total+' ('+checked.percent+'%) · с подсказками';
});
function invalidateCheck(){checked=null;$('results').hidden=true;explainButton.hidden=true;explanations.hidden=true;footer.replaceChildren();}
function jumpTo(t){
 if(!t||!w.sheets[t.sheet])return;
 flush();active=t.sheet;selected=t.addr;renderGrid();
 const cell=Array.from(gridbox.querySelectorAll('td[data-addr]')).find(x=>x.dataset.addr===t.addr);
 if(cell)cell.scrollIntoView({block:'nearest',inline:'center'});
 bar.scrollIntoView({block:'start'});
}
const kindGuides={nmck:[
  'Найди цены в условии над таблицей и впиши их в жёлтые ячейки E–I. Количество указано в колонке D.',
  'В НМЦК вычисления начинаются со строки 6. Диапазон коммерческих предложений — E6:G6 (3 КП), E6:H6 (4 КП), E6:I6 (5 КП).',
  'В первой расчётной колонке введи =СРЗНАЧ(E6:G6), в следующей =СТАНДОТКЛОН.В(E6:G6). Для 4 или 5 КП расширь диапазон.',
  'Коэффициент вариации = отклонение / средняя цена × 100. Для учебного задания выбери цену предложения, ближайшую к средней, но строго ниже неё, и умножь на количество.',
  'Под таблицей находится общая НМЦК. Вводи формулы в жёлтые ячейки; «Вставить формулу» показывает пример для выбранного расчёта.',
  'Важно: пустые ячейки должны игнорироваться в СРЗНАЧ, СТАНДОТКЛОН.В и СЧЁТ. Коэффициент вариации — число в процентах (5,5 означает 5,5%).'
],budget:[
  'Статья находится в B, групповой код — в C, план — в D, факт — в E. Нули обозначают уровень группировки. Код не заменяет детальный КБК конкретной статьи; «уточнить» означает недостаточно данных.',
  'Перенеси факт из E в F для дохода или в G для расхода; другую ячейку оставь пустой. В H рассчитай долю.',
  'Суммируй доходы функцией =СУММ(F4:F19), а расходы — =СУММ(G4:G19); проверь последнюю строку диапазона.',
  'В I рассчитай процент исполнения =E4/D4*100; в J отклонение =E4-D4.',
  'Результат: фактические доходы минус фактические расходы. Положительное значение — профицит, отрицательное — дефицит.'
],financial:[
  'На вкладке «Баланс» три года и коды строк: 1100/1200/1600 — актив, 1300/1400/1500/1700 — пассив.',
  'На вкладке «ОФР» выручка 2110, чистая прибыль 2400. На вкладке «Анализ» жёлтые поля под 2025 и 2024 — твои ответы.',
  'Переключайся между листами и используй ссылки: =Баланс!C5/Баланс!C9. Реальные адреса найди по коду строки.',
  'Средняя величина за год = (показатель на конец года + показатель на конец прошлого года) / 2.',
  'Периоды оборота в днях = 365/коэффициент оборачиваемости. Для рентабельности проценты указывай числом, например 5,25 вместо 0,0525.'
]};
function showHelp(lines){sheetHelp.replaceChildren();for(const line of lines)sheetHelp.appendChild(node('p',line));sheetHelp.hidden=false;sheetHelp.scrollIntoView({block:'nearest'});}
function renderGrid(){const sh=w.sheets[active];tabs.replaceChildren();for(const name of w.order){const b=node('button',name,'excel-tab'+(name===active?' is-active':''));b.type='button';b.addEventListener('click',()=>{
 if(!pendingReference&&editDirty&&!input.disabled&&input.value.trim().startsWith('=')){
  const refState={sheet:active,addr:selected,value:input.value,start:input.selectionStart??input.value.length,end:input.selectionEnd??input.value.length,mobile:usingMobileCard};flush();pendingReference=refState;closeSuggestions();
 }else if(!pendingReference)flush();
 viewMemory[active]={selected,scrollLeft:gridbox.scrollLeft,scrollTop:gridbox.scrollTop};
 if(pendingReference&&name===pendingReference.sheet){restoreReference(null);return;}
 active=name;selected=viewMemory[name]?.selected||'';renderGrid();
 if(viewMemory[name]){gridbox.scrollLeft=viewMemory[name].scrollLeft||0;gridbox.scrollTop=viewMemory[name].scrollTop||0;}
 if(pendingReference)info.textContent='Выбери нужную ячейку на этом листе: её ссылка добавится к формуле. Для отмены вернись на исходный лист.';else saveDraft();
});tabs.appendChild(b);}
const table=node('table',undefined,'excel-grid'+(w.kind==='budget'?' budget-grid':''));const thead=node('thead'),hr=node('tr');hr.appendChild(node('th','', 'excel-corner'));
for(let c=0;c<sh.cols;c++)hr.appendChild(node('th',S.col(c),'excel-col'));thead.appendChild(hr);table.appendChild(thead);
const tbody=node('tbody');for(let r=0;r<sh.rows;r++){
 const tr=node('tr');tr.appendChild(node('th',r+1,'excel-row'));for(let c=0;c<sh.cols;c++){
   const a=S.addr(c,r),raw=sh.values[a],editable=!!sh.editable[a];
   const td=node('td',raw&&String(raw.raw).trim()!==''?fmt(S.value(w,active,a)):'',editable?'excel-editable':raw?'excel-locked':'excel-blank');
   td.dataset.addr=a;td.title=raw?.raw?.toString()||a;
   const colspan=sh.spans&&sh.spans[a];if(Number.isInteger(colspan)&&colspan>1){td.colSpan=colspan;c+=colspan-1;}
   if(r===0)td.classList.add('excel-header');
   if(selected===a)td.classList.add('excel-selected');
   td.addEventListener('click',()=>{
    if(pendingReference){restoreReference(active+'!'+a);}
    else if(editDirty && !input.disabled && selected!==a && input.value.trim().startsWith('=')){
      const pos=input.selectionStart??input.value.length,end=input.selectionEnd??pos;
      const v=window.ExamFormulaComplete.insert(input.value,pos,end,a);input.value=v.value;
      editDirty=true;closeSuggestions();mobileInput.value=v.value;const editor=usingMobileCard?mobileInput:input;editor.focus();editor.setSelectionRange(v.caret,v.caret);input.setSelectionRange(v.caret,v.caret);
      info.textContent='Добавлена ссылка '+a+'. Продолжи формулу и нажми ✓ для сохранения.';
    }else {select(a);if(editable)openInline(td);}
   });tr.appendChild(td);
 }tbody.appendChild(tr);}
 table.appendChild(tbody);gridbox.replaceChildren(table);
 const savedView=viewMemory[active]?.selected===selected?{...viewMemory[active]}:null;
 select(selected||firstEditable(sh),false);
 if(savedView){gridbox.scrollLeft=savedView.scrollLeft||0;gridbox.scrollTop=savedView.scrollTop||0;}
 else revealSelected();}
function restoreReference(ref){
 const saved=pendingReference;if(!saved)return;pendingReference=null;editDirty=false;active=saved.sheet;selected=saved.addr;renderGrid();
 const v=window.ExamFormulaComplete.insert(saved.value,saved.start,saved.end,ref||'');input.value=v.value;mobileInput.value=v.value;editDirty=true;closeSuggestions();usingMobileCard=!!saved.mobile;const editor=usingMobileCard?mobileInput:input;editor.focus();editor.setSelectionRange(v.caret,v.caret);input.setSelectionRange(v.caret,v.caret);
 info.textContent=ref?'Добавлена ссылка '+ref+'. Продолжи формулу и нажми ✓.':'Выбор ссылки отменён. Продолжи формулу.';
}
function firstEditable(sh){return Object.keys(sh.editable)[0]||'A1';}
function select(a,focus=false){if(editDirty)flush();closeInline();selected=a;const sh=w.sheets[active],raw=sh.values[a];address.textContent=active+'!'+a;input.value=raw?String(raw.raw):'';editDirty=false;
 input.disabled=!sh.editable[a]||!!session?.finished;commit.disabled=input.disabled;
 info.textContent=!sh.editable[a]?'Исходная ячейка '+a+' защищена. Используй её в формулах.':(hintsAllowed()?'Жёлтая ячейка: введи число или формулу. Подсказка доступна по кнопке.':'Жёлтая ячейка: введи число или формулу.');
 for(const el of gridbox.querySelectorAll('.excel-selected'))el.classList.remove('excel-selected');
 const chosen=Array.from(gridbox.querySelectorAll('td[data-addr]')).find(e=>e.dataset.addr===a);if(chosen){chosen.classList.add('excel-selected');revealSelected();}
 viewMemory[active]={selected:a,scrollLeft:gridbox.scrollLeft,scrollTop:gridbox.scrollTop};
 if(focus&&!input.disabled)input.focus();updateProgress();updateCellContext();}
function flush(){if(pendingReference)restoreReference(null);if(!w||!active||!selected||!editDirty)return;closeSuggestions();try{
 const previous=w.sheets[active].values[selected]?.raw??'';
 S.write(w,active,selected,input.value);
 if(String(previous)!==String(input.value)){history.push({sheet:active,addr:selected,raw:previous});if(history.length>30)history.shift();}
 undo.disabled=!history.length;
 editDirty=false;closeInline();invalidateCheck();refreshValues();saveDraft();updateProgress();info.textContent='Формула сохранена. Выбери следующую ячейку или проверь работу.';}catch(e){info.textContent=e.message;}}
function refreshValues(){if(!w)return;for(const cell of gridbox.querySelectorAll('td[data-addr]')){const v=w.sheets[active].values[cell.dataset.addr];if(cell!==inlineCell)cell.textContent=v&&String(v.raw).trim()!==''?fmt(S.value(w,active,cell.dataset.addr)):'';cell.classList.remove('excel-pass','excel-fail','excel-needs');}
 if(checked)for(const r of checked.results)if(r.sheet===active){const el=Array.from(gridbox.querySelectorAll('td[data-addr]')).find(x=>x.dataset.addr===r.addr);if(el)el.classList.add(r.status==='ok'?'excel-pass':r.status==='need-formula'?'excel-needs':'excel-fail');}}
function check(){
 if(session && !session.finished && examNow()>=session.deadline){finishTimedExam();return;}
 if(session?.finished||stageSubmitted())return;
 if(activeExam()){
  // Grade privately. Never display wrong cells, marks, or review feedback before
  // all three exercises are handed in or the common deadline expires.
  flush();
  session.results[session.index]=captureExamStage(S.grade(w));
  checked=null;$('results').hidden=true;
  lockSubmittedStage();submissionNotice.hidden=false;
  nextSession.hidden=false;nextSession.textContent=session.index===2?'Завершить экзамен':'Следующее задание →';
  saveDraft();
  return;
 }
 flush();checked=S.grade(w);refreshValues();
 $('results').hidden=false;$('hints').hidden=true;explainButton.hidden=!hintsAllowed();explanations.hidden=true;
 $('score').textContent='Проверка: '+checked.passed+' из '+checked.total+' ('+checked.percent+'%)'+(task.practiceMode==='exam'?(task.helpUsed?' · с подсказками':' · самостоятельно'):' · обучение');
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
 nextSession.hidden=!session||session.finished;nextSession.textContent=session&&session.index===2?'Завершить экзамен':'Следующее задание →';
 saveStats(checked.percent);$('results').scrollIntoView({block:'start',behavior:'smooth'});
}
function showAnswers(){if(!hintsAllowed())return;const box=$('hints');box.replaceChildren();for(const r of (checked?.results||[])){const el=node('p',r.sheet+'!'+r.addr+' — '+r.label+': '+fmt(r.answer)+(r.hint?' · '+r.hint:''),'excel-answer');box.appendChild(el);}box.hidden=false;}
// An autosave failure must never be silently presented as successful.
const draftSuccessMessage='Жёлтые ячейки — для формул. Черновик сохраняется автоматически.';
const draftFailureMessage='Не удалось сохранить черновик. Последние изменения пропадут при закрытии приложения. Экспортируй работу в XLSX или освободи место в хранилище и повтори сохранение.';
let draftStorageFailed=false;
function setDraftStorageState(failed){
 if(draftStorageFailed===failed)return;
 draftStorageFailed=failed;
 const note=$('task-notes');
 if(!note)return;
 note.textContent=failed?draftFailureMessage:draftSuccessMessage;
 if(failed)note.setAttribute('role','alert');else note.removeAttribute('role');
}
function saveDraft(){
 if(!w)return false;
 try{
 viewMemory[active]={selected,scrollLeft:gridbox.scrollLeft,scrollTop:gridbox.scrollTop};
 const entries=S.save(w);if(editDirty&&!pendingReference&&w.sheets[active]?.editable[selected])entries[active][selected]=input.value;
 localStorage.setItem('examSheetsDraft',JSON.stringify({task,entries,active,viewMemory,session}));
 setDraftStorageState(false);
 return true;
 }catch(e){setDraftStorageState(true);return false;}
}
function restoreDraft(){try{const v=JSON.parse(localStorage.getItem('examSheetsDraft')||'null');if(!v?.task?.kind||!Array.isArray(v.task.questions))return;task=v.task;session=v.session||null;window.ExamCurrentTask=task;w=S.create(task);S.load(w,v.entries);active=w.sheets[v.active]?v.active:w.order[0];Object.assign(viewMemory,v.viewMemory||{});selected=viewMemory[active]?.selected||'';showWork();}catch(e){}}
function saveStats(pct){try{const old=JSON.parse(localStorage.getItem('examStats')||'{"count":0,"best":0}');old.count++;old.best=Math.max(old.best,pct);localStorage.setItem('examStats',JSON.stringify(old));$('stats').textContent=`Проверено работ: ${old.count} · Лучший результат ${old.best}%`;}catch(e){}}
function showWork(){$('work').hidden=false;$('home').hidden=true;document.body.classList.add('exam-solving');updateExamControls();$('task-title').textContent=task.title+' · Таблицы';$('task-org').textContent=task.company;
 $('task-meta').textContent=task.questions.length+' исходных вопросов · '+w.targets.length+' ячеек для проверки · '+w.order.length+' лист(а)';
 $('task-notes').textContent=draftStorageFailed?draftFailureMessage:draftSuccessMessage;
 $('verification-title').textContent=session?'02 · Сдача задания':'02 · Проверь свою работу';
 $('check').textContent=session?'Сдать задание ✓':'Проверить таблицу ✓';
 $('results').hidden=true;checked=null;nextSession.hidden=true;submissionNotice.hidden=true;
 $('exam-stage-results')?.remove();footer.replaceChildren();
 // A completed exercise can be followed by training; do not inherit old disabled controls.
 gridbox.inert=false;input.disabled=false;commit.disabled=false;undo.disabled=!history.length;
 mobileInput.disabled=false;mobileApply.disabled=false;$('check').disabled=false;$('check').hidden=false;
 $('review-text').readOnly=false;$('review-check').disabled=false;
 applyMode();renderGrid();updateProgress();updateSession();
 if(session?.finished){lockFinishedExam();showSessionResult();}
 else if(stageSubmitted()){
  lockSubmittedStage();submissionNotice.hidden=false;nextSession.hidden=false;
  nextSession.textContent=session.index===2?'Завершить экзамен':'Следующее задание →';
 }
 window.scrollTo(0,0);}
const EXAM_DURATION_MS=3*60*60*1000; // One shared, absolute deadline for all three exercises.
// The wall clock may be moved backwards. Keep a monotonic in-process floor,
// and persist a recent time watermark for recovery after application restart.
// This is tamper detection, not trusted-time attestation for an offline exam.
let clockOwner=null,clockMono=0,clockFloor=0,lastClockPersistMono=0;
function examNow(){
 const wall=Date.now();
 if(!session)return wall;
 const mono=typeof performance!=='undefined'&&performance.now?performance.now():0;
 if(clockOwner!==session){
  clockOwner=session;clockMono=mono;
  clockFloor=Math.max(wall,Number.isFinite(session.lastSeenAt)?session.lastSeenAt:wall);
  if(wall+5000<clockFloor)session.clockWarning=true;
 }else{
  const expected=clockFloor+Math.max(0,mono-clockMono);
  if(wall+5000<expected)session.clockWarning=true;
  clockFloor=Math.max(wall,expected);clockMono=mono;
 }
 session.lastSeenAt=clockFloor;
 return clockFloor;
}
function start(){
 if(w)flush();
 // A timed exam is valuable even before the first answer is entered.
 if(session&&!session.finished&&!confirm('Начать новый вариант? Текущий экзамен и его общий таймер будут заменены.'))return;
 if(w&&!session&&Object.values(S.save(w)).some(x=>Object.keys(x).length)&&!confirm('Создать новый вариант? Черновик предыдущего будет заменён.'))return;
 try{const choice=$('mode').value;session=(choice==='exam'||choice==='full_exam')?{tasks:['nmck','budget','financial'].map(k=>{const t=E.generate(k,$('level').value);t.practiceMode='exam';t.helpUsed=false;return t;}),index:0,results:[],deadline:Date.now()+EXAM_DURATION_MS,finished:false}:null;task=session?session.tasks[0]:E.generate($('kind').value,$('level').value);task.practiceMode=choice==='learning'?'learning':'exam';task.helpUsed=false;window.ExamCurrentTask=task;w=S.create(task);history.length=0;for(const key of Object.keys(viewMemory))delete viewMemory[key];undo.disabled=true;active=w.order[w.order.length-1];selected='';showWork();saveDraft();}catch(e){alert('Ошибка создания таблицы: '+e.message);}}
function lockSubmittedStage(){
 gridbox.inert=true;input.disabled=true;commit.disabled=true;undo.disabled=true;
 mobileInput.disabled=true;mobileApply.disabled=true;
 $('check').disabled=true;$('check').hidden=true;
 $('review-text').readOnly=true;$('review-check').disabled=true;
}
function lockFinishedExam(){
 lockSubmittedStage();submissionNotice.hidden=true;nextSession.hidden=true;
}
function captureExamStage(result){
 return {passed:result.passed,total:result.total,help:!!task.helpUsed,
  snapshot:{task,entries:S.save(w),active,viewMemory:JSON.parse(JSON.stringify(viewMemory)),
    // On initial reload, the review.js module is loaded after sheet-ui.js. Use the
    // persisted text if an expired draft is finalized before that module hydrates.
    reviewText:(!window.ExamWrittenReview
      ? (()=>{try{return localStorage.getItem('exam-review-'+task.id)??$('review-text').value;}catch(_){return $('review-text').value;}})()
      : $('review-text').value)}};
}
function finishTimedExam(){
 if(!session||session.finished||examNow()<session.deadline)return false;
 // Capture the last unfinished editor value, then grade current and unopened exercises.
 if(!session.results[session.index]){
  flush();session.results[session.index]=captureExamStage(S.grade(w));
 }
 for(let i=session.index+1;i<session.tasks.length;i++){
  const grade=S.grade(S.create(session.tasks[i]));
  session.results[i]={passed:grade.passed,total:grade.total,help:false,notStarted:true};
 }
 session.finished=true;session.timedOut=true;
 lockFinishedExam();
 sessionStatus.textContent='Экзамен · 00:00:00 · время вышло, работа завершена';
 showSessionResult();
 saveDraft();
 return true;
}
function updateSession(){
 sessionStatus.hidden=!session;
 if(!session)return;
 const now=examNow();
 if(!session.finished&&now>=session.deadline){finishTimedExam();return;}
 // A small periodic snapshot limits how much timing history can be lost
 // if the app is killed while idle, without writing localStorage every second.
 if(!session.finished){
  const mono=typeof performance!=='undefined'&&performance.now?performance.now():0;
  if(mono-lastClockPersistMono>=30000){lastClockPersistMono=mono;saveDraft();}
 }
 const seconds=Math.max(0,Math.ceil((session.deadline-now)/1000));
 const clock=[Math.floor(seconds/3600),Math.floor((seconds%3600)/60),seconds%60]
  .map(v=>String(v).padStart(2,'0')).join(':');
 sessionStatus.textContent=session.finished
  ?(session.timedOut?'Экзамен · 00:00:00 · время вышло, работа завершена':'Экзамен завершён')
  :'Экзамен · задание '+(session.index+1)+' из 3 · осталось '+clock;
 if(session.clockWarning)sessionStatus.textContent+=' · ⚠ Изменение времени устройства обнаружено';
}
setInterval(updateSession,1000);
window.addEventListener('focus',updateSession);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')updateSession();});
function showSessionResult(){const results=session.results||[],passed=results.reduce((a,r)=>a+r.passed,0),total=results.reduce((a,r)=>a+r.total,0);$('results').hidden=false;$('score').textContent='Экзамен: '+passed+' из '+total+' ('+(total?Math.round(passed/total*100):0)+'%)';$('message').textContent=(session.timedOut?'Три часа истекли. Экзамен автоматически завершён. ':'')+results.map((r,i)=>['НМЦК','Бюджет','Финансовый анализ'][i]+': '+r.passed+'/'+r.total+(r.notStarted?' (не начато)':r.help?' (с подсказками)':'')).join(' · ')+'. Оценены ячейки таблиц; письменные выводы проверяются отдельно.';nextSession.hidden=true;$('hints-button').hidden=true;let stageBox=$('exam-stage-results');if(!stageBox){stageBox=node('div',undefined,'exam-stage-results');stageBox.id='exam-stage-results';$('results').appendChild(stageBox);}stageBox.replaceChildren();results.forEach((r,i)=>{if(!r.snapshot)return;const b=node('button','Посмотреть: '+['НМЦК','Бюджет','Финансовый анализ'][i],'secondary');b.type='button';b.addEventListener('click',()=>{const v=r.snapshot;task=v.task;window.ExamCurrentTask=task;w=S.create(task);S.load(w,v.entries);active=w.sheets[v.active]?v.active:w.order[0];for(const key of Object.keys(viewMemory))delete viewMemory[key];Object.assign(viewMemory,v.viewMemory||{});selected=viewMemory[active]?.selected||'';editDirty=false;window.ExamWrittenReview.restoreTextFromSnapshot(task.id,v.reviewText||'');showWork();saveDraft();window.dispatchEvent(new Event('exam-restored'));});stageBox.appendChild(b);});}
nextSession.addEventListener('click',()=>{
 if(session&&!session.finished&&examNow()>=session.deadline){finishTimedExam();return;}
 if(!activeExam()||!stageSubmitted())return;
 if(session.index===2){session.finished=true;session.timedOut=false;
  lockFinishedExam();updateSession();showSessionResult();saveDraft();return;}
 session.index++;task=session.tasks[session.index];window.ExamCurrentTask=task;w=S.create(task);
 history.length=0;for(const key of Object.keys(viewMemory))delete viewMemory[key];
 active=w.order[w.order.length-1];selected='';showWork();saveDraft();window.dispatchEvent(new Event('exam-restored'));
});
function renderSaved(){const host=$('saved-list');host.replaceChildren();let items=[];try{items=JSON.parse(localStorage.getItem('examSavedWorks')||'[]');}catch(e){}if(!Array.isArray(items)||!items.length){host.appendChild(node('p','Пока нет сохранённых работ.'));return;}items.forEach((item,i)=>{const row=node('div',undefined,'saved-row'),open=node('button',item.title,'saved-open'),del=node('button','Удалить','saved-delete');open.type=del.type='button';open.addEventListener('click',()=>{if(w&&!confirm('Открыть сохранённую работу? Текущий черновик будет заменён.'))return;try{const v=item.snapshot;
 // A saved checkpoint must never roll an active exam back to an earlier stage.
 if(v.session&&session&&v.session.deadline===session.deadline&&
    (session.finished||session.index>v.session.index||
     (session.results?.length||0)>(v.session.results?.length||0))){
   alert('Нельзя отменить уже сданные задания через старую сохранённую копию. Для продолжения выбери «Продолжить экзамен».');return;
 }
 task=v.task;session=v.session||null;window.ExamCurrentTask=task;w=S.create(task);S.load(w,v.entries);active=w.sheets[v.active]?v.active:w.order[0];for(const key of Object.keys(viewMemory))delete viewMemory[key];Object.assign(viewMemory,v.viewMemory||{});selected=viewMemory[active]?.selected||'';editDirty=false;history.length=0;window.ExamWrittenReview.restoreTextFromSnapshot(task.id,v.reviewText||'');showWork();saveDraft();window.dispatchEvent(new Event('exam-restored'));}catch(e){alert('Не удалось открыть работу. Текущие сохранения не удалены.');}});del.addEventListener('click',()=>{if(!confirm('Удалить эту сохранённую копию?'))return;try{const a=JSON.parse(localStorage.getItem('examSavedWorks')||'[]');a.splice(i,1);localStorage.setItem('examSavedWorks',JSON.stringify(a));renderSaved();}catch(e){alert('Не удалось удалить копию.');}});row.append(open,del);host.appendChild(row);});}
saveWorkButton.addEventListener('click',()=>{if(!w)return;flush();try{const all=JSON.parse(localStorage.getItem('examSavedWorks')||'[]');if(all.length>=30){alert('Можно сохранить до 30 работ. Удали ненужную копию на главном экране.');return;}const snapshot={task,entries:S.save(w),active,viewMemory,session,reviewText:$('review-text').value};all.unshift({title:task.title+' · '+new Date().toLocaleString('ru-RU'),snapshot});localStorage.setItem('examSavedWorks',JSON.stringify(all));renderSaved();saveWorkButton.textContent='Работа сохранена ✓';setTimeout(()=>{saveWorkButton.textContent='Сохранить эту работу';},2000);}catch(e){alert('Не удалось сохранить работу: возможно, на устройстве не хватает места.');}});
renderSaved();
function syncMobileCaret(){if(input.disabled)return;usingMobileCard=true;input.setSelectionRange(mobileInput.selectionStart,mobileInput.selectionEnd);}
for(const ev of ['click','keyup','select'])mobileInput.addEventListener(ev,syncMobileCaret);
mobileInput.addEventListener('input',()=>{if(input.disabled)return;usingMobileCard=true;input.value=mobileInput.value;input.setSelectionRange(mobileInput.selectionStart,mobileInput.selectionEnd);input.dispatchEvent(new Event('input',{bubbles:true}));});
mobileApply.addEventListener('click',()=>{flush();mobileInput.value=input.value;});
input.addEventListener('input',()=>{if(document.activeElement!==mobileInput)mobileInput.value=input.value;});
gridbox.addEventListener('keydown',e=>{
 if(e.target===input)return;
 if(!w||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key))return;
 const sh=w.sheets[active],p=S.decode(selected);if(!p)return;
 if(e.key==='Enter'){if(sh.editable[selected]){e.preventDefault();input.focus();}return;}
 let c=p.c+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0),r=p.r+(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0);
 if(c<0||r<0||c>=sh.cols||r>=sh.rows)return;
 const cell=gridbox.querySelector('td[data-addr="'+S.addr(c,r)+'"]');if(cell){e.preventDefault();cell.click();}
});
input.addEventListener('click',e=>{usingMobileCard=false;e.stopPropagation();});
let draftTimer;input.addEventListener('input',()=>{editDirty=true;showSuggestions();clearTimeout(draftTimer);draftTimer=setTimeout(saveDraft,400);});
window.addEventListener('pagehide',()=>{if(editDirty)saveDraft();});document.addEventListener('visibilitychange',()=>{if(editDirty&&document.visibilityState==='hidden')saveDraft();});input.addEventListener('click',showSuggestions);input.addEventListener('keydown',e=>{
 if(suggestions&&e.key==='ArrowDown'){e.preventDefault();moveSuggestion(1);return;}
 if(suggestions&&e.key==='ArrowUp'){e.preventDefault();moveSuggestion(-1);return;}
 if(suggestions&&(e.key==='Enter'||e.key==='Tab')){e.preventDefault();acceptSuggestion(suggestionIndex);return;}
 if(suggestions&&e.key==='Escape'){e.preventDefault();closeSuggestions();return;}
 if(e.key==='Tab'){
  const cells=Array.from(gridbox.querySelectorAll('td.excel-editable[data-addr]')),index=cells.findIndex(c=>c.dataset.addr===selected),next=index+(e.shiftKey?-1:1);
  if(index>=0&&next>=0&&next<cells.length){e.preventDefault();flush();cells[next].click();input.focus();}return;
 }
 if(e.key==='Enter'){e.preventDefault();flush();input.blur();}else if(e.key==='Escape'){e.preventDefault();editDirty=false;closeSuggestions();select(selected);saveDraft();}});
commit.addEventListener('click',flush);
undo.addEventListener('click',()=>{
 if(pendingReference)restoreReference(null);
 if(!w||!history.length)return;
 const item=history.pop();if(!w.sheets[item.sheet]?.editable[item.addr])return;
 S.write(w,item.sheet,item.addr,item.raw);undo.disabled=!history.length;invalidateCheck();
 editDirty=false;input.value=String(item.raw??'');active=item.sheet;selected=item.addr;renderGrid();refreshValues();saveDraft();updateProgress();
 info.textContent='Последнее изменение отменено. Можно ввести другую формулу.';
});
$('start').addEventListener('click',start);$('again').addEventListener('click',start);$('check').addEventListener('click',check);
$('hints-button').addEventListener('click',showAnswers);
$('back').addEventListener('click',()=>{flush();saveDraft();updateExamControls();$('work').hidden=true;$('home').hidden=false;document.body.classList.remove('exam-solving');renderSaved();window.scrollTo(0,0);});
helpButton.addEventListener('click',()=>{if(!hintsAllowed())return;flush();if(sheetHelp.hidden)showHelp(kindGuides[task.kind]);else sheetHelp.hidden=true;});
formulaExample.addEventListener('click',()=>{if(!hintsAllowed())return;showHelp(['Доступные функции: СУММ, СРЗНАЧ, СТАНДОТКЛОН.В, ОКРУГЛ, КОРЕНЬ, ЕСЛИ, СУММЕСЛИ, СЧЁТ, МИН, МАКС, АБС.',
'Поддерживаются ссылки на одну ячейку, диапазон A1:C8 и другие листы: =Баланс!C5+Баланс!D5. В формулах используй ; между аргументами.',
'Сначала заполни промежуточные ячейки, после этого итоговые. Для редактирования нажми жёлтую ячейку и введи формулу в поле fx.',
'Правильные значения можно увидеть только после нажатия «Проверить».']);});
exportButton.addEventListener('click',()=>{flush();try{const b64=window.ExamXlsx.exportBase64(w);const filename='exam-training-'+task.kind+'-'+Date.now()+'.xlsx';
 if(window.ExamNative&&typeof window.ExamNative.saveXlsx==='function')window.ExamNative.saveXlsx(filename,b64);
 else{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=node('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 }catch(e){alert('Не удалось сохранить XLSX: '+e.message);}});
restoreDraft();try{const st=JSON.parse(localStorage.getItem('examStats')||'{}');$('stats').textContent='Проверено работ: '+(st.count||0)+' · Лучший результат '+(st.best||0)+'%';}catch(e){}
})();
