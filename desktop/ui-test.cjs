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
  await page.evaluate(()=>{Storage.prototype.setItem=window.__originalExamSetItem;});
  await page.locator('td[data-addr="E6"]').click();
  await page.locator('.excel-input').fill('123');
  await page.locator('.excel-commit').click();
  assert.match(await page.locator('#task-notes').innerText(),/черновик сохраняется автоматически/i,
    'A successful retry must clear the save error');
  assert(await page.evaluate(()=>!!localStorage.getItem('examSheetsDraft')),
    'A successful retry must persist the active draft');
  console.log('PASS: storage failure is visible; successful retry clears warning and persists the draft');
  assert.deepEqual(errors,[]);
  console.log('PASS: function suggestion, same-sheet reference, save, cross-sheet reference, draft restore');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

