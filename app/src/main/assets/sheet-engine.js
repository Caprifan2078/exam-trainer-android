/* ExamTrainer v0.8: spreadsheet-style practice engine; no eval(), no network. */
(function(root,factory){const m=factory();root.ExamSheets=m;if(typeof module!=='undefined'&&module.exports)module.exports=m;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_ROWS=145,MAX_COLS=17;
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const addr=(c,r)=>col(c)+String(r+1);
const decode=a=>{const m=/^\$?([A-Z]{1,2})\$?([1-9][0-9]{0,2})$/i.exec(a);if(!m)return null;let c=0;for(const x of m[1].toUpperCase())c=c*26+x.charCodeAt(0)-64;return{c:c-1,r:Number(m[2])-1};};
const norm=x=>typeof x==='number'?Math.round((x+Number.EPSILON)*100)/100:x;
function create(task){
 const w={kind:task.kind,id:task.id,task,order:[],sheets:{},targets:[],hintMap:{}};
 function add(name,cols,rows){const sh={name,cols,rows,values:{},editable:{}};w.sheets[name]=sh;w.order.push(name);return sh;}
 function input(sh,c,r,value){if(value!==null&&value!==undefined)sh.values[addr(c,r)]={raw:value,locked:true};}
 function head(sh,row,arr){arr.forEach((a,i)=>input(sh,i,row,a));}
 function target(sh,c,r,answer,hint,label,id,formula=true){const a=addr(c,r);sh.editable[a]=true;w.targets.push({sheet:sh.name,addr:a,answer,hint,label,id,formula});w.hintMap[sh.name+'!'+a]=hint;}
 if(task.kind==='nmck'){
   const sh=add('НМЦК',15,task.rows.length+8);
   head(sh,0,['№','Закупаемый товар / работа / услуга','Ед.','Кол-во','КП1','КП2','КП3','КП4','КП5','Сумма КП','Средняя цена','Станд. отклонение','Вариация, %','НМЦК позиции','Комментарий']);
   input(sh,1,1,'Цены за 1 единицу, руб. ЗАПОЛНЯЙ ЖЁЛТЫЕ ЯЧЕЙКИ ФОРМУЛАМИ.');
   const offerCount=task.rows[0].prices.length;
   task.rows.forEach((row,i)=>{
     const r=i+3,id='n'+i;
     input(sh,0,r,i+1);input(sh,1,r,row.name);input(sh,2,r,'шт.');input(sh,3,r,row.quantity);
     row.prices.forEach((price,k)=>input(sh,4+k,r,price));
     const last=col(4+offerCount-1),range='E'+(r+1)+':'+last+(r+1);
     const get=idSuffix=>task.questions.find(q=>q.id===id+idSuffix);
     for(const [c,suffix,hint] of [[9,'sum','Сложи все цены: =SUM('+range+')'],[10,'avg','Среднее: =AVERAGE('+range+') или =J'+(r+1)+'/'+offerCount],[11,'sd','Выборочное отклонение: =STDEV.S('+range+')'],[12,'cv','Коэффициент вариации: =L'+(r+1)+'/K'+(r+1)+'*100'],[13,'amount','Стоимость: =ROUND(K'+(r+1)+';2)*D'+(r+1)]]){
       const q=get(suffix);if(q)target(sh,c,r,q.answer,hint,q.label,q.id);
     }
     const hom=task.questions.find(q=>q.id===id+'uniformity');
     if(hom)target(sh,14,r,hom.answer,'Однородность: =IF(M'+(r+1)+'<=33;"Однородны";"Неоднородны")',hom.label,hom.id);
   });
   const tr=task.rows.length+4;input(sh,1,tr,'ВСЕГО НМЦК, руб.');const total=task.questions.find(q=>q.id==='total');
   target(sh,13,tr,total.answer,'Сложи стоимости всех позиций: =SUM(N4:N'+(task.rows.length+3)+')','Итог НМЦК','total');
   sh.rows=tr+3;
 }else if(task.kind==='budget'){
   const sh=add('Бюджет',10,task.rows.length+11);
   head(sh,0,['№','Статья бюджета','Раздел','План, тыс.','Факт, тыс.','Доход/расход','Доля, %','Исполнение, %','Отклонение','Примечание']);
   input(sh,1,1,'Доля = факт статьи / итог факта соответствующей группы × 100.');
   task.rows.forEach((row,i)=>{
     const r=i+3,id='b'+i;
     input(sh,0,r,i+1);input(sh,1,r,row.name);input(sh,2,r,row.category||'—');input(sh,3,r,row.plan);input(sh,4,r,row.actual);
     const qkind=task.questions.find(q=>q.id===id+'kind');
     target(sh,5,r,row.kind,'Определи, поступление это или расход. Впиши «Доход» или «Расход».',qkind.label,qkind.id,false);
     target(sh,6,r,norm(row.actual/task.summary[row.kind].actual*100),'Доля статьи от суммы фактических '+(row.kind==='Доход'?'доходов':'расходов')+'. Используй ссылки на итоги ниже.',row.name+' — доля, %',id+'share');
     const qpct=task.questions.find(q=>q.id===id+'pct');if(qpct)target(sh,7,r,qpct.answer,'=E'+(r+1)+'/D'+(r+1)+'*100',qpct.label,qpct.id);
     const qdiff=task.questions.find(q=>q.id===id+'diff');if(qdiff)target(sh,8,r,qdiff.answer,'=E'+(r+1)+'-D'+(r+1),qdiff.label,qdiff.id);
   });
   const start=task.rows.length+5;for(const [k,d] of [['Доход',0],['Расход',1]]){
     const r=start+d;input(sh,1,r,(d?'РАСХОДЫ':'ДОХОДЫ')+' — ВСЕГО');
     for(const [c,suffix] of [[3,'plan'],[4,'actual'],[7,'pct']]){
       const q=task.questions.find(q=>q.id===k+suffix);if(q)target(sh,c,r,q.answer,
         c===7?'=E'+(r+1)+'/D'+(r+1)+'*100':`=SUMIF(F4:F${task.rows.length+3};"${k}";${c===3?'D':'E'}4:${c===3?'D':'E'}${task.rows.length+3})`,q.label,q.id);
     }
   }
   input(sh,1,start+3,'САЛЬДО БЮДЖЕТА');const b=task.questions.find(q=>q.id==='balance');
   target(sh,4,start+3,b.answer,`Факт доходов − факт расходов: =E${start+1}-E${start+2}`,b.label,b.id);
   input(sh,1,start+4,'Дефицит / профицит');const st=task.questions.find(q=>q.id==='status');
   target(sh,4,start+4,st.answer,'Плюс = Профицит, минус = Дефицит, ноль = Сбалансирован. Можно использовать =IF(E'+(start+4)+'>0;"Профицит";"Дефицит")',st.label,st.id,false);
   sh.rows=start+7;
 }else if(task.kind==='financial'){
   for(const [name,codes,data,years] of [['Баланс',windowOrEngine().bnames,task.balance,['2025','2024','2023']],['ОФР',windowOrEngine().pnames,task.pl,['2025','2024']]]){
     const sh=add(name,years.length+2,codes.length+4);
     head(sh,0,['Код','Показатель',...years]);
     codes.forEach(([code,label],i)=>{const r=i+2;input(sh,0,r,code);input(sh,1,r,label);years.forEach((y,j)=>input(sh,j+2,r,data[y][code]??0));});
   }
   const sh=add('Анализ',4,task.questions.length/2+4);
   head(sh,0,['Раздел','Расчётный показатель','2025','2024']);
   const paired=new Map();task.questions.forEach(q=>{const year=q.id.endsWith('2025')?'2025':'2024';const prefix=q.id.slice(0,-4);if(!paired.has(prefix))paired.set(prefix,{});paired.get(prefix)[year]=q;});
   let r=2;for(const [key,qs] of paired){const q=qs['2025']||qs['2024'];input(sh,0,r,q.group||'');input(sh,1,r,q.label.replace(/\s*[—-]\s*202[45]$/,''));
      for(const [year,c] of [['2025',2],['2024',3]])if(qs[year]){
        const item=qs[year];target(sh,c,r,item.answer,item.hint+' (формулы вводятся со ссылками вида Баланс!C5 или ОФР!C7)',item.label,item.id);
      }r++;
   }sh.rows=r+2;
 }else throw Error('Unsupported task: '+task.kind);
 return w;
}
let _engine=null;
function windowOrEngine(){return _engine||(typeof globalThis!=='undefined'?globalThis.ExamEngine:null)||{};}
function setEngine(e){_engine=e;}
function sheetCell(sh,a){return sh.values[a]||{raw:'',locked:!sh.editable[a]};}
function write(w,sheet,a,raw){const sh=w.sheets[sheet],pos=decode(a);if(!sh||!pos||pos.c>=sh.cols||pos.r>=sh.rows)throw Error('#REF!');const cel=sheetCell(sh,a);if(cel.locked)throw Error('Исходные данные менять нельзя');if(String(raw).length>300)throw Error('Слишком длинная формула');sh.values[a]={raw:String(raw),locked:false};}
function lex(src){const out=[];let i=0;while(i<src.length){if(/\s/.test(src[i])){i++;continue;}const rem=src.slice(i);
let m;if(src[i]==='"'){let j=i+1,text='';while(j<src.length){if(src[j]==='"'){if(src[j+1]==='"'){text+='"';j+=2;continue;}break;}text+=src[j++];}if(j>=src.length)throw Error('#ФОРМУЛА!');out.push({t:'str',v:text});i=j+1;continue;}
if(src[i]==="'"){let j=src.indexOf("'",i+1);if(j<0)throw Error('#ФОРМУЛА!');out.push({t:'ident',v:src.slice(i+1,j)});i=j+1;continue;}
if((m=/^(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rem))){out.push({t:'num',v:Number(m[0])});i+=m[0].length;continue;}
if((m=/^[A-ZА-ЯЁ_\$][A-ZА-ЯЁ_0-9.$]*/i.exec(rem))){out.push({t:'ident',v:m[0]});i+=m[0].length;continue;}
if(rem.startsWith('>=')||rem.startsWith('<=')||rem.startsWith('<>')){out.push({t:rem.slice(0,2)});i+=2;continue;}
if('+-*/^(),;:!<>=%.'.includes(src[i])){out.push({t:src[i]});i++;continue;}
throw Error('#ФОРМУЛА!');}
if(out.length>400)throw Error('#ФОРМУЛА!');out.push({t:'end'});return out;
}
function calc(w,sheet,a,stack){const sh=w.sheets[sheet];if(!sh)throw Error('#REF!');const cell=sh.values[a];if(!cell||cell.raw===undefined||cell.raw===null||String(cell.raw)==='')return 0;
const raw=cell.raw;if(typeof raw==='number')return raw;if(typeof raw!=='string'||!raw.startsWith('=')){const n=Number(raw.trim().replace(/\s/g,'').replace(',','.'));return raw.trim()!==''&&Number.isFinite(n)?n:raw;}
const key=sheet+'!'+a;if(stack.includes(key))throw Error('#ЦИКЛ!');if(stack.length>75)throw Error('#ЦИКЛ!');stack.push(key);
try{const tokens=lex(raw.slice(1));let ix=0;const peek=()=>tokens[ix].t;const take=t=>{if(peek()!==t)throw Error('#ФОРМУЛА!');return tokens[ix++];};
function val(v){if(Array.isArray(v))return v.flat(Infinity).map(val);if(v===null||v==='')return null;if(typeof v==='number')return v;if(typeof v==='string'){const n=Number(v.replace(',','.'));return Number.isFinite(n)?n:v;}return v;}
function num(v){v=val(v);if(v===null)return 0;if(typeof v!=='number'||!Number.isFinite(v))throw Error('#ЗНАЧ!');return v;}
function apply(name,args){const fn=name.toUpperCase().replace(/\./g,'');const flatten=args.flat(Infinity).map(val);const nums=flatten.filter(n=>typeof n==='number'&&Number.isFinite(n));const v=i=>num(args[i]??0);
switch(fn){
case 'SUM':case 'СУММ':return nums.reduce((a,b)=>a+b,0);
case 'AVERAGE':case 'СРЗНАЧ':if(!nums.length)throw Error('#ДЕЛ/0!');return nums.reduce((a,b)=>a+b,0)/nums.length;
case 'STDEVS':case 'СТАНДОТКЛОНВ':if(nums.length<2)throw Error('#ДЕЛ/0!');{const avg=nums.reduce((a,b)=>a+b,0)/nums.length;return Math.sqrt(nums.reduce((a,b)=>a+(b-avg)**2,0)/(nums.length-1));}
case 'SQRT':case 'КОРЕНЬ':return Math.sqrt(v(0));
case 'ROUND':case 'ОКРУГЛ':{let digits=v(1);if(!Number.isInteger(digits)||Math.abs(digits)>10)throw Error('#ЗНАЧ!');const n=v(0);return Math.round((n+Number.EPSILON)*10**digits)/10**digits;}
case 'ABS':case 'ABSOLUTE':case 'АБС':return Math.abs(v(0));
case 'COUNT':case 'СЧЁТ':return nums.length;
case 'MIN':case 'МИН':return Math.min(...nums);
case 'MAX':case 'МАКС':return Math.max(...nums);
case 'IF':case 'ЕСЛИ':return args[0]?args[1]:args[2];
case 'SUMIF':case 'СУММЕСЛИ':{if(!Array.isArray(args[0])||!Array.isArray(args[2]))throw Error('#ЗНАЧ!');const criteria=String(args[1]);return args[0].reduce((s,x,i)=>s+(String(x).toLowerCase()===criteria.toLowerCase()?num(args[2][i]||0):0),0);}
case 'COUNTIF':case 'СЧЁТЕСЛИ':{if(!Array.isArray(args[0]))throw Error('#ЗНАЧ!');return args[0].filter(x=>String(x).toLowerCase()===String(args[1]).toLowerCase()).length;}
default:throw Error('#ИМЯ?');}}
function ref(shName,cell){const p=decode(cell);if(!p||p.c>=MAX_COLS||p.r>=MAX_ROWS||!w.sheets[shName])throw Error('#REF!');return calc(w,shName,addr(p.c,p.r),stack);}
function range(shName,from,to){const a=decode(from),b=decode(to);if(!a||!b||!w.sheets[shName])throw Error('#REF!');if(a.r>b.r||a.c>b.c||(b.r-a.r+1)*(b.c-a.c+1)>500)throw Error('#REF!');const data=[];for(let r=a.r;r<=b.r;r++)for(let c=a.c;c<=b.c;c++){const key=addr(c,r),item=w.sheets[shName].values[key];data.push(item&&String(item.raw).trim()!==''?ref(shName,key):null);}return data;}
function primary(){if(peek()==='-'){take('-');return -num(primary());}if(peek()==='+'){take('+');return num(primary());}if(peek()==='('){take('(');const v=expression();take(')');return v;}
if(peek()==='num')return take('num').v;if(peek()==='str')return take('str').v;
if(peek()==='ident'){
 const id=take('ident').v;
 if(peek()==='('){take('(');const args=[];if(peek()!==')')do{args.push(expression());if(peek()!==';'&&peek()!==',')break;ix++;}while(true);take(')');return apply(id,args);}
 let s=sheet,cell=id;
 if(peek()==='!'){take('!');s=id;cell=take('ident').v;}
 if(!decode(cell))throw Error('#ИМЯ?');
 if(peek()===':'){take(':');let tok=take('ident').v,refSheet=s;if(peek()==='!'){take('!');refSheet=tok;tok=take('ident').v;}if(refSheet!==s)throw Error('#REF!');return range(s,cell,tok);}
 return ref(s,cell);
 }
 throw Error('#ФОРМУЛА!');}
function powered(){let x=primary();while(peek()==='^'||peek()==='%'){if(peek()==='%'){take('%');x=num(x)/100;}else{take('^');x=num(x)**num(primary());}}return x;}
function term(){let x=powered();while(peek()==='*'||peek()==='/'){const op=tokens[ix++].t,other=num(powered());x=op==='*'?num(x)*other:other===0?(()=>{throw Error('#ДЕЛ/0!');})():num(x)/other;}return x;}
function additive(){let x=term();while(peek()==='+'||peek()==='-'){const op=tokens[ix++].t,y=num(term());x=op==='+'?num(x)+y:num(x)-y;}return x;}
function expression(){let x=additive();while(['=','>','<','>=','<=','<>'].includes(peek())){const op=tokens[ix++].t,y=additive();switch(op){case '=':x=x===y;break;case '<>':x=x!==y;break;case '>':x=x>y;break;case '<':x=x<y;break;case '>=':x=x>=y;break;case '<=':x=x<=y;break;}}return x;}
const result=expression();if(peek()!=='end')throw Error('#ФОРМУЛА!');if(typeof result==='number'&&!Number.isFinite(result))throw Error('#ЗНАЧ!');return result;
}finally{stack.pop();}}
function value(w,s,a){try{return calc(w,s,a,[]);}catch(e){return /^#/.test(e.message)?e.message:'#ОШИБКА!';}}
function grade(w){let passed=0;const results=[];for(const t of w.targets){const cel=w.sheets[t.sheet].values[t.addr],raw=cel?.raw||'',v=value(w,t.sheet,t.addr);let status='empty';if(String(raw).trim()){if(typeof v==='string'&&v.startsWith('#'))status='bad';else{const good=typeof t.answer==='number'?typeof v==='number'&&Math.abs(v-t.answer)<=Math.max(.011,Math.abs(t.answer)*1e-9):String(v).trim().toLowerCase().replace(/ё/g,'е')===String(t.answer).toLowerCase().replace(/ё/g,'е');status=good?(t.formula&&!String(raw).startsWith('=')?'need-formula':'ok'):'bad';}}
 if(status==='ok')passed++;results.push({...t,value:v,status,raw});}
 return{passed,total:w.targets.length,percent:Math.round(passed/w.targets.length*100),results};}
function save(w){const entries={};for(const name of w.order){const sh=w.sheets[name];entries[name]=Object.fromEntries(Object.entries(sh.values).filter(([k,v])=>!v.locked).map(([k,v])=>[k,v.raw]));}return entries;}
function load(w,entries){for(const [name,table] of Object.entries(entries||{}))if(w.sheets[name])for(const [a,v] of Object.entries(table))if(w.sheets[name].editable[a])write(w,name,a,v);}
return{create,setEngine,col,addr,decode,write,value,grade,save,load};
});