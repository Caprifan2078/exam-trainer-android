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
  if(!metric||!['Финансовая устойчивость','Рентабельность'].includes(metric.section))return [];
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
  const formulaByName={
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