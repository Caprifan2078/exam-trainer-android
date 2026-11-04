const {chromium}=require('playwright-core');
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});fs.mkdirSync('qa-screens',{recursive:true});
try{for(const spec of [{name:'desktop',viewport:{width:1366,height:900}},{name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}]){
 const ctx=await browser.newContext(spec),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=pathToFileURL(path.resolve('qa_tests/current_offline.html')).href;await page.goto(url);await page.evaluate(()=>localStorage.clear());await page.reload();
 for(const [kind,addr] of [['nmck','E6'],['budget','F4'],['financial','C3']]){
  if(kind!=='nmck'){await page.locator('#back').click();await page.locator('#kind').selectOption(kind);page.once('dialog',d=>d.accept());}
  await page.locator('#start').click();const cell=page.locator('td[data-addr="'+addr+'"]'),field=page.locator('.excel-input');await cell.click();
  assert.equal(await cell.locator('.excel-input').count(),1,kind+' editor must be in the cell');
  const a=await cell.boundingBox(),b=await field.boundingBox();assert(b.x>=a.x-1&&b.x+b.width<=a.x+a.width+1,kind+' editor outside cell');
  assert.equal(await field.getAttribute('placeholder'),'');
  await page.locator('#check').click();assert.equal(await field.count(),1,kind+' editor must remain attached after check');
  await cell.click();await field.fill('123');await page.locator('.excel-commit').click();await cell.click();await field.fill('456');await field.press('Escape');
  assert.match(await cell.innerText(),/123/,kind+' Escape must cancel edits');
  await cell.click();await field.fill('321');await page.reload();
  assert.match(await cell.innerText(),/321/,kind+' draft should survive reload while typing');
  await cell.click();await field.fill('=ср');await page.locator('.formula-suggestion').filter({hasText:'СРЗНАЧ'}).first().click();assert.equal(await field.inputValue(),'=СРЗНАЧ(');await field.fill('123');await page.locator('.excel-commit').click();
  const dims=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));assert(dims.scroll<=dims.client+2,kind+' page overflows horizontally '+JSON.stringify(dims));
  await page.screenshot({path:'qa-screens/'+spec.name+'-'+kind+'.png',fullPage:true});console.log('PASS '+spec.name+' '+kind+' editing, escape, draft, check, formula suggestions and bounds');
 }
 assert.deepEqual(errors,[]);await ctx.close();
} }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
