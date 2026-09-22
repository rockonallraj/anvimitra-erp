package com.anvimitra.erp;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.util.UUID;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> fileUploadCallback;

    private final ActivityResultLauncher<Intent> fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (fileUploadCallback == null) return;
                Uri[] results = null;
                if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                    Intent data = result.getData();
                    if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                    } else if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
    );

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
            getWindow().setStatusBarColor(getColor(R.color.background));
        }

        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefreshLayout);
        progressBar = findViewById(R.id.progressBar);

        setupWebView();
        setupSwipeRefresh();
        setupBackNavigation();

        loadActiveServerUrl();
    }

    private String getServerUrl() {
        SharedPreferences prefs = getSharedPreferences("anvi_erp_native", Context.MODE_PRIVATE);
        return prefs.getString("server_url", getString(R.string.default_server_url));
    }

    private void saveServerUrl(String url) {
        if (url == null || url.trim().isEmpty()) return;
        SharedPreferences prefs = getSharedPreferences("anvi_erp_native", Context.MODE_PRIVATE);
        prefs.edit().putString("server_url", url.trim()).apply();
        webView.loadUrl(url.trim());
    }

    private void loadActiveServerUrl() {
        String targetUrl = getIntent() != null && getIntent().getDataString() != null
                ? getIntent().getDataString() : getServerUrl();
        webView.loadUrl(targetUrl);
    }

    private void showServerConfigDialog() {
        android.widget.EditText input = new android.widget.EditText(this);
        input.setText(getServerUrl());
        input.setSingleLine(true);
        input.setPadding(40, 20, 40, 20);

        new androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Anvi Mitra ERP Server")
                .setMessage("Enter the ERP server or Cloudflare URL:")
                .setView(input)
                .setPositiveButton("Connect", (dialog, which) -> {
                    String newUrl = input.getText().toString().trim();
                    if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
                        newUrl = "https://" + newUrl;
                    }
                    saveServerUrl(newUrl);
                    Toast.makeText(this, "Connecting to: " + newUrl, Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("Cancel", null)
                .setNeutralButton("Reset Default", (dialog, which) -> {
                    String defaultUrl = getString(R.string.default_server_url);
                    saveServerUrl(defaultUrl);
                    Toast.makeText(this, "Reset to default: " + defaultUrl, Toast.LENGTH_SHORT).show();
                })
                .show();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);

        if (isNetworkAvailable()) {
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        } else {
            settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        }

        webView.addJavascriptInterface(new AnviNativeBridge(this), "AnviNativeBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) return false;
                String url = request.getUrl().toString();
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return true;
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                swipeRefresh.setRefreshing(false);
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    swipeRefresh.setRefreshing(false);
                    progressBar.setVisibility(View.GONE);
                    String failedUrl = request.getUrl() != null ? request.getUrl().toString() : getServerUrl();
                    String errorHtml = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><style>"
                            + "body{font-family:system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7fb;color:#172033;padding:20px;box-sizing:border-box}"
                            + ".card{background:#fff;border-radius:20px;padding:30px;max-width:400px;width:100%;box-shadow:0 10px 30px #00000010;text-align:center;border:1px solid #e2e8f0}"
                            + ".icon{font-size:48px;margin-bottom:12px}"
                            + "h2{margin:0 0 10px;font-size:22px}"
                            + "p{color:#64748b;font-size:14px;line-height:1.5;margin:0 0 20px}"
                            + "button{width:100%;padding:12px;margin:6px 0;border-radius:10px;border:0;font-size:15px;font-weight:700;cursor:pointer}"
                            + ".btn-primary{background:#172b55;color:#fff}"
                            + ".btn-secondary{background:#f1f5f9;color:#334155;border:1px solid #cbd5e1}"
                            + ".url{word-break:break-all;font-size:12px;color:#94a3b8;margin-top:14px}"
                            + "</style></head><body><div class='card'>"
                            + "<div class='icon'>📡</div>"
                            + "<h2>Cannot Connect to Server</h2>"
                            + "<p>Make sure your internet is working or verify your ERP server address.</p>"
                            + "<button class='btn-primary' onclick='window.AnviNativeBridge && window.AnviNativeBridge.reload()'>🔄 Retry</button>"
                            + "<button class='btn-secondary' onclick='window.AnviNativeBridge && window.AnviNativeBridge.configureServer()'>⚙️ Change Server URL</button>"
                            + "<div class='url'>" + failedUrl + "</div>"
                            + "</div></body></html>";
                    view.loadDataWithBaseURL(null, errorHtml, "text/html", "UTF-8", null);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                Intent intent = fileChooserParams != null ? fileChooserParams.createIntent() : null;
                if (intent == null) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.setType("*/*");
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                }

                try {
                    fileChooserLauncher.launch(intent);
                    return true;
                } catch (Exception e) {
                    fileUploadCallback = null;
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimetype);
                String cookies = CookieManager.getInstance().getCookie(url);
                request.addRequestHeader("cookie", cookies);
                request.addRequestHeader("User-Agent", userAgent);
                request.setDescription("Downloading file from Anvi Mitra ERP...");
                String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                request.setTitle(filename);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.enqueue(request);
                    Toast.makeText(getApplicationContext(), "Downloading " + filename, Toast.LENGTH_SHORT).show();
                }
            } catch (Exception e) {
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(i);
                } catch (Exception ignored) {}
            }
        });
    }

    private void setupSwipeRefresh() {
        swipeRefresh.setColorSchemeResources(R.color.primary, R.color.accent);
        swipeRefresh.setOnRefreshListener(() -> webView.reload());
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkCapabilities capabilities = cm.getNetworkCapabilities(cm.getActiveNetwork());
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    public class AnviNativeBridge {
        private final Context context;

        public AnviNativeBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public String getDeviceKey() {
            SharedPreferences prefs = context.getSharedPreferences("anvi_erp_native", Context.MODE_PRIVATE);
            String key = prefs.getString("device_key", null);
            if (key == null) {
                key = "android-" + UUID.randomUUID();
                prefs.edit().putString("device_key", key).apply();
            }
            return key;
        }

        @JavascriptInterface
        public boolean isOnline() {
            return isNetworkAvailable();
        }

        @JavascriptInterface
        public void showToast(String message) {
            runOnUiThread(() -> Toast.makeText(context, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void configureServer() {
            runOnUiThread(() -> showServerConfigDialog());
        }

        @JavascriptInterface
        public void reload() {
            runOnUiThread(() -> {
                loadActiveServerUrl();
            });
        }

        @JavascriptInterface
        public void vibrate(int milliseconds) {
            runOnUiThread(() -> {
                try {
                    Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                    if (v != null && v.hasVibrator()) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            v.vibrate(VibrationEffect.createOneShot(milliseconds > 0 ? milliseconds : 35, VibrationEffect.DEFAULT_AMPLITUDE));
                        } else {
                            v.vibrate(milliseconds > 0 ? milliseconds : 35);
                        }
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void shareText(String title, String text) {
            runOnUiThread(() -> {
                try {
                    Intent sendIntent = new Intent();
                    sendIntent.setAction(Intent.ACTION_SEND);
                    sendIntent.putExtra(Intent.EXTRA_TEXT, text);
                    sendIntent.setType("text/plain");
                    Intent shareIntent = Intent.createChooser(sendIntent, title != null ? title : "Share via");
                    startActivity(shareIntent);
                } catch (Exception e) {
                    Toast.makeText(context, "Could not open share dialog", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public String getAppVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "1.0.0";
            }
        }
    }
}
