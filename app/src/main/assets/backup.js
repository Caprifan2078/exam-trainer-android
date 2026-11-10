/* Offline user-controlled backup. Never uploads or sends data to a server. */
(function(root){'use strict';
const storagePrefix='exam-review-';
const coreKeys=['examSheetsDraft','examSavedWorks','examStats'];
const MAX_BYTES=5*1024*1024;
const RESTORE_JOURNAL='examtrainer-restore-journal-v1';
const $=id=>document.getElementById(id);
const status=$('backup-status'),picker=$('backup-file');
function managedKey(key){return coreKeys.includes(key)||/^exam-review-[a-zA-Z0-9_-]{1,128}$/.test(key);}
function setStatus(message,isError){
 status.textContent=message;status.style.color=isError?'#f5a7a7':'';
 status.setAttribute('role',isError?'alert':'status');
}
function collect(){
 const data=Object.create(null);
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);if(managedKey(key))data[key]=localStorage.getItem(key);
 }
 return {format:'examtrainer-offline-backup',version:1,createdAt:new Date().toISOString(),data};
}
function validate(payload){
 if(!payload||payload.format!=='examtrainer-offline-backup'||payload.version!==1||
    !payload.data||typeof payload.data!=='object'||Array.isArray(payload.data))
  throw Error('Это не резервная копия «Экзаменатора» версии 1.');
 const pairs=Object.entries(payload.data);
 if(pairs.length>300)throw Error('Слишком много записей в резервной копии.');
 let bytes=0;
 for(const [key,value] of pairs){
  if(!managedKey(key)||typeof value!=='string')throw Error('Недопустимая запись резервной копии.');
  bytes+=key.length+value.length;
  if(bytes>MAX_BYTES)throw Error('Резервная копия слишком большая.');
  if(key=== 'examSheetsDraft'){
   const d=JSON.parse(value);
   if(!d||!d.task||!['nmck','budget','financial'].includes(d.task.kind)||
      !Array.isArray(d.task.questions)||d.task.questions.length>2000)
    throw Error('Повреждён сохранённый черновик.');
   if(d.session&&(!Array.isArray(d.session.tasks)||d.session.tasks.length!==3||
        !Number.isFinite(d.session.deadline)))
    throw Error('Повреждена запись времени экзамена.');
  }else if(key==='examSavedWorks'){
   const a=JSON.parse(value);
   if(!Array.isArray(a)||a.length>30||a.some(x=>!x?.snapshot?.task||
      !['nmck','budget','financial'].includes(x.snapshot.task.kind)))
    throw Error('Повреждён список сохранённых работ.');
  }else if(key==='examStats'){
   const st=JSON.parse(value);if(!st||typeof st!=='object'||Array.isArray(st))
    throw Error('Повреждена статистика.');
  }else if(value.length>200000){
   throw Error('Слишком большой письменный вывод.');
  }
 }
 return pairs;
}
function currentManagedData(){
 const result=Object.create(null);
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);
  if(managedKey(key))result[key]=localStorage.getItem(key);
 }
 return result;
}
function overwriteManagedData(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||
    Object.entries(data).some(([k,v])=>!managedKey(k)||typeof v!=='string'))
  throw Error('Недопустимое содержимое восстановительного журнала.');
 const keys=[];
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);
  if(managedKey(key))keys.push(key);
 }
 for(const key of keys)localStorage.removeItem(key);
 for(const [key,value] of Object.entries(data))localStorage.setItem(key,value);
}
// Recover the last complete state if the app was force-stopped mid-import.
// The journal is not part of exported backups and is cleared only on success.
function recoverInterruptedImport(){
 let raw;
 try{raw=localStorage.getItem(RESTORE_JOURNAL);}catch(_){return;}
 if(!raw)return;
 try{
  const previous=JSON.parse(raw);
  if(raw.length>MAX_BYTES||!previous||typeof previous!=='object')
   throw Error('Журнал восстановления повреждён.');
  overwriteManagedData(previous);
  localStorage.removeItem(RESTORE_JOURNAL);
  setStatus('Прерванное восстановление отменено, прежние данные сохранены.',false);
  location.reload();
 }catch(e){
  setStatus('Обнаружено прерванное восстановление. Автоматический откат не удался: '+
    e.message+'. Не удаляй данные приложения; используй отдельный резервный файл.',true);
 }
}
recoverInterruptedImport();
function asBase64(text){
 const bytes=new TextEncoder().encode(text);
 let binary='';
 for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 return btoa(binary);
}
function downloadJson(name,json){
 const url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=name;
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
}
$('backup-export').addEventListener('click',()=>{
 try{
  const payload=collect(),json=JSON.stringify(payload);
  validate(payload);
  if(new TextEncoder().encode(json).length>MAX_BYTES)throw Error('Резервная копия больше 5 МБ.');
  const name='ExamTrainer-backup-'+new Date().toISOString().slice(0,10)+'.json';
  if(root.ExamNative&&typeof root.ExamNative.saveBackup==='function'){
   root.ExamNative.saveBackup(name,asBase64(json));
   setStatus('Открыто системное окно сохранения. Выбери папку и подтверди сохранение.',false);
  }else{
   downloadJson(name,json);
   setStatus('Загрузка резервного файла запущена. Проверь папку загрузок.',false);
  }
 }catch(e){setStatus('Не удалось подготовить копию: '+e.message,true);}
});
$('backup-import').addEventListener('click',()=>picker.click());
picker.addEventListener('change',async()=>{
 const file=picker.files&&picker.files[0];if(!file)return;
 try{
  if(file.size>MAX_BYTES)throw Error('Файл больше 5 МБ.');
  const pairs=validate(JSON.parse(await file.text()));
  if(!confirm('Восстановление ЗАМЕНИТ текущий черновик, работы и письменные выводы на данные из файла. Текущий экзамен и его время тоже будут заменены. Продолжить?'))return;
  const previous=currentManagedData();
  const journal=JSON.stringify(previous);
  if(new TextEncoder().encode(journal).length>MAX_BYTES)
   throw Error('Для безопасного восстановления недостаточно места под копию текущих данных.');
  // Must be written successfully before touching a single existing answer.
  try{localStorage.setItem(RESTORE_JOURNAL,journal);}
  catch(_){throw Error('Не удалось создать страховочную копию текущей работы. Импорт отменён без удаления данных.');}
  try{
   overwriteManagedData(Object.fromEntries(pairs));
   localStorage.removeItem(RESTORE_JOURNAL);
  }catch(e){
   let restored=false;
   try{
    overwriteManagedData(previous);
    localStorage.removeItem(RESTORE_JOURNAL);
    restored=true;
   }catch(_){}
   throw Error('Ошибка записи данных. '+(restored?
     'Предыдущее состояние восстановлено.':
     'Остался восстановительный журнал для автоматического отката при следующем запуске.')+
     ' '+e.message);
  }
  setStatus('Резервная копия восстановлена. Открываем сохранённую работу.',false);
  location.reload();
 }catch(e){setStatus('Не удалось восстановить: '+e.message,true);}
 finally{picker.value='';}
});
root.addEventListener('exam-native-save',event=>{
 const detail=event.detail||{};
 if(detail.format!=='json')return;
 const messages={
  saved:'Резервная копия действительно сохранена. Найди JSON-файл в выбранной папке.',
  cancelled:'Сохранение резервной копии отменено.',
  error:'Android не смог записать резервную копию. Выбери другую папку и повтори попытку.',
  busy:'Дождись завершения предыдущего сохранения.'
 };
 setStatus(messages[detail.status]||'Неизвестный результат сохранения.',
   detail.status==='error'||detail.status==='busy');
});
root.ExamBackup={collect,validate};
})(typeof globalThis!=='undefined'?globalThis:this);
