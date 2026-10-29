/* v0.9.3 — NMCK working sheet matches supplied solved Excel templates (3 or 5 KP). */
(function(root) {
'use strict';
const S=root.ExamSheets,E=root.ExamEngine;
if(!S||!E)throw Error('NMCK template requires both engines');
const original=S.create;
const letter=n=>S.col(n);
function render(task){
 const n=task.rows[0].prices.length;
 if(n<3||n>5)throw Error('Ожидается 3–5 коммерческих предложений');
 // A:D identity/quantity; E.. offers; then avg, SD, coefficient, calculation, price per item, final amount.
 const avg=4+n,sd=avg+1,cv=avg+2,calc=avg+3,unit=avg+4,amount=avg+5;
 const name='НМЦК',sh={name,cols:amount+1,rows:Math.max(17,task.rows.length+13),values:{},editable:{}};
 const w={kind:'nmck',id:task.id,task,order:[name],sheets:{[name]:sh},targets:[],hintMap:{},template:'nmck-solved'};
 function fixed(c,r,value){if(value!==null&&value!==undefined)sh.values[S.addr(c,r)]={raw:value,locked:true};}
 function editable(c,r,value,label,hint,id){const a=S.addr(c,r);sh.editable[a]=true;w.targets.push({sheet:name,addr:a,answer:value,label,hint,id,formula:true});w.hintMap[name+'!'+a]=hint;}
 fixed(0,0,'Обоснование начальной (максимальной) цены контракта');
 fixed(0,1,'Лот № 1 — '+task.rows.map(x=>x.name).join('; '));
 fixed(0,2,'Используемый метод: сопоставимых рыночных цен (анализа рынка)');
 fixed(0,3,'№');fixed(1,3,'Наименование предмета товара (работы, услуги)');
 fixed(2,3,'Ед. изм.');fixed(3,3,'Кол-во');
 fixed(4,3,'Источник информации о цене (руб./ед. изм.)');
 fixed(avg,3,'Однородность выявленных цен');
 fixed(calc,3,'НМЦК методом сопоставимых рыночных цен');
 fixed(0,4,'№');fixed(1,4,'Предмет закупки');fixed(2,4,'Ед. изм.');fixed(3,4,'Объём');
 for(let k=0;k<n;k++)fixed(4+k,4,'Коммерческое предложение №'+(k+1));
 fixed(avg,4,'Средняя цена за единицу, руб.');
 fixed(sd,4,'Среднее квадратичное отклонение, руб.');
 fixed(cv,4,'Коэффициент вариации V, % (≤33)');
 fixed(calc,4,'Расчёт НМЦК по формуле, руб.');
 fixed(unit,4,'Цена за единицу, руб.');
 fixed(amount,4,'НМЦК позиции, руб.');
 task.rows.forEach((row,i)=>{
  const r=i+5,R=r+1,id='n'+i;
  fixed(0,r,i+1);fixed(1,r,row.name);fixed(2,r,'Штуки');fixed(3,r,row.quantity);
  row.prices.forEach((v,k)=>fixed(4+k,r,v));
  const area='E'+R+':'+letter(avg-1)+R;
  const q=suffix=>task.questions.find(x=>x.id===id+suffix);
  const mean=q('avg'),deviation=q('sd'),variation=q('cv'),total=q('amount');
  if(!mean||!deviation||!variation||!total)throw Error('В задании НМЦК недостаёт обязательного показателя');
  editable(avg,r,mean.answer,'Средняя цена, руб.','=AVERAGE('+area+')',id+'avg');
  editable(sd,r,deviation.answer,'Среднее квадратичное отклонение','=STDEV.S('+area+')',id+'sd');
  editable(cv,r,variation.answer,'Коэффициент вариации, %','='+letter(sd)+R+'/'+letter(avg)+R+'*100',id+'cv');
  editable(calc,r,total.answer,'Расчёт НМЦК позиции','=ROUND('+letter(avg)+R+';2)*D'+R,id+'calc');
  editable(unit,r,E.round(mean.answer),'Цена за одну единицу','=ROUND('+letter(avg)+R+';2)',id+'unit');
  editable(amount,r,total.answer,'НМЦК позиции','='+letter(unit)+R+'*D'+R,id+'amount');
 });
 const footer=task.rows.length+5,R=footer+1;
 fixed(1,footer,'В результате проведённого расчёта Н(М)ЦК составляет, руб.:');
 const total=task.questions.find(x=>x.id==='total');
 if(!total)throw Error('Не найден итог НМЦК');
 editable(amount,footer,total.answer,'Итоговая НМЦК','=SUM('+letter(amount)+'6:'+letter(amount)+(task.rows.length+5)+')','total');
 fixed(1,footer+3,'Дата составления: __________________');
 fixed(1,footer+4,'Работник контрактной службы:');
 fixed(1,footer+5,'Должность: _______________________');
 fixed(1,footer+6,'ФИО: _____________________________');
 fixed(1,footer+7,'Подпись: _________________________');
 sh.rows=footer+10;
 w.nmckLayout={offers:n,lots:task.rows.length,dataStart:6,dataEnd:task.rows.length+5,footerRow:R,avg:letter(avg),sd:letter(sd),cv:letter(cv),calc:letter(calc),unit:letter(unit),amount:letter(amount)};
 return w;
}
S.create=function(task){
 if(!task||task.kind!=='nmck')return original(task);
 return render(task);
};
})(typeof globalThis!=='undefined'?globalThis:this);
