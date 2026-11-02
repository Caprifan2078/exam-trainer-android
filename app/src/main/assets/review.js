/* Offline study aid: transparent, limited keyword feedback, not an AI grader. */
(function(root){'use strict';
function facts(t){
 if(t.kind==='budget'){
  const inc=t.summary['Доход'].actual, exp=t.summary['Расход'].actual, delta=inc-exp;
  const status=delta>0?'профицит':delta<0?'дефицит':'сбалансирован';
  return {status,example:'Фактические доходы составили '+inc+' тыс. руб., расходы — '+exp+' тыс. руб. '+(delta===0?'Бюджет сбалансирован.':`Доходы ${delta>0?'превысили расходы':'оказались ниже расходов'} на ${Math.abs(delta)} тыс. руб.; сложился ${status}.`)};
 }
 if(t.kind==='nmck'){
  const total=t.questions.find(q=>q.id==='total').answer;
  const problematic=t.rows.map((r,i)=>{const mean=r.prices.reduce((a,b)=>a+b,0)/r.prices.length;return {i,cv:100*Math.sqrt(r.prices.reduce((a,b)=>a+(b-mean)**2,0)/(r.prices.length-1))/mean};}).filter(x=>x.cv>33);
  return {problematic,example:'НМЦК одного контракта по учебному методу составляет '+total+' руб. '+(problematic.length?'По позициям '+problematic.map(x=>x.i+1).join(', ')+' коэффициент вариации превышает 33%; необходим дополнительный анализ цен.':'Коэффициент вариации по каждой позиции не превышает 33%; цены в учебном примере однородны.')};
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
  else if(!used.includes(f.status))notices.push('Проверь тип результата: сравни фактические доходы и расходы.');
  else notices.push('Нужное название результата встречается в тексте. Проверь, не отрицаешь ли ты его в предложении.');
  if(!/доход/.test(text)||!/расход/.test(text))notices.push('Упомяни доходы и расходы и сравни их.');
 } else {
  if(!/нмцк|цен[аыуе].*контракт/.test(text))notices.push('Укажи НМЦК контракта.');
  if(!/вариац|однород/.test(text))notices.push('Добавь вывод об однородности цен и коэффициенте вариации.');
  if(f.problematic.length)notices.push('Проверь позиции, где коэффициент вариации превышает 33%.');
 }
 notices.push('Числа, отрицания и смысл текста автоматически не проверяются. Сверь их с таблицей и примером.');
 return notices.join(' ');
}
const api={facts,review};root.ExamWrittenReview=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof document==='undefined')return;
const el=id=>document.getElementById(id),section=el('written-review'),input=el('review-text'),out=el('review-result');
function task(){try{return JSON.parse(localStorage.getItem('examSheetsDraft')||'null')?.task||null;}catch(_){return null;}}
let id='';function refresh(){const t=task();section.hidden=!t||!['budget','nmck'].includes(t.kind)||el('work').hidden;if(section.hidden)return;if(id!==t.id){id=t.id;try{input.value=localStorage.getItem('exam-review-'+id)||'';}catch(_){}out.textContent='';}}
input.addEventListener('input',()=>{try{localStorage.setItem('exam-review-'+id,input.value);}catch(_){}});
el('review-check').addEventListener('click',()=>{const t=task();if(t)out.textContent=review(t,input.value);});
el('review-example').addEventListener('click',()=>{const t=task();if(t)out.textContent='Пример: '+facts(t).example;});
['start','again','back'].forEach(x=>el(x).addEventListener('click',()=>setTimeout(refresh,0)));refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
