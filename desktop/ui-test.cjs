'use strict';
const { _electron: electron }=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const app=await electron.launch({executablePath:require('electron'),args:['main.cjs'],timeout:60000});
 try{
  const page=await app.firstWindow({timeout:30000});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.locator('#offers-count').selectOption('3');await page.locator('#start').click();
  await page.locator('td[data-addr="H6"]').click();const input=page.locator('.excel-input');
  assert.equal(await page.locator('td[data-addr="H6"] .excel-input').count(),1,'Editing begins directly in cell');
  const box=await page.locator('td[data-addr="H6"]').boundingBox(),field=await input.boundingBox();assert(field.x>=box.x-1&&field.x+field.width<=box.x+box.width+1,'Input must not overlap its neighbour');assert.equal(await input.getAttribute('placeholder'),'','No placeholder hides editable cell');
  assert(!((await page.locator('.excel-info').innerText()).includes('СРЗНАЧ')),'Cell hint must stay hidden');
  assert.equal(await page.locator('.excel-quick-label:visible').count(),0,'Formula hint must be hidden until requested');
  await input.fill('=ср');await page.locator('.formula-suggestion').filter({hasText:'СРЗНАЧ'}).first().click();
  assert.equal(await input.inputValue(),'=СРЗНАЧ(');
  await page.locator('td[data-addr="E6"]').click();assert.equal(await input.inputValue(),'=СРЗНАЧ(E6');
  await input.fill('=D6');await page.locator('.excel-commit').click();
  assert.equal(await page.locator('td[data-addr="H6"]').innerText(),await page.locator('td[data-addr="D6"]').innerText());
  await page.locator('td[data-addr="H6"]').click();await input.fill('999');await input.press('Escape');assert.equal(await page.locator('td[data-addr="H6"]').innerText(),await page.locator('td[data-addr="D6"]').innerText(),'Escape cancels edits');
  await page.locator('td[data-addr="H6"]').click();await page.locator('#check').click();assert.equal(await input.count(),1,'Input remains attached after checking');
  await page.locator('td[data-addr="H6"]').click();await input.fill('123');await page.reload();assert.match(await page.locator('td[data-addr="H6"]').innerText(),/123/,'Unfinished edit survives reload');
  await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('#kind').selectOption('budget');await page.locator('#start').click();assert.match(await page.locator('td[data-addr="C1"]').innerText(),/Групповой код/);assert.match(await page.locator('td[data-addr="C4"]').innerText(),/(000 [12]|000 [0-9]{4}|уточнить)/);
  await page.locator('td[data-addr="F4"]').click();const budgetCell=await page.locator('td[data-addr="F4"]').boundingBox(),budgetInput=await input.boundingBox();assert(budgetInput.x>=budgetCell.x-1&&budgetInput.x+budgetInput.width<=budgetCell.x+budgetCell.width+1,'Budget editor must fit in cell');
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.locator('#kind').selectOption('financial');await page.locator('#start').click();
  await page.locator('td[data-addr="C3"]').click();const finCell=await page.locator('td[data-addr="C3"]').boundingBox(),finInput=await input.boundingBox();assert(finInput.x>=finCell.x-1&&finInput.x+finInput.width<=finCell.x+finCell.width+1,'Financial editor must fit in cell');await input.fill('=');
  await page.locator('.excel-tab').filter({hasText:'Баланс'}).click();await page.locator('td[data-addr="C3"]').click();
  assert.equal(await input.inputValue(),'=Баланс!C3');
  await page.locator('.excel-tab').filter({hasText:'ОФР'}).click();await page.reload();
  assert.equal(await input.inputValue(),'=Баланс!C3','Draft must survive switching sheets and reload');
  // Regression: a full/blocked storage backend must never be reported as an autosave success.
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.evaluate(()=>{
    const original=Storage.prototype.setItem;
    window.__originalExamSetItem=original;
    Storage.prototype.setItem=function(key,value){
      if(key==='examSheetsDraft')throw new DOMException('Storage quota exceeded','QuotaExceededError');
      return original.call(this,key,value);
    };
  });
  await page.locator('#start').click();
  assert.match(await page.locator('#task-notes').innerText(),/не удалось сохранить черновик/i,
    'Storage write errors must be visible before the user closes the application');
  assert.equal(await page.evaluate(()=>localStorage.getItem('examSheetsDraft')),null,
    'A failed save must not pretend to persist a draft');
  // The written conclusion must use the active task even when the draft cannot be stored.
  await page.locator('#written-review').waitFor({state:'visible',timeout:3000});
  await page.locator('#review-check').click();
  assert.match(await page.locator('#review-result').innerText(),/сначала напиши вывод/i,
    'Written feedback must remain available for the current unsaved task');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__originalExamSetItem;});
  await page.locator('td[data-addr="E6"]').click();
  await page.locator('.excel-input').fill('123');
  await page.locator('.excel-commit').click();
  assert.match(await page.locator('#task-notes').innerText(),/черновик сохраняется автоматически/i,
    'A successful retry must clear the save error');
  assert(await page.evaluate(()=>!!localStorage.getItem('examSheetsDraft')),
    'A successful retry must persist the active draft');
  console.log('PASS: storage failure is visible; successful retry clears warning and persists the draft');
  // Regression: written conclusions must never be silently lost when their separate storage key fails.
  await page.evaluate(()=>{
    localStorage.removeItem('exam-review-'+window.ExamCurrentTask.id);
    const original=Storage.prototype.setItem;
    window.__originalReviewSetItem=original;
    Storage.prototype.setItem=function(key,value){
      if(key.startsWith('exam-review-'))throw new DOMException('Storage quota exceeded','QuotaExceededError');
      return original.call(this,key,value);
    };
  });
  const conclusion='Проверяем ручной вывод: доходы и расходы, 2025 и 2024 годы';
  await page.locator('#review-text').fill(conclusion);
  assert.match(await page.locator('#review-save-status').innerText(),/не удалось сохранить письменный вывод/i,
    'User must see a warning when conclusion persistence fails');
  assert.equal(await page.evaluate(()=>localStorage.getItem('exam-review-'+window.ExamCurrentTask.id)),null);
  await page.evaluate(()=>{
    window.__originalReviewTask=window.ExamCurrentTask;
    window.ExamCurrentTask={...window.ExamCurrentTask,id:'test-other-review-task'};
    window.dispatchEvent(new Event('exam-restored'));
  });
  await page.evaluate(()=>{
    window.ExamCurrentTask=window.__originalReviewTask;
    window.dispatchEvent(new Event('exam-restored'));
  });
  assert.equal(await page.locator('#review-text').inputValue(),conclusion,
    'Unsaved conclusion must survive task switching within the same running application');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__originalReviewSetItem;});
  const savedConclusion=conclusion+' — исправленный и сохранённый';
  await page.locator('#review-text').fill(savedConclusion);
  assert.equal(await page.locator('#review-save-status').isVisible(),false,
    'Successful retry must remove the conclusion storage warning');
  assert.equal(await page.evaluate(()=>localStorage.getItem('exam-review-'+window.ExamCurrentTask.id)),savedConclusion);
  await page.reload();
  assert.equal(await page.locator('#review-text').inputValue(),savedConclusion,
    'Conclusion must survive application reload after successful retry');
  console.log('PASS: conclusion storage failure warning, in-memory retention and recovery after reload');
  // Opening an existing saved work must not depend on writing an auxiliary conclusion key.
  await page.getByRole('button',{name:'Сохранить эту работу'}).click();
  await page.locator('#back').click();
  await page.evaluate(()=>{
    window.__savedWorkSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key.startsWith('exam-review-'))throw new DOMException('Storage quota exceeded','QuotaExceededError');
      return window.__savedWorkSetItem.call(this,key,value);
    };
  });
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#saved-list .saved-open').first().click();
  assert.equal(await page.locator('#work').isVisible(),true,
    'Saved work must reopen even when the auxiliary conclusion key is unwritable');
  assert.equal(await page.locator('#review-text').inputValue(),savedConclusion,
    'Saved conclusion from snapshot must be presented without writable local storage');
  assert.match(await page.locator('#review-save-status').innerText(),/не удалось сохранить письменный вывод/i);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__savedWorkSetItem;});
  await page.locator('#review-text').fill(savedConclusion+' — восстановлено');
  assert.equal(await page.locator('#review-save-status').isVisible(),false);
  console.log('PASS: saved work reopens despite failed conclusion storage and recovers when writable');
  // Exam: one absolute three-hour timer shared by NMCK, Budget, Financial.
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.locator('#mode').selectOption('exam');
  assert.equal(await page.locator('#kind').isVisible(),false);
  await page.locator('#start').click();
  const beginning=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('examSheetsDraft')).session;
    return {kinds:s.tasks.map(t=>t.kind),left:s.deadline-Date.now(),deadline:s.deadline,index:s.index};
  });
  assert.deepEqual(beginning.kinds,['nmck','budget','financial']);
  assert(beginning.left>10790000&&beginning.left<=10800000,'Exam timer must be three hours total');
  assert.equal(beginning.index,0);
  assert.match(await page.locator('.session-status').innerText(),/02:59:|03:00:00/);
  await page.locator('#check').click();
  await page.getByRole('button',{name:'Следующее задание'}).click();
  const second=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('examSheetsDraft')).session;
    return {index:s.index,deadline:s.deadline,kind:window.ExamCurrentTask.kind};
  });
  assert.equal(second.index,1);assert.equal(second.kind,'budget');
  assert.equal(second.deadline,beginning.deadline,'Next exercise must not reset time');
  await page.locator('#back').click();
  assert.equal(await page.getByRole('button',{name:'Продолжить экзамен'}).isVisible(),true);
  await page.getByRole('button',{name:'Продолжить экзамен'}).click();
  await page.reload();
  const resumed=await page.evaluate(()=>JSON.parse(localStorage.getItem('examSheetsDraft')).session);
  assert.equal(resumed.deadline,beginning.deadline,'Restart must not reset time');
  assert.equal(resumed.index,1);
  await page.evaluate(()=>{
    const draft=JSON.parse(localStorage.getItem('examSheetsDraft'));
    draft.session.deadline=Date.now()-1000;
    localStorage.setItem('examSheetsDraft',JSON.stringify(draft));
  });
  await page.reload();
  const expired=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('examSheetsDraft')).session;
    return {finished:s.finished,timedOut:s.timedOut,
      results:s.results.map(r=>({total:r.total,passed:r.passed,notStarted:!!r.notStarted})),
      locked:document.getElementById('check').disabled,
      reviewLocked:document.getElementById('review-text').readOnly};
  });
  assert(expired.finished&&expired.timedOut,'Expired exam must end automatically');
  assert.equal(expired.results.length,3,'Unopened exercises must count in final result');
  assert(expired.results.every(r=>r.total>0),'All three exercise totals must count');
  assert.equal(expired.results[2].notStarted,true);
  assert(expired.locked&&expired.reviewLocked,'Expired exercise must be read-only');
  assert.match(await page.locator('.session-status').innerText(),/время вышло/);
  await page.reload();
  assert.equal(await page.locator('#check').isDisabled(),true,'Lockout must persist across reload');
  await page.locator('#back').click();
  assert.equal(await page.getByRole('button',{name:'Посмотреть результат экзамена'}).isVisible(),true);
  await page.locator('#mode').selectOption('learning');
  await page.locator('#start').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('examSheetsDraft')).session),null);
  assert.equal(await page.locator('.session-status').isVisible(),false);
  console.log('PASS: one 3h deadline for three tasks, step, resume, reload, expiry, frozen results, learning untimed');
  assert.deepEqual(errors,[]);
  console.log('PASS: function suggestion, same-sheet reference, save, cross-sheet reference, draft restore');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

