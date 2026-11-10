'use strict';
// Conservative Windows-runner baseline, not a claim about the owner's laptop.
const assert=require('node:assert/strict');
const { _electron: electron }=require('playwright-core');
(async()=>{
 const started=Date.now();
 const app=await electron.launch({executablePath:require('electron'),args:['main.cjs'],timeout:60000});
 try{
  const page=await app.firstWindow({timeout:30000});
  await page.waitForFunction(()=>!!window.ExamSheets&&!!document.getElementById('start'));
  const bootMs=Date.now()-started;
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  const timings=[];
  for(const kind of ['nmck','budget','financial']){
   await page.locator('#mode').selectOption('learning');
   await page.locator('#kind').selectOption(kind);
   const t=Date.now();
   await page.locator('#start').click();
   const cells=await page.locator('td.excel-editable[data-addr]').count();
   assert(cells>0,'Spreadsheet is missing editable cells: '+kind);
   const renderMs=Date.now()-t;
   timings.push({kind,editableCells:cells,renderMs});
   await page.locator('#back').click();
  }
  const processes=await app.evaluate(({app})=>app.getAppMetrics()
    .map(p=>({type:p.type,workingSetKb:p.memory?.workingSetSize||0})));
  const totalWorkingSetKb=processes.reduce((n,p)=>n+p.workingSetKb,0);
  console.log('PERF: '+JSON.stringify({bootMs,timings,totalWorkingSetMb:
    Number((totalWorkingSetKb/1024).toFixed(1)),processes}));
  assert(bootMs<30000,'Windows QA application startup regression');
  assert(timings.every(x=>x.renderMs<12000),'Windows worksheet rendering regression');
  console.log('PASS: Windows portable-source cold start and all 3 worksheet render timings captured');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
