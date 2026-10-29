package io.github.caprifan2078.examtrainer;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.ViewGroup;
import java.io.OutputStream;

public final class MainActivity extends Activity {
    private static final int SAVE_XLSX = 1204;
    private WebView webView;
    private byte[] pendingFile;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(13,20,35));
        getWindow().setNavigationBarColor(Color.rgb(13,20,35));
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
             try{
               if(base64==null || base64.length()>7000000)throw new IllegalArgumentException("File too large");
               final byte[] bytes=Base64.decode(base64,Base64.DEFAULT);
               if(bytes.length<100 || bytes.length>5000000)throw new IllegalArgumentException("Bad file size");
               runOnUiThread(()->{
                 pendingFile=bytes;
                 Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                 intent.addCategory(Intent.CATEGORY_OPENABLE);
                 intent.setType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                 intent.putExtra(Intent.EXTRA_TITLE,filename!=null && filename.endsWith(".xlsx")?filename:"ExamTrainer.xlsx");
                 startActivityForResult(intent,SAVE_XLSX);
               });
             }catch(Exception e){Log.e("ExamTrainer","Could not export XLSX",e);}
           }
        },"ExamNative");
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onConsoleMessage(ConsoleMessage m){
               if(m.messageLevel()==ConsoleMessage.MessageLevel.ERROR)
                 Log.e("ExamTrainer","JS "+m.sourceId()+":"+m.lineNumber()+": "+m.message());
               return true;
            }
        });
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }
    @Override protected void onActivityResult(int req,int result,Intent data){
        super.onActivityResult(req,result,data);
        if(req==SAVE_XLSX){
          if(result==RESULT_OK && data!=null && data.getData()!=null && pendingFile!=null){
            try(OutputStream stream=getContentResolver().openOutputStream(data.getData())){
              if(stream!=null)stream.write(pendingFile);
            }catch(Exception e){Log.e("ExamTrainer","Cannot write workbook",e);}
          }
          pendingFile=null;
        }
    }
    @Override public void onBackPressed(){
        if(webView==null){super.onBackPressed();return;}
        webView.evaluateJavascript("!!document.getElementById('work')&&!document.getElementById('work').hidden",v->{
            if("true".equals(v))webView.evaluateJavascript("document.getElementById('back').click()",null);
            else finish();
        });
    }
    @Override protected void onDestroy(){
        if(webView!=null){((ViewGroup)webView.getParent()).removeView(webView);webView.destroy();webView=null;}
        pendingFile=null;super.onDestroy();
    }
}
