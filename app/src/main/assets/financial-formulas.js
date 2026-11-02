/* Financial-analysis formula suggestions based on the actual balance / P&L cells.
   Reference code-to-row mapping ensures source links work with expanded BFO codes. */
(function(root,factory){
 const api=factory();
 root.ExamFinanceHints=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function suggest(task,sheet,col,row,engine){
  if(!task||task.kind!=='financial'||sheet!=='Анализ'||!['C','D'].includes(col))return [];
  const i=row-3,metric=task.metrics?.[i];
  if(!metric)return [];
  const year=col==='C'?'2025':'2024',before=col==='C'?'D':'E';
  const codeRow=(codes,code)=>{
   const pos=codes.findIndex(line=>String(line[0])===code);
   if(pos<0)throw Error('Missing financial statement code '+code);
   return pos+3;
  };
  const balance=(code,yearcol=col)=>'Баланс!'+yearcol+codeRow(engine.bnames,code);
  const pnl=(code)=>'ОФР!'+col+codeRow(engine.pnames,code);
  const capital=balance('1300'),assets=balance('1600'),longterm=balance('1400'),current=balance('1500'),noncurrent=balance('1100');
  const net=pnl('2400'),revenue=pnl('2110');
  const avg=(code)=>'(('+balance(code)+'+'+balance(code,before)+')/2)';
  const ca=balance('1200'), cash=balance('1250'), short=balance('1240'), ar=balance('1230');
  const turnCodes=['1600','1200','1230','1520','1210','1150'];
  const iMetric=task.metrics.indexOf(metric);
  if(iMetric>=4&&iMetric<=15){
   const a=avg(turnCodes[(iMetric-4)%6]);
   return [['Формула для выбранной ячейки',iMetric<10?'='+revenue+'/'+a:'=365*'+a+'/'+revenue]];
  }
  const formulaByName={
   'Коэффициент текущей ликвидности':'='+ca+'/'+current,
   'Коэффициент абсолютной ликвидности':'=('+cash+'+'+short+')/'+current,
   'Коэффициент быстрой ликвидности':'=('+cash+'+'+short+'+'+ar+')/'+current,
   'Обеспеченность оборотными средствами':'=('+capital+'-'+noncurrent+')/'+ca,
   'Коэффициент автономии': '='+capital+'/'+assets,
   'Коэффициент финансовой зависимости':'='+assets+'/'+capital,
   'Соотношение заёмных и собственных средств':'=('+longterm+'+'+current+')/'+capital,
   'Маневренность собственного капитала':'=('+capital+'-'+noncurrent+')/'+capital,
   'Коэффициент финансовой устойчивости':'=('+capital+'+'+longterm+')/'+assets,
   'ROA — рентабельность активов, %':'='+net+'/(('+assets+'+'+balance('1600',before)+')/2)*100',
   'ROS — рентабельность продаж, %':'='+net+'/'+revenue+'*100',
   'ROE — рентабельность собственного капитала, %':'='+net+'/'+capital+'*100'
  };
  const formula=formulaByName[metric.name];
  return formula?[['Пример формулы: '+metric.name,formula]]:[];
 }
 return{suggest};
});