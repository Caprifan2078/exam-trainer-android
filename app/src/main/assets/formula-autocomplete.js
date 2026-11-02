/* The list only contains functions that the workbook parser can calculate. */
(function(root,factory){const api=factory();root.ExamFormulaComplete=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const catalog=[['СУММ','SUM','Сумма'],['СРЗНАЧ','AVERAGE','Среднее'],['СТАНДОТКЛОН.В','STDEV.S','Выборочное отклонение'],['ОКРУГЛ','ROUND','Округление'],['ЕСЛИ','IF','Условие'],['СУММЕСЛИ','SUMIF','Сумма по условию'],['СЧЁТЕСЛИ','COUNTIF','Число ячеек по условию'],['СЧЁТ','COUNT','Число числовых ячеек'],['КОРЕНЬ','SQRT','Квадратный корень'],['АБС','ABS','Модуль'],['МИН','MIN','Минимум'],['МАКС','MAX','Максимум']];
function candidates(value,cursor){
 const s=String(value),at=Math.max(0,Math.min(s.length,Number.isInteger(cursor)?cursor:s.length));if(!s.trimStart().startsWith('='))return null;
 const before=s.slice(0,at);let quoted=false;for(let i=0;i<before.length;i++)if(before[i]==='"'){if(quoted&&before[i+1]==='"')i++;else quoted=!quoted;}if(quoted)return null;
 const m=/(?:^|[=+\-*/^(;,])\s*([A-Za-zА-Яа-яЁё.]+)$/.exec(before);if(!m)return null;
 const prefix=m[1].toUpperCase().replace(/Ё/g,'Е'),start=at-m[1].length;
 const items=[];for(const [ru,en,desc] of catalog){const match=x=>x.toUpperCase().replace(/Ё/g,'Е').startsWith(prefix);if(match(ru))items.push({name:ru,desc});if(match(en))items.push({name:en,desc});}
 return items.length?{start,end:at,items}:null;
}
function insert(value,start,end,text){const str=String(value),pos=Math.max(0,Math.min(str.length,start)),stop=Math.max(pos,Math.min(str.length,end));return{value:str.slice(0,pos)+text+str.slice(stop),caret:pos+text.length};}
return{catalog,candidates,insert};});
