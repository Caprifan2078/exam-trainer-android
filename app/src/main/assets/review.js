/* Offline study aid: transparent, limited keyword feedback, not an AI grader. */
(function(root){'use strict';
function facts(t){
 if(t.kind==='budget'){
  const inc=t.summary['Доход'].actual, exp=t.summary['Расход'].actual, delta=inc-exp;
  const status=delta>0?'профицит':delta<0?'дефицит':'сбалансирован';
  const ranking=(t.rows||[]).length?['Доход','Расход'].map(kind=>{const rows=t.rows.filter(r=>r.kind===kind).sort((a,b)=>b.actual-a.actual),sum=t.summary[kind].actual;if(!rows.length)return '';const line=r=>r.name+' — '+r.actual+' тыс. руб. ('+(sum?(r.actual/sum*100).toFixed(2).replace('.',',')+'%':'доля не определена')+')';const high=rows.slice(0,3),low=rows.slice(Math.max(3,rows.length-3));return (kind==='Доход'?'Доходная':'Расходная')+' часть. Наибольшие статьи: '+high.map(line).join('; ')+(low.length?'. Наименьшие из остальных: '+low.map(line).join('; '):'')+'.';}).join('\n'):'';
  return {status,example:'Фактические доходы составили '+inc+' тыс. руб., расходы — '+exp+' тыс. руб. '+(delta===0?'Бюджет сбалансирован.':`Доходы ${delta>0?'превысили расходы':'оказались ниже расходов'} на ${Math.abs(delta)} тыс. руб.; сложился ${status}.`)+(ranking?'\n'+ranking+'\nРекомендация: изучить основные статьи доходов и расходов и возможности их изменения. По одной структуре бюджета нельзя установить причины результата.':'')};
 }
 if(t.kind==='nmck'){
  const total=t.questions.find(q=>q.id==='total').answer;
  const problematic=t.rows.map((r,i)=>{const mean=r.prices.reduce((a,b)=>a+b,0)/r.prices.length;return {i,cv:100*Math.sqrt(r.prices.reduce((a,b)=>a+(b-mean)**2,0)/(r.prices.length-1))/mean};}).filter(x=>x.cv>33);
  const row=t.rows[0],avg=row.prices.reduce((a,b)=>a+b,0)/row.prices.length,sd=Math.sqrt(row.prices.reduce((a,b)=>a+(b-avg)**2,0)/(row.prices.length-1)),cv=sd/avg*100,selected=row.prices.filter(x=>x<avg).sort((a,b)=>b-a)[0],indexes=selected===undefined?[]:row.prices.map((x,i)=>x===selected?i+1:0).filter(Boolean);
  if(t.offerRule)return {problematic,avg,cv,selected,indexes,example:'Обоснование НМЦК: статья 22 Федерального закона № 44-ФЗ. '+(problematic.length?'Предварительный учебный расчёт: ':'')+'Коэффициент вариации равен '+cv.toFixed(2).replace('.',',')+'%; '+(cv<=33?'он не превышает 33%, предложения однородны.':'он превышает 33%; предложения неоднородны, требуется дополнительный анализ цен.')+' Средняя цена контракта за единицу — '+avg.toFixed(2).replace('.',',')+' руб.; расчёт по средней цене с учётом количества — '+total+' руб. '+(selected===undefined?'Цены ниже средней нет: выбрать предложение по учебному правилу невозможно.':'По правилу задания выбрано предложение № '+indexes.join(' или № ')+' по цене '+selected+' руб. за единицу: оно ближе всех к средней цене и строго меньше её. Сумма выбранного предложения — '+(selected*row.quantity)+' руб.')};
  return {problematic,avg,cv,selected,indexes,example:'Обоснование НМЦК: статья 22 Федерального закона № 44-ФЗ. '+(problematic.length?'Предварительный учебный расчёт НМЦК: ':'НМЦК одного контракта по учебному методу составляет ')+total+' руб. '+(problematic.length?'По позициям '+problematic.map(x=>x.i+1).join(', ')+' коэффициент вариации превышает 33%; необходим дополнительный анализ цен.':'Коэффициент вариации по каждой позиции не превышает 33%; цены в учебном примере однородны.')};
 }
 if(t.kind==='financial' && t.pl?.['2025'] && t.pl?.['2024']){
  const newer=t.pl['2025'],older=t.pl['2024'],revChange=newer['2110']-older['2110'],profitChange=newer['2400']-older['2400'];
  const direction=x=>x>0?'увеличился':x<0?'уменьшился':'не изменился';
  const current=(t.questions||[]).find(q=>q.id==='f02025')?.answer,previous=(t.questions||[]).find(q=>q.id==='f02024')?.answer;
  let liquidity='';if(Number.isFinite(current)&&Number.isFinite(previous))liquidity=' Текущая ликвидность: '+current+' в 2025 году и '+previous+' в 2024 году; по округлённым значениям показатель '+direction(current-previous)+'.';
  const metric=(i)=>{const a=(t.questions||[]).find(q=>q.id==='f'+i+'2025')?.answer,b=(t.questions||[]).find(q=>q.id==='f'+i+'2024')?.answer;return Number.isFinite(a)&&Number.isFinite(b)?{a,b}:null;};
  const describe=(i,name,unit='')=>{const m=metric(i);return m?name+': '+m.b+' в 2024 году и '+m.a+' в 2025 году ('+(m.a>m.b?'рост':m.a<m.b?'снижение':'без изменений')+')'+unit+'. ':'';};
  const detailed=(t.questions||[]).length>=40?'\n\nЛиквидность и платёжеспособность. '+describe(0,'Текущая ликвидность')+describe(2,'Быстрая ликвидность')+describe(1,'Абсолютная ликвидность')+describe(3,'Обеспеченность собственными оборотными средствами')+'Риск: оценка способности платить зависит также от сроков поступления дебиторской задолженности. Рекомендация: следить за денежными средствами и сроками расчётов.\n\nДеловая активность. '+describe(4,'Оборачиваемость активов',' оборота')+describe(8,'Оборачиваемость запасов',' оборота')+describe(9,'Фондоотдача')+describe(12,'Период погашения дебиторской задолженности',' дней')+'Риск: длительный период расчётов с покупателями может задерживать поступление денег. Рекомендация: контролировать сроки оплаты и уровень запасов.\n\nФинансовая устойчивость. '+describe(16,'Коэффициент автономии')+describe(17,'Финансовая зависимость')+describe(18,'Соотношение заёмных и собственных средств')+describe(19,'Манёвренность капитала')+'Риск: оценку долговой нагрузки и доступности собственных средств нужно проводить вместе. Рекомендация: контролировать обязательства и оборотный капитал.\n\nРентабельность. '+describe(21,'Рентабельность активов','%')+describe(22,'Рентабельность продаж','%')+describe(23,'Рентабельность собственного капитала','%')+'Риск: снижение показателей может указывать на ухудшение отдачи. Рекомендация: анализировать доходы, расходы и использование активов.\n\nОбщий вывод: сопоставь динамику ликвидности, устойчивости, оборачиваемости и прибыльности; причины изменений требуют дополнительной проверки. Нормативы зависят от методики и отрасли.':'';
  return {example:'Выручка в 2025 году составила '+newer['2110']+' тыс. руб., в 2024 году — '+older['2110']+' тыс. руб.; показатель '+direction(revChange)+'. Чистый финансовый результат в 2025 году — '+newer['2400']+' тыс. руб., в 2024 году — '+older['2400']+' тыс. руб.; показатель '+direction(profitChange)+'.'+liquidity+' Выводы по коэффициентам зависят от выбранной методики.'+detailed};
 }
 return null;
}
function review(t,raw){
 const text=String(raw||'').toLowerCase().replace(/ё/g,'е').trim(),f=facts(t);
 if(!f)return 'Для этого раздела автоматическая проверка вывода пока не реализована.';
 if(!text)return 'Сначала напиши вывод.';
 const notices=[];
 if(t.kind==='budget'){
  const terms=['профицит','дефицит','сбалансирован'];
  const used=terms.filter(x=>text.includes(x));
  if(!used.length)notices.push('Укажи, бюджет профицитный, дефицитный или сбалансированный.');
  else if(used.length>1)notices.push('Упомянуто несколько результатов. Проверь, нет ли противоречия; автоматическая проверка контекста ограничена.');
  else if(!used.includes(f.status))notices.push('Проверь тип результата: сравни фактические доходы и расходы.');
  else if(new RegExp('(?:не|нет|без)\\s+'+f.status).test(text))notices.push('Обнаружено возможное отрицание результата — проверь формулировку.');
  else notices.push('Название результата встречается в тексте; смысл и отрицания проверь самостоятельно.');
  if(!/доход/.test(text)||!/расход/.test(text))notices.push('Упомяни доходы и расходы и сравни их.');
  for(const [label,expected] of [['доход',t.summary['Доход'].actual],['расход',t.summary['Расход'].actual]]){
   // Only flag the simple unambiguous form “доходы 1200 тыс.”. Other number formats remain unverified.
   const m=new RegExp(label+'[а-я]*\\s*(?:составил[аио]?\\s*)?[:—–-]?\\s*(\\d[\\d\\s\\u00a0]*(?:[.,]\\d+)?)\\s*тыс\\.','i').exec(text);
   if(m && Math.abs(Number(m[1].replace(/[\s\u00a0]/g,'').replace(',','.'))-expected)>.01)notices.push('Проверь сумму: если указаны фактические '+label+'ы, она не совпадает с итогом задания.');
  }
 } else if(t.kind==='nmck'){
  if(!/нмцк|цен[аыуе].*контракт/.test(text))notices.push('Укажи НМЦК контракта.');
  if(!/вариац|однород/.test(text))notices.push('Добавь вывод об однородности цен и коэффициенте вариации.');
  if(f.indexes?.length){const m=/предложени[еяюи]*\s*№\s*(\d+)/i.exec(text);if(m&&!f.indexes.includes(Number(m[1])))notices.push('Проверь номер выбранного предложения: оно должно быть ближайшим строго ниже средней цены.');else if(m)notices.push('Номер выбранного предложения распознан и совпадает с расчётом.');}
  const nm=/итоговая\s+нмцк\s*(?:составила|равна|:)?\s*([\d\s\u00a0]+(?:[.,]\d+)?)\s*руб/i.exec(text);
  if(nm&&f.selected!==undefined){const n=Number(nm[1].replace(/[\s\u00a0]/g,'').replace(',','.'));if(Number.isFinite(n)&&Math.abs(n-f.selected*t.rows[0].quantity)>.01)notices.push('Проверь итоговую НМЦК: указанная сумма не совпадает с выбранным предложением и количеством.');}
  if(f.problematic.length)notices.push('Проверь позиции, где коэффициент вариации превышает 33%; цены могут быть неоднородны.');
  if(!f.problematic.length&&/неоднород/.test(text))notices.push('Проверь утверждение о неоднородности: в учебном расчёте коэффициенты не превышают 33%.');
 } else {
  if(!/выручк/.test(text))notices.push('Упомяни выручку и сравни её по годам.');
  if(!/прибыл|убыт|финансов.*результат/.test(text))notices.push('Упомяни чистую прибыль или убыток.');
  for(const [re,oldValue,newValue,label] of [[/выручка\s+(выросла|увеличилась|снизилась|уменьшилась)/,t.pl?.['2024']?.['2110'],t.pl?.['2025']?.['2110'],'выручки'],[/чистая\s+прибыль\s+(выросла|увеличилась|снизилась|уменьшилась)/,t.pl?.['2024']?.['2400'],t.pl?.['2025']?.['2400'],'чистой прибыли']]){
   const m=re.exec(text);if(m&&Number.isFinite(oldValue)&&Number.isFinite(newValue)){const up=/выросла|увеличилась/.test(m[1]);if((up&&newValue<=oldValue)||(!up&&newValue>=oldValue))notices.push('Проверь направление изменения '+label+': оно не совпадает с данными за два года.');}
  }
  notices.push('Проверены только отдельные явно сформулированные направления; другие суммы и смысл требуют самостоятельной проверки.');
 }
 notices.push('Числа и смысл текста не проверяются полностью; отрицания и контекст могут быть распознаны неверно. Сверь вывод с таблицей и примером.');
 return notices.join(' ');
}
const api={facts,review};root.ExamWrittenReview=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof document==='undefined')return;
const el=id=>document.getElementById(id),section=el('written-review'),input=el('review-text'),out=el('review-result');
// The active exercise is the source of truth. Storage can be full or temporarily unavailable.
function task(){
 const current=root.ExamCurrentTask;
 if(current&&['budget','nmck','financial'].includes(current.kind)&&Array.isArray(current.questions))return current;
 try{return JSON.parse(localStorage.getItem('examSheetsDraft')||'null')?.task||null;}catch(_){return null;}
}
// Keep an unsaved conclusion in memory until the storage backend accepts it.
const unsaved=new Map();
const saveStatus=document.createElement('p');
saveStatus.id='review-save-status';
saveStatus.className='note';
saveStatus.setAttribute('role','alert');
saveStatus.hidden=true;
section.insertBefore(saveStatus,el('review-check'));
const saveFailure='Не удалось сохранить письменный вывод. Текст останется только до закрытия приложения. Освободи место и измени текст для повторного сохранения.';
function showSaveError(message){saveStatus.textContent=message||'';saveStatus.hidden=!message;}
let id='';
function persistForTask(key,value){
 try{
  localStorage.setItem('exam-review-'+key,value);
  unsaved.delete(key);
  return true;
 }catch(_){
  unsaved.set(key,value);
  return false;
 }
}
function persistReview(){
 if(!id)return;
 showSaveError(persistForTask(id,input.value)?'':saveFailure);
}
// Restore the conclusion from an existing saved-work or exam-stage snapshot
// without requiring the auxiliary browser-storage key to be writable.
api.restoreTextFromSnapshot=function(taskId,text){
 const key=String(taskId??'');
 if(!key)return false;
 const value=String(text??'');
 if(String(id)===key)input.value=value;
 const saved=persistForTask(key,value);
 if(String(id)===key)showSaveError(saved?'':saveFailure);
 return saved;
};
function refresh(){
 const t=task();
 section.hidden=!t||!['budget','nmck','financial'].includes(t.kind)||el('work').hidden;
 if(section.hidden||id===t.id)return;
 id=t.id;
 if(unsaved.has(id)){
  input.value=unsaved.get(id);
  persistReview(); // Retry after returning to a previous exercise.
 }else{
  try{
   input.value=localStorage.getItem('exam-review-'+id)||'';
   showSaveError('');
  }catch(_){
   input.value='';
   showSaveError('Не удалось прочитать сохранённый письменный вывод. Данные в хранилище не удалены.');
  }
 }
 out.textContent='';
}
input.addEventListener('input',persistReview);
el('review-check').addEventListener('click',()=>{
 if(root.ExamMode?.allowReviewFeedback&&!root.ExamMode.allowReviewFeedback())return;
 const t=task();if(t)out.textContent=review(t,input.value);
});
el('review-example').addEventListener('click',()=>{const t=task();if(t)out.textContent='Пример: '+facts(t).example;});
['start','again','back'].forEach(x=>el(x).addEventListener('click',()=>setTimeout(refresh,0)));window.addEventListener('exam-restored',refresh);refresh();
})(typeof globalThis!=='undefined'?globalThis:this);

