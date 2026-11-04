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
  await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('#kind').selectOption('budget');await page.locator('#start').click();assert.match(await page.locator('td[data-addr="C1"]').innerText(),/Групповой код/);assert.match(await page.locator('td[data-addr="C4"]').innerText(),/(000 [12]|000 [0-9]{4}|уточнить)/);
  await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.locator('#kind').selectOption('financial');await page.locator('#start').click();
  await page.locator('td[data-addr="C3"]').click();await input.fill('=');
  await page.locator('.excel-tab').filter({hasText:'Баланс'}).click();await page.locator('td[data-addr="C3"]').click();
  assert.equal(await input.inputValue(),'=Баланс!C3');
  await page.locator('.excel-tab').filter({hasText:'ОФР'}).click();await page.reload();
  assert.equal(await input.inputValue(),'=Баланс!C3','Draft must survive switching sheets and reload');
  assert.deepEqual(errors,[]);
  console.log('PASS: function suggestion, same-sheet reference, save, cross-sheet reference, draft restore');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

