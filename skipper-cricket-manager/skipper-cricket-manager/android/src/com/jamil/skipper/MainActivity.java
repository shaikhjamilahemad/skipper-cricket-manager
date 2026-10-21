package com.jamil.skipper;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.Charset;

/** Skipper: a full-screen WebView running the offline game in assets/www, plus a small file bridge. */
public class MainActivity extends Activity {
    private static final String TAG = "Skipper";
    private static final int REQ_EXPORT = 41;
    private static final int REQ_IMPORT = 42;
    private static final Charset UTF8 = Charset.forName("UTF-8");

    private WebView web;
    private volatile String pendingExport;
    private volatile String imported;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window win = getWindow();
        if (Build.VERSION.SDK_INT >= 21) {
            win.setStatusBarColor(Color.parseColor("#10261F"));
            win.setNavigationBarColor(Color.parseColor("#0B1D17"));
        }
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#10261F"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return url == null || !url.startsWith("file:///android_asset/");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                Log.d(TAG, m.message() + " @" + m.sourceId() + ":" + m.lineNumber());
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        setContentView(web);
        web.loadUrl("file:///android_asset/www/index.html");
    }

    @Override
    public void onBackPressed() {
        if (web == null) { super.onBackPressed(); return; }
        web.evaluateJavascript("(window.__onBack ? window.__onBack() : false)", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String v) {
                if (!"true".equals(v)) moveTaskToBack(true);
            }
        });
    }

    @Override
    protected void onPause() {
        if (web != null) web.evaluateJavascript("window.__onPause && window.__onPause()", null);
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.removeJavascriptInterface("AndroidBridge"); web.destroy(); web = null; }
        super.onDestroy();
    }

    private void callJs(final String js) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() { if (web != null) web.evaluateJavascript(js, null); }
        });
    }

    private File saveDir() {
        File d = new File(getFilesDir(), "saves");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    private static String safe(String n) {
        return n == null ? "_" : n.replaceAll("[^A-Za-z0-9_.-]", "_");
    }

    private static String readAll(InputStream in) throws java.io.IOException {
        Reader r = new InputStreamReader(in, UTF8);
        StringBuilder sb = new StringBuilder(1 << 16);
        char[] buf = new char[1 << 15];
        int n;
        while ((n = r.read(buf)) > 0) sb.append(buf, 0, n);
        r.close();
        return sb.toString();
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_EXPORT) {
            boolean ok = false;
            String text = pendingExport;
            if (res == RESULT_OK && data != null && data.getData() != null && text != null) {
                try {
                    OutputStream os = getContentResolver().openOutputStream(data.getData());
                    Writer w = new OutputStreamWriter(os, UTF8);
                    w.write(text);
                    w.close();
                    ok = true;
                } catch (Exception e) { Log.e(TAG, "export failed", e); }
            }
            pendingExport = null;
            callJs("window.__onExportDone && window.__onExportDone(" + ok + ")");
        } else if (req == REQ_IMPORT) {
            boolean ok = false;
            if (res == RESULT_OK && data != null && data.getData() != null) {
                try {
                    imported = readAll(getContentResolver().openInputStream(data.getData()));
                    ok = true;
                } catch (Exception e) { Log.e(TAG, "import failed", e); }
            }
            callJs("window.__onImportReady && window.__onImportReady(" + ok + ")");
        }
    }

    /** Methods the game calls as window.AndroidBridge.* (they run on a background thread). */
    public class Bridge {
        @JavascriptInterface
        public boolean save(String name, String data) {
            File dir = saveDir();
            File f = new File(dir, safe(name) + ".txt");
            File tmp = new File(dir, safe(name) + ".tmp");
            try {
                Writer w = new OutputStreamWriter(new FileOutputStream(tmp), UTF8);
                w.write(data == null ? "" : data);
                w.close();
                if (f.exists() && !f.delete()) return false;
                return tmp.renameTo(f);
            } catch (Exception e) {
                Log.e(TAG, "save failed", e);
                return false;
            }
        }

        @JavascriptInterface
        public String load(String name) {
            File f = new File(saveDir(), safe(name) + ".txt");
            if (!f.exists()) return "";
            try { return readAll(new FileInputStream(f)); } catch (Exception e) { Log.e(TAG, "load failed", e); return ""; }
        }

        @JavascriptInterface
        public boolean remove(String name) {
            File f = new File(saveDir(), safe(name) + ".txt");
            return !f.exists() || f.delete();
        }

        @JavascriptInterface
        public void exportFile(final String filename, final String text) {
            pendingExport = text;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("application/json");
                    i.putExtra(Intent.EXTRA_TITLE, filename);
                    try { startActivityForResult(i, REQ_EXPORT); }
                    catch (Exception e) { pendingExport = null; callJs("window.__onExportDone && window.__onExportDone(false)"); }
                }
            });
        }

        @JavascriptInterface
        public void importFile() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    try { startActivityForResult(i, REQ_IMPORT); }
                    catch (Exception e) { callJs("window.__onImportReady && window.__onImportReady(false)"); }
                }
            });
        }

        @JavascriptInterface
        public String takeImported() {
            String s = imported;
            imported = null;
            return s == null ? "" : s;
        }

        @JavascriptInterface
        public void keepScreenOn(final boolean on) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }
    }
}
