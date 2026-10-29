/* v0.9: independently selectable 3/4/5 quotations and 1/2/3 procurement positions. */
(function(root){
'use strict';
const E=root.ExamEngine;
if(!E)throw Error('Exam engine missing');
const prev=E.generate;
const rnd=(lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1));
const round=(n,d=2)=>E.round(n,d);
const q=(id,label,v,hint,group)=>({id,label,answer:typeof v==='number'?round(v):v,hint,group});
function nmck(level,opts){
 opts=opts||{};
 if(typeof document!=='undefined'){
   if(opts.offers==null){const el=document.getElementById('offers-count');if(el)opts.offers=el.value;}
   if(opts.lots==null){const el=document.getElementById('lot-count');if(el)opts.lots=el.value;}
 }
 const offers=[3,4,5].includes(Number(opts.offers))?Number(opts.offers):rnd(3,5);
 const lots=[1,2,3].includes(Number(opts.lots))?Number(opts.lots):(level==='easy'?1:level==='medium'?2:3);
 const generated=prev('nmck','hard'),rows=[],questions=[];
 let total=0;
 for(let i=0;i<lots;i++){
   const product=generated.rows[i],prices=product.prices.slice(0,offers);
   if(level==='hard'&&rnd(1,12)===1){const k=rnd(0,offers-1);prices[k]=Math.round(prices[k]*rnd(165,205)/100/10)*10;}
   const sum=prices.reduce((a,b)=>a+b,0),avg=sum/offers;
   const sd=Math.sqrt(prices.reduce((a,b)=>a+(b-avg)**2,0)/(offers-1));
   const cv=100*sd/avg,uniformity=cv<=33?'Однородны':'Неоднородны';
   const amount=round(round(avg)*product.quantity),id='n'+i,group='Позиция '+(i+1);
   rows.push({name:product.name,quantity:product.quantity,prices});
   questions.push(q(id+'sum','Сумма коммерческих предложений, руб.',sum,'SUM/СУММ цен поставщиков',group));
   questions.push(q(id+'avg','Средняя цена за единицу, руб.',avg,'AVERAGE/СРЗНАЧ по ценам поставщиков',group));
   questions.push(q(id+'sd','Выборочное стандартное отклонение, руб.',sd,'STDEV.S/СТАНДОТКЛОН.В по ценам (n-1)',group));
   questions.push(q(id+'cv','Коэффициент вариации, %',cv,'Отклонение / средняя цена × 100',group));
   questions.push(q(id+'amount','Начальная цена позиции, руб.',amount,'ROUND/ОКРУГЛ(средняя;2) × количество',group));
   questions.push(q(id+'uniformity','Однородность цен',uniformity,'IF/ЕСЛИ: вариация не более 33%',group));
   total+=amount;
 }
 questions.push(q('total','НМЦК всей закупки, руб.',round(total),'SUM/СУММ всех позиций','Итог'));
 return{kind:'nmck',title:'Расчёт начальной (максимальной) цены контракта',company:generated.company,
  rows,questions,offers,lots,id:generated.id||Date.now().toString()+'-'+rnd(100,999),difficulty:level,
  notes:'Учебный метод сопоставимых рыночных цен. На каждую позицию '+offers+' коммерческих предложений; позиций '+lots+'. Коэффициент вариации указывается в процентах, порог для учебной проверки — 33%. Данные вымышлены.'};
}
E.generate=function(kind,level,options){const t=kind==='nmck'?nmck(level,options):prev(kind,level);root.ExamCurrentTask=t;return t;};
})(typeof globalThis!=='undefined'?globalThis:this);
