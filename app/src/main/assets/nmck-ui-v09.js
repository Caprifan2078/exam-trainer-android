/* v0.9: compact formula helper and 3/4/5 offer selector for mobile spreadsheet. */
(function(){'use strict';
const $=id=>document.getElementById(id),kind=$('kind'),panel=kind&&kind.closest('.panel');if(!panel)return;
const opts=document.createElement('div');opts.id='nmck-options';opts.className='nmck-options';
opts.innerHTML='<label for="offers-count">Коммерческих предложений</label><select id="offers-count"><option value="random">Случайно: 3–5</option><option value="3">3 предложения</option><option value="4">4 предложения</option><option value="5">5 предложений</option></select><label for="lot-count">Позиций закупки / лотов</label><select id="lot-count"><option value="random">По сложности: 1–3</option><option value="1">1 позиция</option><option value="2">2 позиции</option><option value="3">3 позиции</option></select>';
panel.insertBefore(opts,$('start'));const toggle=()=>opts.hidden=kind.value!=='nmck';kind.addEventListener('change',toggle);toggle();
const tool=document.querySelector('.excel-tool'),grid=tool&&tool.querySelector('.excel-grid-box');if(!grid)return;
const quick=document.createElement('div');quick.className='excel-quick';tool.insertBefore(quick,grid);
function suggestions(task,sheet,cell){
 const m=/^([A-Z]+)([1-9][0-9]*)$/.exec(cell);if(!m)return [];
 const c=m[1],r=Number(m[2]);
 if(sheet==='НМЦК'){
  const n=task.rows.length,offers=task.rows[0].prices.length,end=String.fromCharCode(69+offers-1),range='E'+r+':'+end+r;
  if(r>=4&&r<=n+3){
   const formulas={J:['Σ Сумма','=SUM('+range+')'],K:['Средняя','=AVERAGE('+range+')'],L:['СКО','=STDEV.S('+range+')'],M:['Вариация, %','=L'+r+'/K'+r+'*100'],N:['Стоимость','=ROUND(K'+r+';2)*D'+r],O:['Однородность','=IF(M'+r+'<=33;"Однородны";"Неоднородны")']};
   return formulas[c]?[formulas[c]]:[];
  }
  if(c==='N'&&r===n+5)return[['НМЦК итого','=SUM(N4:N'+(n+3)+')']];
 }
 if(sheet==='Бюджет'){
  const n=task.rows.length,first=4,last=n+3,inc=n+6,exp=n+7;
  if(r>=first&&r<=last){
   const denom=task.rows[r-first].kind==='Доход'?inc:exp;
   const formulas={G:['Доля','=E'+r+'/E'+denom+'*100'],H:['Исполнение','=E'+r+'/D'+r+'*100'],I:['Отклонение','=E'+r+'-D'+r]};
   return formulas[c]?[formulas[c]]:[];
  }
  if(r===inc||r===exp){
   const k=r===inc?'Доход':'Расход';
   if(c==='D'||c==='E')return[['СУММЕСЛИ','=SUMIF(F4:F'+last+';"'+k+'";'+c+'4:'+c+last+')']];
   if(c==='H')return[['Исполнение','=E'+r+'/D'+r+'*100']];
  }
  if(c==='E'&&r===inc+3)return[['Сальдо','=E'+inc+'-E'+exp]];
 }
 if(sheet==='Анализ')return [['Ссылка (пример)','=Баланс!C5'],['Среднее (пример)','=(Баланс!C5+Баланс!D5)/2'],['Рентабельность (пример)','=ОФР!C5/Баланс!C5*100']];
 return [];
}
function refresh(){
 const task=window.ExamCurrentTask,work=$('work');quick.replaceChildren();if(!task||work.hidden){quick.hidden=true;return;}
 const addr=document.querySelector('.excel-addr'),input=document.querySelector('.excel-input');
 if(!addr||!input||input.disabled){quick.hidden=true;return;}
 const x=addr.textContent,mark=x.indexOf('!');if(mark<0){quick.hidden=true;return;}
 const formulas=suggestions(task,x.slice(0,mark),x.slice(mark+1));quick.hidden=!formulas.length;if(!formulas.length)return;
 const label=document.createElement('span');label.className='excel-quick-label';label.textContent='Вставить формулу в выбранную ячейку:';quick.appendChild(label);
 for(const [name,formula] of formulas){
  const btn=document.createElement('button');btn.type='button';btn.className='excel-quick-button';btn.textContent=name;btn.title=formula;
  btn.addEventListener('click',()=>{input.value=formula;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();const info=document.querySelector('.excel-info');if(info)info.textContent='Шаблон вставлен. Проверь диапазон и нажми ✓. Числовой ответ не подставляется.';});
  quick.appendChild(btn);
 }
}
document.addEventListener('click',()=>setTimeout(refresh,0));
document.addEventListener('change',()=>setTimeout(refresh,0));
refresh();
})();