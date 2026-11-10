package io.github.caprifan2078.examtrainer;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.ValueCallback;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.ViewGroup;
import java.io.OutputStream;
import java.io.IOException;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final int SAVE_XLSX = 1204;
    private static final int OPEN_BACKUP = 1205;
    private WebView webView;
    private byte[] pendingFile;
    private String pendingFormat;
    private ValueCallback<Uri[]> fileChooserCallback;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(13,20,35));
        getWindow().setNavigationBarColor(Color.rgb(13,20,35));
        // CDP inspection is allowed only for debuggable QA builds, never release builds.
        if ((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        webView=new WebView(this);
        webView.setBackgroundColor(Color.rgb(13,20,35));
        WebSettings s=webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setDefaultTextEncodingName("UTF-8");
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setAllowFileAccessFromFileURLs(false);
        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new Object(){
           @JavascriptInterface public void saveXlsx(String filename, String base64){
             saveDocument(filename,base64,".xlsx",
               "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","ExamTrainer.xlsx");
           }
           @JavascriptInterface public void saveBackup(String filename, String base64){
             saveDocument(filename,base64,".json","application/json","ExamTrainer-backup.json");
           }
        },"ExamNative");
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                        FileChooserParams params){
                if(fileChooserCallback!=null)fileChooserCallback.onReceiveValue(null);
                fileChooserCallback=callback;
                try{
                    startActivityForResult(params.createIntent(),OPEN_BACKUP);
                    return true;
                }catch(Exception e){
                    Log.e("ExamTrainer","Cannot open backup file picker",e);
                    fileChooserCallback=null;callback.onReceiveValue(null);
                    return true;
                }
            }
            @Override public boolean onConsoleMessage(ConsoleMessage m){
               if(m.messageLevel()==ConsoleMessage.MessageLevel.ERROR)
                 Log.e("ExamTrainer","JS "+m.sourceId()+":"+m.lineNumber()+": "+m.message());
               return true;
            }
        });
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }
    private void saveDocument(String filename,String base64,String extension,String mime,String fallback){
        try{
            if(base64==null||base64.length()>7000000)throw new IllegalArgumentException("File too large");
            final byte[] bytes=Base64.decode(base64,Base64.DEFAULT);
            if(bytes.length<100||bytes.length>5000000)throw new IllegalArgumentException("Bad file size");
            runOnUiThread(()->{
                if(pendingFile!=null){Log.e("ExamTrainer","Another save is in progress");notifyDocumentStatus(".json".equals(extension)?"json":"xlsx","busy");return;}
                pendingFile=bytes;pendingFormat=".json".equals(extension)?"json":"xlsx";
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mime);
                intent.putExtra(Intent.EXTRA_TITLE,filename!=null&&filename.endsWith(extension)?filename:fallback);
                try{startActivityForResult(intent,SAVE_XLSX);}
                catch(Exception e){pendingFile=null;pendingFormat=null;Log.e("ExamTrainer","Cannot open save picker",e);notifyDocumentStatus(".json".equals(extension)?"json":"xlsx","error");}
            });
        }catch(Exception e){Log.e("ExamTrainer","Could not prepare document",e);}
    }
    private void notifyDocumentStatus(String format,String status){
        if(webView==null)return;
        webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('exam-native-save',{detail:{format:"+
            JSONObject.quote(format)+",status:"+JSONObject.quote(status)+"}}));",null);
    }
    @Override protected void onActivityResult(int req,int result,Intent data){
        super.onActivityResult(req,result,data);
        if(req==OPEN_BACKUP){
          if(fileChooserCallback!=null){
            fileChooserCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));
            fileChooserCallback=null;
          }
          return;
        }
        if(req==SAVE_XLSX){
          final String format=pendingFormat==null?"unknown":pendingFormat;
          String outcome="cancelled";
          try{
            if(result==RESULT_OK){
              if(data==null||data.getData()==null||pendingFile==null)
                throw new IOException("Missing document destination or data");
              try(OutputStream stream=getContentResolver().openOutputStream(data.getData(),"w")){
                if(stream==null)throw new IOException("Document provider returned null stream");
                stream.write(pendingFile);
                stream.flush();
              }
              outcome="saved";
            }
          }catch(Exception e){
            Log.e("ExamTrainer","Cannot save "+format+" to selected document",e);
            outcome="error";
          }finally{
            pendingFile=null;pendingFormat=null;
            notifyDocumentStatus(format,outcome);
          }
        }
    }
    @Override public void onBackPressed(){
        if(webView==null){super.onBackPressed();return;}
        Log.i("ExamTrainer","Native Back invoked");
        // One JS transaction rather than two asynchronous evaluations: the system
        // Back closes the keyboard first; a later Back returns to the task picker.
        webView.evaluateJavascript("(function(){var w=document.getElementById('work');"+
          "var b=document.getElementById('back');if(w&&!w.hidden&&b){b.click();return true;}"+
          "return false;})()",v->{if(!"true".equals(v))finish();});
    }
    @Override protected void onDestroy(){
        if(webView!=null){((ViewGroup)webView.getParent()).removeView(webView);webView.destroy();webView=null;}
        if(fileChooserCallback!=null){fileChooserCallback.onReceiveValue(null);fileChooserCallback=null;}
        pendingFile=null;super.onDestroy();
    }
}
