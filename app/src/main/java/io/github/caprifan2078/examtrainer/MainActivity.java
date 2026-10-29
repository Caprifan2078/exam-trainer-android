package io.github.caprifan2078.examtrainer;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;
import android.webkit.WebSettings;
import android.util.Log;
import android.view.ViewGroup;

public final class MainActivity extends Activity {
    private WebView webView;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(13,20,35));
        getWindow().setNavigationBarColor(Color.rgb(13,20,35));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(13,20,35));
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDefaultTextEncodingName("UTF-8");
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setAllowFileAccessFromFileURLs(false);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient(){
           @Override public boolean onConsoleMessage(ConsoleMessage m) {
             if(m.messageLevel()==ConsoleMessage.MessageLevel.ERROR)
                 Log.e("ExamTrainer","JS "+m.sourceId()+":"+m.lineNumber()+": "+m.message());
             return true;
           }
        });
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }
    @Override public void onBackPressed() {
        if(webView==null){super.onBackPressed();return;}
        webView.evaluateJavascript("!!document.getElementById('work')&&!document.getElementById('work').hidden",value->{
            if("true".equals(value))webView.evaluateJavascript("document.getElementById('back').click()",null);
            else finish();
        });
    }
    @Override protected void onDestroy() {
      if(webView!=null){((ViewGroup)webView.getParent()).removeView(webView);webView.destroy();webView=null;}
      super.onDestroy();
    }
}
