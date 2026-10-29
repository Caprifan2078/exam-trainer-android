'use strict';
const assert=require('node:assert/strict');
const E=require('../app/src/main/assets/engine.js');
require('../app/src/main/assets/upgrade.js');
const S=require('../app/src/main/assets/sheet-engine.js');
S.setEngine(E);
let n=0;
for(const kind of ['nmck','budget','financial'])for(const level of ['easy','medium','hard'])for(let i=0;i<120;i++){
  const task=E.generate(kind,level),w=S.create(task);
  assert(w.order.length>0,'No workbook sheets');
  assert(w.targets.length>0,'No editable result targets');
  assert.equal(S.grade(w).passed,0,'Unanswered workbook cannot pass');
  const first=w.targets.find(t=>typeof t.answer==='number');
  assert(first);
  S.write(w,first.sheet,first.addr,String(first.answer));
  assert.equal(S.grade(w).results.find(x=>x.id===first.id).status,'need-formula');
  S.write(w,first.sheet,first.addr,'='+first.answer);
  assert.equal(S.grade(w).results.find(x=>x.id===first.id).status,'ok');
  if(kind==='nmck'){
    for(let j=0;j<task.rows.length;j++){
      const row=task.rows[j],r=j+4,last=String.fromCharCode(69+row.prices.length-1);
      for(const [cell,formula] of [
        ['J'+r,'=SUM(E'+r+':'+last+r+')'],
        ['K'+r,'=AVERAGE(E'+r+':'+last+r+')'],
        ['L'+r,'=STDEV.S(E'+r+':'+last+r+')'],
        ['M'+r,'=L'+r+'/K'+r+'*100'],
        ['N'+r,'=ROUND(K'+r+';2)*D'+r]
      ])if(w.sheets.НМЦК.editable[cell])S.write(w,'НМЦК',cell,formula);
    }
    const grade=S.grade(w);
    assert(grade.results.filter(t=>t.sheet==='НМЦК'&&t.id!=='total'&&/^([JKLMN])[4-9]$/.test(t.addr)).every(t=>t.status==='ok'),'NMCQ formula mismatch');
  }
  if(kind==='budget'){
    for(let j=0;j<task.rows.length;j++){
      const r=j+4,row=task.rows[j];
      S.write(w,'Бюджет','F'+r,row.kind);
      if(w.sheets.Бюджет.editable['H'+r])S.write(w,'Бюджет','H'+r,'=E'+r+'/D'+r+'*100');
      if(w.sheets.Бюджет.editable['I'+r])S.write(w,'Бюджет','I'+r,'=E'+r+'-D'+r);
    }
    const start=task.rows.length+6;
    for(const [group,row] of [['Доход',start],['Расход',start+1]]){
      for(const letter of ['D','E'])S.write(w,'Бюджет',letter+row,'=SUMIF(F4:F'+(task.rows.length+3)+';"'+group+'";'+letter+'4:'+letter+(task.rows.length+3)+')');
      if(w.sheets.Бюджет.editable['H'+row])S.write(w,'Бюджет','H'+row,'=E'+row+'/D'+row+'*100');
    }
    for(let j=0;j<task.rows.length;j++){
      const r=j+4,group=task.rows[j].kind==='Доход'?start:start+1;
      S.write(w,'Бюджет','G'+r,'=E'+r+'/E'+group+'*100');
    }
    S.write(w,'Бюджет','E'+(start+3),'=E'+start+'-E'+(start+1));
    assert(S.grade(w).results.every(x=>x.status==='ok'||x.id==='status'),'Budget formulas mismatch');
  }
  if(kind==='financial'){
    for(const q of task.questions){const t=w.targets.find(x=>x.id===q.id);assert(t);S.write(w,t.sheet,t.addr,'='+q.answer);}
    assert.equal(S.grade(w).percent,100,'Financial answer targets mismatch');
  }
  n++;
}
const sample=S.create(E.generate('nmck','easy'));
S.write(sample,'НМЦК','J4','=J4');assert.equal(S.value(sample,'НМЦК','J4'),'#ЦИКЛ!');
S.write(sample,'НМЦК','J4','=10/0');assert.equal(S.value(sample,'НМЦК','J4'),'#ДЕЛ/0!');
console.log('PASS '+n+' workbook formula scenarios');
