'use strict';
const {app,BrowserWindow}=require('electron');
const path=require('node:path');
function createWindow(){
 const win=new BrowserWindow({width:1280,height:850,minWidth:700,minHeight:500,title:'Экзаменатор 0.9.20 QA',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 const assets=app.isPackaged?path.join(process.resourcesPath,'assets'):path.join(__dirname,'..','app','src','main','assets');
 win.loadFile(path.join(assets,'index.html'));
}
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});

