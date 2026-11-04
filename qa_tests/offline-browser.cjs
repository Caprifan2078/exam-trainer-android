const { chromium } = require('playwright-core');
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.resolve('qa_tests/current_offline.html')).href);await page.evaluate(()=>localStorage.clear());await page.reload();
for(const kind of ['nmck','budget','financial']){if(kind!=='nmck'){page.once('dialog',d=>d.accept());await page.locator('#back').click();await page.locator('#kind').selectOption(kind);}
await page.locator('#start').click();await page.locator('.excel-grid').waitFor();assert(await page.locator('td.excel-editable').count()>0,kind);
if(kind==='nmck'){await page.locator('#review-example').click();assert.match(await page.locator('#review-result').innerText(),/статья 22 Федерального закона № 44-ФЗ/);await page.locator('td[data-addr="E6"]').click();const field=page.locator('td[data-addr="E6"] .excel-input');assert.equal(await field.count(),1);const a=await page.locator('td[data-addr="E6"]').boundingBox(),b=await field.boundingBox();assert(b.x>=a.x-1&&b.x+b.width<=a.x+a.width+1,'editor overlaps adjacent cell');assert.equal(await field.getAttribute('placeholder'),'');await field.fill('12345');await page.locator('.excel-commit').click();assert.match(await page.locator('td[data-addr="E6"]').innerText(),/12/);}
if(kind==='budget'){assert.match(await page.locator('td[data-addr="C1"]').innerText(),/Групповой код/);assert.match(await page.locator('td[data-addr="C4"]').innerText(),/(000 [12]|000 [0-9]{4}|уточнить)/);assert.match(await page.locator('td[data-addr="F1"]').innerText(),/Доход/);assert.match(await page.locator('td[data-addr="G1"]').innerText(),/Расход/);}
console.log('PASS opened and interacted with '+kind);}
assert.deepEqual(errors,[]);console.log('PASS file:// and three modules without JavaScript exceptions');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
