package de.psmusicstream.listener;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.graphics.Color;
import android.view.Window;
public class MainActivity extends Activity {
 private WebView web;
 private static final String HOME="https://gmd-pforte.github.io/PS-Media-Player-/";
 @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(Color.rgb(9,11,19));getWindow().setNavigationBarColor(Color.rgb(9,11,19));web=new WebView(this);setContentView(web);WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setMediaPlaybackRequiresUserGesture(true);web.setWebChromeClient(new WebChromeClient());web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView view,android.webkit.WebResourceRequest req){String url=req.getUrl().toString();if(url.startsWith(HOME)&&!url.contains("artist.html")&&!url.contains("ps-admin.html")&&!url.contains("admin-register.html"))return false;try{startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,req.getUrl()));}catch(Exception ignored){}return true;}});web.loadUrl(HOME);}
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}