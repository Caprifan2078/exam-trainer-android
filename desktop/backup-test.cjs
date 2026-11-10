'use strict';
const assert=require('node:assert/strict');
const { _electron: electron }=require('playwright-core');
(async()=>{
 const app=await electron.launch({executablePath:require('electron'),args:['main.cjs'],timeout:60000});
 try{
  const page=await app.firstWindow({timeout:30000});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(()=>localStorage.clear());await page.reload();
  assert.equal(await page.locator('#backup-export').isVisible(),true);
  await page.locator('#start').click();
  await page.locator('td.excel-editable[data-addr]').first().click();
  await page.locator('.excel-input').fill('=1+1');
  await page.locator('.excel-commit').click();
  await page.locator('#review-text').fill('Проверка восстановления письменного вывода');
  await page.getByRole('button',{name:'Сохранить эту работу'}).click();
  const before=await page.evaluate(()=>({
   draft:localStorage.getItem('examSheetsDraft'),
   works:localStorage.getItem('examSavedWorks'),
   review:localStorage.getItem('exam-review-'+window.ExamCurrentTask.id),
   backup:window.ExamBackup.collect()}));
  assert(before.draft&&before.works&&before.review);
  assert.equal(before.backup.version,1);
  assert.equal(page.url().startsWith('file:'),true);
  const backupJSON=JSON.stringify(before.backup);
  assert.equal(await page.evaluate(x=>window.ExamBackup.validate(JSON.parse(x)).length>0,backupJSON),true);
  const invalid=await page.evaluate(()=>{
   try{window.ExamBackup.validate({format:'examtrainer-offline-backup',version:1,data:{'other-key':'abc'}});return false;}
   catch(_){return true;}
  });
  assert(invalid,'Unknown or untrusted storage keys must not be imported');
  await page.evaluate(()=>localStorage.clear());
  const beforeDialog=page.waitForEvent('dialog');
  await page.locator('#backup-file').setInputFiles({
   name:'ExamTrainer-backup.json',mimeType:'application/json',buffer:Buffer.from(backupJSON)
  });
  const dlg=await beforeDialog;assert.match(dlg.message(),/ЗАМЕНИТ текущий черновик/);await dlg.accept();
  await page.waitForFunction(()=>!!localStorage.getItem('examSheetsDraft')&&
    !!localStorage.getItem('examSavedWorks'),null,{timeout:10000});
  const recovered=await page.evaluate(()=>({
   draft:localStorage.getItem('examSheetsDraft'),
   works:localStorage.getItem('examSavedWorks'),
   review:localStorage.getItem('exam-review-'+window.ExamCurrentTask.id)
  }));
  assert.equal(recovered.draft,before.draft);
  assert.equal(recovered.works,before.works);
  assert.equal(recovered.review,before.review);
  assert.deepEqual(errors,[]);
  console.log('PASS: offline backup validates allowed keys; export snapshot; JSON import restores draft, saved work and written conclusion');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
