const {chromium}=require('playwright-core');const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
for(const cfg of [{viewport:{width:1366,height:900}},{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]){
 const ctx=await browser.newContext(cfg),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve('qa_tests/current_offline.html')).href);
 for(const [kind,addr] of [['nmck','H6'],['budget','H4'],['financial','C3']]){
  await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('#kind').selectOption(kind);await page.locator('#mode').selectOption('exam');if(kind==='nmck')await page.locator('#offers-count').selectOption('3');await page.locator('#start').click();
  assert.match(await page.locator('.mode-status').innerText(),/Экзамен · без подсказок/);await page.locator('td[data-addr="'+addr+'"]').click();
  assert.equal(await page.locator('.excel-quick-button:visible').count(),0,'exam hides per-cell hints');assert.equal(await page.locator('button:visible').filter({hasText:'Примеры формул'}).count(),0);assert.equal(await page.locator('#review-example').isVisible(),false);
  await page.locator('.excel-input').fill('=ср');assert.equal(await page.locator('.formula-suggestion:visible').count(),0,'exam hides autocomplete');await page.locator('.excel-input').fill('123');await page.locator('#check').click();assert.match(await page.locator('#score').innerText(),/самостоятельно/);assert.equal(await page.locator('#hints-button').isVisible(),false);
  page.once('dialog',d=>d.dismiss());await page.locator('.mode-unlock').click();assert.match(await page.locator('.mode-status').innerText(),/без подсказок/);
  page.once('dialog',d=>d.accept());await page.locator('.mode-unlock').click();assert.match(await page.locator('.mode-status').innerText(),/с подсказками/);assert.match(await page.locator('#score').innerText(),/с подсказками/);assert.equal(await page.locator('#hints-button').isVisible(),true);assert.equal(await page.locator('#review-example').isVisible(),true);
  await page.reload();assert.match(await page.locator('.mode-status').innerText(),/с подсказками/);assert.equal(await page.locator('.mode-unlock').isVisible(),false);await page.locator('td[data-addr="'+addr+'"]').click();assert.equal(await page.locator('.excel-quick-button:visible').count(),1,'unlocked per-cell hint');
  await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('#kind').selectOption(kind);await page.locator('#mode').selectOption('learning');if(kind==='nmck')await page.locator('#offers-count').selectOption('3');await page.locator('#start').click();await page.locator('td[data-addr="'+addr+'"]').click();assert.match(await page.locator('.mode-status').innerText(),/Обучение/);assert.equal(await page.locator('.excel-quick-button:visible').count(),1,'learning hint');
  await page.locator('.excel-quick-button:visible').first().click();assert(await page.locator('.excel-quick-label:visible').count()>0,'hint text revealed');
  if(kind==='nmck'){await page.locator('td[data-addr="K6"]').click();await page.locator('.excel-quick-button:visible').first().click();assert.match(await page.locator('.excel-quick-label:visible').innerText(),/L6\*D6/,'calculation uses chosen offer');}
  console.log('PASS '+(cfg.isMobile?'phone':'desktop')+' '+kind+' exam, assistance, restoration and learning hints');
 }
 assert.deepEqual(errors,[]);await ctx.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
