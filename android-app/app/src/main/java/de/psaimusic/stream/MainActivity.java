package de.psaimusic.stream;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.util.Locale;

public class MainActivity extends Activity {
  private WebView web;
  private android.webkit.ValueCallback<Uri[]> fileCallback;
  private static final int FILE_REQ=777;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    web = new WebView(this);
    setContentView(web);
    WebSettings s=web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(true);
    s.setMediaPlaybackRequiresUserGesture(true);
    final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
      .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
    web.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest req) {
        return loader.shouldInterceptRequest(req.getUrl());
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req) {
        Uri u=req.getUrl();
        String host=u.getHost();
        if (host != null && (host.equals("appassets.androidplatform.net") || host.equals("suno.com") || host.equals("www.suno.com"))) return false;
        if ("https".equals(u.getScheme()) || "http".equals(u.getScheme())) {
          try{ startActivity(new Intent(Intent.ACTION_VIEW,u)); }catch(Exception ex){ Toast.makeText(MainActivity.this,"Kein Browser gefunden",Toast.LENGTH_SHORT).show(); }
          return true;
        }
        return false;
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onShowFileChooser(WebView v, android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params){
        if(fileCallback!=null)fileCallback.onReceiveValue(null);
        fileCallback=callback;
        try{startActivityForResult(params.createIntent(),FILE_REQ);return true;}
        catch(Exception e){fileCallback=null;return false;}
      }
    });
    web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
  }
  @Override protected void onActivityResult(int request,int result,Intent data){
    super.onActivityResult(request,result,data);
    if(request==FILE_REQ && fileCallback!=null){
      fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));
      fileCallback=null;
    }
  }
  @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
  @Override protected void onDestroy(){web.destroy();super.onDestroy();}
}
