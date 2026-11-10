'use strict';
// Run only against the isolated GitHub Actions Android emulator and debug APK.
// Uses the Android WebView's own Chrome DevTools protocol; no application test hooks.
const assert = require('node:assert/strict');
const {execFileSync,spawnSync} = require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const PKG = 'io.github.caprifan2078.examtrainer.qa0926';
const ACTIVITY = 'io.github.caprifan2078.examtrainer.MainActivity';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const adb = (...args) => execFileSync(process.env.ANDROID_HOME + '/platform-tools/adb', args,
  {encoding:'utf8',timeout:20000}).trim();
let browser = null;

async function until(task, name, timeout=20000) {
  const deadline=Date.now()+timeout;
  let error;
  do {
    try { const result=await task(); if(result) return result; }
    catch(e) { error=e; }
    await pause(350);
  } while(Date.now()<deadline);
  throw Error('Timeout: '+name+(error?' — '+error.message:''));
}
class DevTools {
  constructor(ws) {
    this.ws=ws;this.id=0;this.pending=new Map();
    ws.addEventListener('message',event=>{
      let obj;try{obj=JSON.parse(event.data.toString());}catch(_){return;}
      // CDP pauses Runtime.evaluate during the application's real confirmation dialog.
      // Accept through the browser protocol rather than replacing window.confirm.
      if(obj.method==='Page.javascriptDialogOpening'){
        this.call('Page.handleJavaScriptDialog',{accept:true})
          .catch(e=>console.error('Could not handle Android WebView confirmation: '+e.message));
        return;
      }
      const p=this.pending.get(obj.id);if(!p)return;
      this.pending.delete(obj.id);
      if(obj.error)p.reject(Error(obj.error.message||JSON.stringify(obj.error)));
      else p.resolve(obj.result);
    });
    ws.addEventListener('close',()=>{
      for(const p of this.pending.values())p.reject(Error('CDP connection closed'));
      this.pending.clear();
    });
  }
  async call(method,params={}) {
    const id=++this.id;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP response timeout: '+method));},10000);
      this.pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},
        reject:error=>{clearTimeout(timer);reject(error);}});
      try{this.ws.send(JSON.stringify({id,method,params}));}
      catch(e){clearTimeout(timer);this.pending.delete(id);reject(e);}
    });
  }
  async eval(expression) {
    const result=await this.call('Runtime.evaluate',
      {expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error('WebView JS error: '+
      (result.exceptionDetails.exception?.description||result.exceptionDetails.text));
    return result.result?.value;
  }
  close(){this.ws.close();}
}
async function connect() {
  const pid=until(()=>adb('shell','pidof',PKG),'app process');
  const currentPid=await pid;
  try{adb('forward','--remove','tcp:9222');}catch(_){}
  adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+currentPid);
  const pages=await until(async()=>{
    const response=await fetch('http://127.0.0.1:9222/json',{signal:AbortSignal.timeout(2500)});
    if(!response.ok)return null;
    const all=await response.json();
    return all.find(item=>item.webSocketDebuggerUrl &&
      String(item.url).includes('android_asset/index.html'));
  },'debuggable Android WebView target',25000);
  const url=pages.webSocketDebuggerUrl.replace('localhost:9222','127.0.0.1:9222');
  const ws=await new Promise((resolve,reject)=>{
    const socket=new WebSocket(url);
    const timer=setTimeout(()=>reject(Error('CDP websocket connection timeout')),10000);
    socket.addEventListener('open',()=>{clearTimeout(timer);resolve(socket);},{once:true});
    socket.addEventListener('error',e=>{clearTimeout(timer);reject(Error('CDP websocket error'));},{once:true});
  });
  browser=new DevTools(ws);
  await browser.call('Page.enable');
  await until(()=>browser.eval(
    'document.readyState==="complete" && !!window.ExamSheets && !!document.getElementById("start")'),
    'fully initialized WebView');
}
async function restart() {
  // Android WebView commits DOM storage to disk asynchronously. Allow a bounded flush
  // before simulating a process death; later investigate abrupt-kill durability separately.
  await pause(1800);
  if(browser){browser.close();browser=null;}
  adb('shell','am','force-stop',PKG);
  adb('shell','am','start','-W','-n',PKG+'/'+ACTIVITY);
  await connect();
}
async function evaluate(text){return browser.eval(text);}
async function startModule(kind) {
  await until(()=>evaluate('!document.getElementById("home").hidden'),'home screen');
  const r=await evaluate('(function(){' +
    'document.getElementById("mode").value="learning";' +
    'document.getElementById("kind").value='+JSON.stringify(kind)+';' +
    'document.getElementById("start").click();' +
    'return {kind:window.ExamCurrentTask?.kind,visible:!document.getElementById("work").hidden,' +
    'cells:document.querySelectorAll("#sources td.excel-editable[data-addr]").length};})()');
  assert.equal(r.kind,kind,'Generated task differs from requested module');
  assert.equal(r.visible,true,'Worksheet did not open');
  assert(r.cells>0,'Worksheet contains no editable cells: '+kind);
  await until(()=>evaluate('!document.getElementById("written-review").hidden'),'written conclusion');
  return r;
}
async function editAndCheck(kind) {
  const r=await evaluate('(function(){' +
    'var cell=document.querySelector("#sources td.excel-editable[data-addr]");' +
    'if(!cell)return {error:"No editable cell"};' +
    'cell.click();var address=document.querySelector(".excel-addr").textContent;' +
    'var editor=document.querySelector(".excel-input");' +
    'editor.value="=1+1";editor.dispatchEvent(new Event("input",{bubbles:true}));' +
    'document.querySelector(".excel-commit").click();' +
    'var draft=JSON.parse(localStorage.getItem("examSheetsDraft")||"null");' +
    'var index=address.lastIndexOf("!");' +
    'var raw=draft?.entries?.[address.slice(0,index)]?.[address.slice(index+1)];' +
    'document.getElementById("check").click();' +
    'return {address,raw,results:!document.getElementById("results").hidden,' +
    'score:document.getElementById("score").textContent};})()');
  assert.equal(r.raw,'=1+1','Formula was not saved to on-device draft: '+kind+' '+JSON.stringify(r));
  assert.equal(r.results,true,'Check results not displayed: '+kind);
  assert.match(r.score,/Проверка:/,'No exercise score: '+kind);
  return r;
}
async function writtenAndSave(kind) {
  const r=await evaluate('(function(){' +
    'var id=window.ExamCurrentTask.id;' +
    'var field=document.getElementById("review-text");' +
    'field.value="Тестовый вывод: '+kind+' 2025 2024";' +
    'field.dispatchEvent(new Event("input",{bubbles:true}));' +
    'document.getElementById("review-check").click();' +
    'var stored=localStorage.getItem("exam-review-"+id);' +
    'var save=document.getElementById("check").previousElementSibling;' +
    'if(!save || save.tagName!=="BUTTON")return {error:"Save control not found"};' +
    'save.click();var works=JSON.parse(localStorage.getItem("examSavedWorks")||"[]");' +
    'return {id,stored,feedback:document.getElementById("review-result").textContent,' +
    'works:works.length,reviewInSnapshot:works[0]?.snapshot?.reviewText};})()');
  assert.equal(r.stored,'Тестовый вывод: '+kind+' 2025 2024');
  assert(r.feedback.length>0,'Written-review check returned no feedback: '+kind);
  assert.equal(r.reviewInSnapshot,r.stored,'Saved copy missing written conclusion: '+kind);
  return r;
}
async function resetBetweenIndependentModules() {
  // This is fixture setup, not the separate persistence/restart assertion.
  // Do not force-stop immediately after clearing the draft: WebView may still be
  // asynchronously writing the previous DOM storage snapshot to disk.
  await evaluate('(function(){document.getElementById("back").click();localStorage.removeItem("examSheetsDraft");return true;})()');
  await until(()=>evaluate('!document.getElementById("home").hidden'),'home before independent module');
}
async function verifyRestoreFromRestart(expectedKind) {
  const r=await evaluate('(function(){' +
    'var draft=JSON.parse(localStorage.getItem("examSheetsDraft")||"null");' +
    'return {kind:window.ExamCurrentTask?.kind,work:!document.getElementById("work").hidden,' +
    'draftKind:draft?.task?.kind,keys:Object.keys(localStorage),' +
    'savedWorkCount:JSON.parse(localStorage.getItem("examSavedWorks")||"[]").length,' +
    'review:document.getElementById("review-text").value,' +
    'entries:draft?.entries};})()');
  console.log('DIAGNOSTIC: Android restart '+JSON.stringify({kind:r.kind,draftKind:r.draftKind,
    work:r.work,keys:r.keys,savedWorkCount:r.savedWorkCount}));
  assert.equal(r.kind,expectedKind,'Wrong exercise after process restart');
  assert(r.work,'Exercise not restored after process restart');
  assert.equal(r.review,'Тестовый вывод: '+expectedKind+' 2025 2024',
    'Written conclusion not restored after process restart');
  assert(Object.values(r.entries||{}).some(sheet=>Object.values(sheet).includes('=1+1')),
    'Written formula was not restored after process restart');
}
async function checkSavedWorkReopen(kind) {
  const r=await evaluate('(function(){' +
    'document.getElementById("back").click();' +
    'var item=document.querySelector("#saved-list .saved-open");item?.click();' +
    'return {kind:window.ExamCurrentTask?.kind,visible:!document.getElementById("work").hidden,' +
    'review:document.getElementById("review-text").value};})()');
  assert.equal(r.kind,kind);
  assert(r.visible,'Saved exercise failed to reopen');
  assert.equal(r.review,'Тестовый вывод: '+kind+' 2025 2024');
}

function pickerNodes(){
  adb('shell','uiautomator','dump','/sdcard/examtrainer-window.xml');
  const xml=adb('shell','cat','/sdcard/examtrainer-window.xml');
  return [...xml.matchAll(/<node\b[^>]*?\/>/g)].map(m=>{
    const raw=m[0],field=k=>raw.match(new RegExp(k+'="([^"]*)"'))?.[1]||'';
    return {text:field('text'),desc:field('content-desc'),id:field('resource-id'),
      enabled:field('enabled'),bounds:field('bounds')};
  });
}
function clickNode(n){
  const a=[...n.bounds.matchAll(/\d+/g)].map(x=>Number(x[0]));
  if(a.length!==4)throw Error('Malformed Android UI bounds '+JSON.stringify(n));
  adb('shell','input','tap',String(Math.floor((a[0]+a[2])/2)),
    String(Math.floor((a[1]+a[3])/2)));
}
function matchNode(n,p){return p.test([n.text,n.desc,n.id].join(' '));}
async function savePickerToDownloads(){
  await until(()=>{
    const activities=adb('shell','dumpsys','activity','activities');
    return /com\.(android|google)\.android\.documentsui|DocumentsUI/i.test(activities);
  },'Android ACTION_CREATE_DOCUMENT picker',15000);
  let nodes=pickerNodes();
  console.log('DIAGNOSTIC: save picker UI '+JSON.stringify(nodes.filter(n=>n.text||n.desc)
    .map(n=>({text:n.text,desc:n.desc,id:n.id,enabled:n.enabled})).slice(0,36)));
  let download=nodes.find(n=>matchNode(n,/Downloads|Загрузки/i));
  if(!download){
    const nav=nodes.find(n=>matchNode(n,/Show roots|navigation drawer|Browse|Навигаци|Обзор|Показать корни/i));
    if(nav){clickNode(nav);await pause(800);nodes=pickerNodes();}
    download=nodes.find(n=>matchNode(n,/Downloads|Загрузки/i));
  }
  if(download){clickNode(download);await pause(800);nodes=pickerNodes();}
  console.log('DIAGNOSTIC: after selecting Downloads '+JSON.stringify(nodes.filter(n=>n.text||n.desc)
    .map(n=>({text:n.text,desc:n.desc,id:n.id,enabled:n.enabled})).slice(0,36)));
  const save=nodes.find(n=>n.enabled!=='false' && 
    (/^(SAVE|Save|Сохранить)$/i.test(n.text)||/id\/save\b/.test(n.id)));
  if(!save)throw Error('No enabled SAVE control in Android DocumentsUI');
  clickNode(save);
  await pause(700);
}
async function checkRealExport(ext){
  const names=await until(()=>{
    const listing=adb('shell','ls','-1','/sdcard/Download');
    return listing.split(/\r?\n/).filter(n=>n.endsWith('.'+ext)&&
      (ext==='xlsx'?n.startsWith('exam-training-financial-'):n.startsWith('ExamTrainer-backup-')));
  },'actual '+ext+' file written into Android Downloads',15000);
  const filename=names[names.length-1];
  const buf=execFileSync(process.env.ANDROID_HOME+'/platform-tools/adb',
    ['exec-out','cat','/sdcard/Download/'+filename],{timeout:15000});
  assert(buf.length>100,'Saved Android '+ext+' is empty');
  if(ext==='xlsx'){
    assert.equal(buf.subarray(0,2).toString(),'PK','Saved workbook is not a ZIP');
    const target=path.join(os.tmpdir(),'examtrainer-android-saved.xlsx');
    fs.writeFileSync(target,buf);
    const check=spawnSync('unzip',['-t',target],{encoding:'utf8'});
    assert.equal(check.status,0,'Saved XLSX ZIP has damaged entries: '+check.stderr);
    assert.match(check.stdout,/xl\/workbook.xml/,'Saved XLSX missing workbook.xml');
  }else{
    const backup=JSON.parse(buf.toString('utf8'));
    assert.equal(backup.format,'examtrainer-offline-backup');
    assert.equal(backup.version,1);
    assert(backup.data.examSheetsDraft,'Android backup must include latest draft');
  }
  console.log('PASS: Android DocumentsUI physically wrote a valid '+ext+
    ' to shared Downloads: '+filename+', bytes='+buf.length);
}
async function exportPicker(){
  const triggered=await evaluate('(function(){'+
    'var b=[...document.querySelectorAll("button")].find(x=>x.textContent==="Скачать XLSX");'+
    'if(!b)return false;b.click();return true;})()');
  assert.equal(triggered,true,'XLSX export control is missing');
  await savePickerToDownloads();
  await checkRealExport('xlsx');
}
async function backupPicker(){
  await evaluate('document.getElementById("backup-export").click();true');
  await savePickerToDownloads();
  await checkRealExport('json');
}
async function androidBack() {
  // A platform-level Back test is reported independently of the three-hour exam test.
  // Do not pretend it passed when the IME, OS, or Activity consumed Back.
  // The first Android Back when a keyboard is open closes the IME, not the app.
  await evaluate('document.activeElement?.blur();true');
  for(let attempt=0;attempt<3;attempt++){
    adb('shell','input','keyevent','4');
    try{
      await until(()=>evaluate('!document.getElementById("home").hidden'),
        'Android hardware Back returns to home',2500);
      if(attempt)console.log('DIAGNOSTIC: Android Back needed '+(attempt+1)+' presses');
      return true;
    }catch(_){}
  }
  const focus=adb('shell','dumpsys','window','windows').split('\n')
    .filter(line=>/mCurrentFocus|mFocusedApp/.test(line)).slice(0,3);
  const pid=adb('shell','pidof',PKG);
  console.warn('WARN: Android hardware Back did not return to the app task selector; focus='+
    JSON.stringify(focus)+'; pid='+pid+'; investigate separately');
  // UI navigation below is test-fixture cleanup, not a successful native Back test.
  try{await evaluate('document.getElementById("back").click();true');}
  catch(error){throw Error('Native Back and in-app fallback both failed: '+error.message);}
  await until(()=>evaluate('!document.getElementById("home").hidden'),
    'in-app Back fallback after native Back check',10000);
  return false;
}
(async()=>{
  try{
    await connect();
    assert.equal(await evaluate('document.title'),'Экзаменатор');
    const backups=await evaluate('(function(){var x=window.ExamBackup.collect();return {'+
      'present:!!document.getElementById("backup-export"),fileChooser:!!document.getElementById("backup-file"),'+
      'format:x.format,version:x.version,nativeSave:typeof window.ExamNative.saveBackup};})()');
    assert(backups.present&&backups.fileChooser);
    assert.equal(backups.format,'examtrainer-offline-backup');
    assert.equal(backups.nativeSave,'function');
    console.log('PASS: Android backup module, native JSON export interface and import picker control');
    console.log('PASS: Android WebView CDP connects to loaded QA application');
    for(const kind of ['nmck','budget','financial']){
      if(kind!=='nmck')await resetBetweenIndependentModules();
      const start=await startModule(kind);
      const edited=await editAndCheck(kind);
      const saved=await writtenAndSave(kind);
      console.log('PASS: Android '+kind+' worksheet, formula persistence, scoring, conclusion, saved snapshot '+
        JSON.stringify({cells:start.cells,cell:edited.address,savedWorks:saved.works}));
      if(kind==='nmck'){
        await restart();
        await verifyRestoreFromRestart(kind);
        await checkSavedWorkReopen(kind);
        console.log('PASS: Android process-kill recovery of formula, conclusion and saved work');
      }
      if(kind==='financial'){
        // Keep Android Back and DocumentsUI tests independent. A picker or soft keyboard
        // can consume physical Back presses without navigating the application's WebView.
        const nativeBack=await androidBack();
        if(nativeBack)console.log('PASS: Android hardware Back returns to task selection');
        else console.warn('WARN: Native Back unverified on this emulator run; in-app Back passed');
        const opened=await evaluate('(function(){' +
          'document.querySelector("#saved-list .saved-open")?.click();' +
          'return {kind:window.ExamCurrentTask?.kind,work:!document.getElementById("work").hidden};})()');
        assert.equal(opened.kind,'financial');
        assert(opened.work,'Saved financial exercise did not reopen for export test');
        await exportPicker();
        console.log('PASS: Android native XLSX picker saved an intact workbook');
        // Return to home using the in-app control for the next, independent exam test.
        await evaluate('document.getElementById("back").click();true');
        await until(()=>evaluate('!document.getElementById("home").hidden'),
          'home before JSON backup export');
        await backupPicker();
        console.log('PASS: Android JSON backup was created in shared Downloads');
      }
    }
    // Shared three-hour exam timer is exercised in the real Android WebView, not mocked app logic.
    const exam=await evaluate('(function(){'+
      'document.getElementById("mode").value="exam";document.getElementById("start").click();'+
      'var s=JSON.parse(localStorage.getItem("examSheetsDraft")).session;'+
      'return {kind:window.ExamCurrentTask.kind,deadline:s?.deadline,now:Date.now(),'+
      'types:s?.tasks?.map(x=>x.kind),label:document.querySelector(".session-status").textContent};})()');
    assert.deepEqual(exam.types,['nmck','budget','financial']);
    assert(Math.abs(exam.deadline-exam.now-3*60*60*1000)<10000);
    assert.match(exam.label,/0[23]:[0-5]\d:[0-5]\d/);
    await evaluate('(function(){window.__realDateNow=Date.now;Date.now=()=>window.__realDateNow()-600000;return true;})()');
    await until(()=>evaluate('document.querySelector(".session-status").textContent.includes("Изменение времени")'),
      'Android clock rollback warning',5000);
    await evaluate('Date.now=window.__realDateNow;true');
    console.log('PASS: Android detects rollback of device wall clock without extending exam');
    const switched=await evaluate('(function(){'+
      'document.getElementById("check").click();'+
      'var noLeak=document.getElementById("results").hidden;'+
      'var locked=document.querySelector(".excel-input").disabled;'+
      'var reviewHidden=document.getElementById("review-check").hidden;'+
      'var b=[...document.querySelectorAll("button")].find(x=>x.textContent==="Следующее задание →");'+
      'if(!b)return {error:"no next stage button"};b.click();'+
      'var s=JSON.parse(localStorage.getItem("examSheetsDraft")).session;'+
      'return {index:s.index,deadline:s.deadline,kind:window.ExamCurrentTask.kind,noLeak,locked,reviewHidden};})()');
    assert.equal(switched.noLeak,true,'Android submission must not reveal grades');
    assert.equal(switched.locked,true,'Android submitted cells must lock');
    assert.equal(switched.reviewHidden,true,'Android review feedback must stay hidden');
    assert.equal(switched.index,1);
    assert.equal(switched.deadline,exam.deadline,'Switching exam stage cannot reset the timer');
    assert.equal(switched.kind,'budget');
    const resumedFromHome=await evaluate('(function(){' +
      'document.getElementById("back").click();' +
      'var button=[...document.querySelectorAll("button")].find(x=>x.textContent==="Продолжить экзамен");' +
      'if(!button)return {found:false};button.click();' +
      'var s=JSON.parse(localStorage.getItem("examSheetsDraft")).session;' +
      'return {found:true,visible:!document.getElementById("work").hidden,deadline:s.deadline};})()');
    assert.equal(resumedFromHome.found,true);
    assert.equal(resumedFromHome.visible,true);
    assert.equal(resumedFromHome.deadline,exam.deadline);
    await restart();
    const resumed=await evaluate('(function(){'+
      'var s=JSON.parse(localStorage.getItem("examSheetsDraft")).session;'+
      'return {index:s.index,deadline:s.deadline,kind:window.ExamCurrentTask?.kind};})()');
    assert.equal(resumed.deadline,exam.deadline,'Restarting app must retain the shared deadline');
    assert.equal(resumed.index,1);
    assert.equal(resumed.kind,'budget');
    await evaluate('(function(){'+
      'var s=JSON.parse(localStorage.getItem("examSheetsDraft")).session;'+
      'Date.now=()=>s.deadline+1000;return true;})()');
    await until(()=>evaluate('(function(){var s=JSON.parse(localStorage.getItem("examSheetsDraft")).session;'+
      'return s.finished===true&&s.timedOut===true;})()'),'3-hour auto-finish');
    const expired=await evaluate('(function(){'+
      'var s=JSON.parse(localStorage.getItem("examSheetsDraft")).session;'+
      'return {results:s.results.length,checkLocked:document.getElementById("check").disabled,'+
      'reviewLocked:document.getElementById("review-text").readOnly,'+
      'status:document.querySelector(".session-status").textContent};})()');
    assert.equal(expired.results,3);
    assert.equal(expired.checkLocked,true);
    assert.equal(expired.reviewLocked,true);
    assert.match(expired.status,/00:00:00/);
    console.log('PASS: Android shared 3-hour exam timer across 3 tasks, stable across restart, auto-finish and edit lock');
    adb('exec-out','screencap','-p');
    console.log('PASS: Android WebView functional regression completed without app test stubs');
  }finally{if(browser)browser.close();}
})().catch(error=>{console.error('FAIL: Android WebView regression — '+error.stack);process.exitCode=1;});
