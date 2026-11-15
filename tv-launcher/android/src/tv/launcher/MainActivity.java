package tv.launcher;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Mostra il launcher web a tutto schermo e fa da ponte verso le app installate. */
public class MainActivity extends Activity {
    private WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xFF000000);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    /** I tasti del telecomando vanno direttamente alla pagina, senza passare dal focus della WebView. */
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        String key = null;
        switch (e.getKeyCode()) {
            case KeyEvent.KEYCODE_DPAD_LEFT: key = "ArrowLeft"; break;
            case KeyEvent.KEYCODE_DPAD_RIGHT: key = "ArrowRight"; break;
            case KeyEvent.KEYCODE_DPAD_UP: key = "ArrowUp"; break;
            case KeyEvent.KEYCODE_DPAD_DOWN: key = "ArrowDown"; break;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER: key = "Enter"; break;
            case KeyEvent.KEYCODE_BACK: key = "Escape"; break;
            default: return super.dispatchKeyEvent(e);
        }
        if (e.getAction() == KeyEvent.ACTION_DOWN) {
            web.evaluateJavascript("window.tvKey && tvKey('" + key + "')", null);
        }
        return true;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Tasto Home premuto mentre il launcher è già aperto: torna al dock
        web.evaluateJavascript("window.tvHome && tvHome()", null);
    }

    private class Bridge {
        @JavascriptInterface
        public boolean launchApp(String pkg) {
            PackageManager pm = getPackageManager();
            Intent i = pm.getLeanbackLaunchIntentForPackage(pkg);
            if (i == null) i = pm.getLaunchIntentForPackage(pkg);
            if (i == null) return false;
            try {
                startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return true;
            } catch (Exception ex) {
                return false;
            }
        }

        /** Elenco JSON [{name, pkg}] delle app avviabili installate sulla TV. */
        @JavascriptInterface
        public String getApps() {
            PackageManager pm = getPackageManager();
            JSONArray out = new JSONArray();
            Set<String> seen = new HashSet<String>();
            seen.add(getPackageName());
            String[] cats = { Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER };
            for (String cat : cats) {
                List<ResolveInfo> list = pm.queryIntentActivities(new Intent(Intent.ACTION_MAIN).addCategory(cat), 0);
                for (ResolveInfo r : list) {
                    String pkg = r.activityInfo.packageName;
                    if (!seen.add(pkg)) continue;
                    try {
                        out.put(new JSONObject().put("name", r.loadLabel(pm).toString()).put("pkg", pkg));
                    } catch (Exception ignored) { }
                }
            }
            return out.toString();
        }
    }
}
