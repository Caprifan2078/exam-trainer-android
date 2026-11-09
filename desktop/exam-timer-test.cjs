'use strict';
const assert=require('node:assert/strict');
const { _electron: electron }=require('playwright-core');
(async()=>{
 const app=await electron.launch({executablePath:require('electron'),args:['main.cjs'],timeout:60000});
 try{
  const page=await app.firstWindow({timeout:30000});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.locator('#mode').selectOption('exam');
  await page.locator('#start').click();
  const started=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('examSheetsDraft')).session;
    return {started:Date.now(),deadline:s?.deadline,types:s?.tasks?.map(t=>t.kind),
      clock:document.querySelector('.session-status')?.textContent};
  });
  assert.deepEqual(started.types,['nmck','budget','financial'],
    'The Exam mode must be one three-exercise session');
  assert(Math.abs(started.deadline-started.started-3*60*60*1000)<10000,
    'One common three-hour deadline is required');
  assert.match(started.clock,/0[23]:[0-5]\d:[0-5]\d/,
    'The exam countdown must show hours, minutes and seconds');
  await page.locator('td.excel-editable[data-addr]').first().click();
  await page.locator('.excel-input').fill('=1+1');
  await page.locator('.excel-commit').click();
  await page.locator('#check').click();
  await page.getByRole('button',{name:'Следующее задание →'}).click();
  const second=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('examSheetsDraft')).session;
    return {index:s.index,deadline:s.deadline,results:s.results.length,kind:window.ExamCurrentTask.kind};
  });
  assert.equal(second.index,1);
  assert.equal(second.deadline,started.deadline,'Time must never reset between exercises');
  assert.equal(second.results,1);
  assert.equal(second.kind,'budget');
  await page.locator('#back').click();
  assert.equal(await page.getByRole('button',{name:'Продолжить экзамен'}).isVisible(),true);
  await page.getByRole('button',{name:'Продолжить экзамен'}).click();
  await page.reload();
  const afterReload=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('examSheetsDraft')).session;
    return {index:s.index,deadline:s.deadline,kind:window.ExamCurrentTask.kind};
  });
  assert.equal(afterReload.index,1);
  assert.equal(afterReload.deadline,started.deadline,'Time must not reset on restart');
  assert.equal(afterReload.kind,'budget');
  await page.locator('td.excel-editable[data-addr]').first().click();
  await page.locator('.excel-input').fill('=1+1');
  // Force an expired wall clock without waiting 3 hours. The active unsaved edit must be captured.
  await page.evaluate(()=>{
    const end=JSON.parse(localStorage.getItem('examSheetsDraft')).session.deadline;
    Date.now=()=>end+1000;
  });
  await page.waitForFunction(()=>{
    const s=JSON.parse(localStorage.getItem('examSheetsDraft')).session;
    return s?.finished===true && s.timedOut===true;
  },null,{timeout:6000});
  const expired=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('examSheetsDraft')).session;
    return {count:s.results.length,finished:s.finished,timedOut:s.timedOut,
      clock:document.querySelector('.session-status').textContent,
      checkDisabled:document.getElementById('check').disabled,
      reviewLocked:document.getElementById('review-text').readOnly,
      scores:s.results.map(x=>[x.passed,x.total]),
      formulaSaved:Object.values(s.results[1].snapshot?.entries||{}).some(
        entries=>Object.values(entries).includes('=1+1'))};
  });
  assert.equal(expired.count,3,'All three exercises must appear in the final assessment');
  assert.equal(expired.finished,true);
  assert.equal(expired.timedOut,true);
  assert.match(expired.clock,/00:00:00|время вышло/i);
  assert(expired.checkDisabled,'Timed-out exam must not allow further checks');
  assert(expired.reviewLocked,'Timed-out exam must not allow further written edits');
  assert(expired.formulaSaved,'Uncommitted answer must be preserved on timeout');
  assert(expired.scores.every(([p,t])=>Number.isFinite(p)&&t>0));
  await page.reload();
  assert.equal(await page.locator('#check').isDisabled(),true,'Expired exam stays locked after reload');
  await page.locator('#back').click();
  assert.equal(await page.getByRole('button',{name:'Посмотреть результат экзамена'}).isVisible(),true);
  console.log('PASS: shared 03:00:00 timer in exam mode, no reset after next task/reload, timeout auto-finalizes all 3, locks and saves');
  // Expiring while the page is loading must not lose the persisted written conclusion.
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.locator('#mode').selectOption('exam');
  assert.equal(await page.locator('#kind').isVisible(),false);
  await page.locator('#start').click();
  await page.locator('#review-text').fill('НМЦК: вывод до истечения времени');
  await page.evaluate(()=>{
    const draft=JSON.parse(localStorage.getItem('examSheetsDraft'));
    draft.session.deadline=Date.now()-1000;
    localStorage.setItem('examSheetsDraft',JSON.stringify(draft));
  });
  await page.reload();
  const expiredOnLoad=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('examSheetsDraft')).session;
    return {finished:s.finished,timedOut:s.timedOut,
      reviewText:s.results?.[0]?.snapshot?.reviewText,results:s.results?.length};
  });
  assert(expiredOnLoad.finished&&expiredOnLoad.timedOut);
  assert.equal(expiredOnLoad.results,3);
  assert.equal(expiredOnLoad.reviewText,'НМЦК: вывод до истечения времени');
  console.log('PASS: deadline expired during reload retains the original written conclusion');
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.locator('#mode').selectOption('learning');
  await page.locator('#kind').selectOption('financial');
  await page.locator('#start').click();
  const learning=await page.evaluate(()=>JSON.parse(localStorage.getItem('examSheetsDraft')).session);
  assert.equal(learning,null,'Training mode must remain untimed');
  assert.deepEqual(errors,[]);
  console.log('PASS: untimed learning mode and no browser JS errors');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
