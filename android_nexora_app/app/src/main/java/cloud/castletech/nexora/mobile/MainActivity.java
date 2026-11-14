package cloud.castletech.nexora.mobile;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String PREFS_NAME = "NexoraMobilePrefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String KEY_ACTIVE_THEME = "active_theme";
    private static final String DEFAULT_SERVER_URL = "https://nexora.castle-tech.cloud";
    private static final int REQ_CAMERA_PERMISSION = 1001;
    private static final int REQ_FILE_CHOOSER = 1002;

    private WebView webView;
    private TextView serverStatusTv;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestCameraPermissionIfNeeded();

        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        rootLayout.setBackgroundColor(Color.parseColor("#0B132B"));

        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setPadding(24, 14, 24, 14);
        topBar.setBackgroundColor(Color.parseColor("#111827"));

        serverStatusTv = new TextView(this);
        serverStatusTv.setTextColor(Color.parseColor("#10B981"));
        serverStatusTv.setTextSize(12.0f);
        LinearLayout.LayoutParams statusParams = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f
        );
        serverStatusTv.setLayoutParams(statusParams);
        serverStatusTv.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showServerSwitchDialog();
            }
        });

        Button btnReload = new Button(this);
        btnReload.setText("Làm mới");
        btnReload.setTextSize(11.0f);
        btnReload.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                loadNexoraPortal();
            }
        });

        Button btnSwitchIp = new Button(this);
        btnSwitchIp.setText("Đổi IP/Miền");
        btnSwitchIp.setTextSize(11.0f);
        btnSwitchIp.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showServerSwitchDialog();
            }
        });

        topBar.addView(serverStatusTv);
        topBar.addView(btnReload);
        topBar.addView(btnSwitchIp);

        webView = new WebView(this);
        LinearLayout.LayoutParams webParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1.0f
        );
        webView.setLayoutParams(webParams);

        configureWebViewSettings();

        rootLayout.addView(topBar);
        rootLayout.addView(webView);
        setContentView(rootLayout);

        loadNexoraPortal();
    }

    private void requestCameraPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA_PERMISSION);
            }
        }
    }

    private String getSavedServerUrl() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String url = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL);
        if (url == null || url.trim().isEmpty()) {
            return DEFAULT_SERVER_URL;
        }
        return url.trim().replaceAll("/+$", "");
    }

    private void saveServerUrl(String url) {
        String clean = (url == null ? DEFAULT_SERVER_URL : url.trim()).replaceAll("/+$", "");
        if (clean.isEmpty()) {
            clean = DEFAULT_SERVER_URL;
        }
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_SERVER_URL, clean).apply();
        updateTopBarStatus();
    }

    private void updateTopBarStatus() {
        if (serverStatusTv != null) {
            serverStatusTv.setText("🟢 Nexora Server: " + getSavedServerUrl());
        }
    }

    private void configureWebViewSettings() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        }

        webView.addJavascriptInterface(new NexoraAndroidBridge(), "NexoraNativeBridge");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            request.grant(request.getResources());
                        }
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView wv, ValueCallback<Uri[]> filePathCb, FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = filePathCb;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                startActivityForResult(Intent.createChooser(intent, "Chọn ảnh mã QR hóa đơn"), REQ_FILE_CHOOSER);
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && request.isForMainFrame()) {
                    view.loadUrl("file:///android_asset/mobile-app.html");
                }
            }
        });
    }

    private void loadNexoraPortal() {
        updateTopBarStatus();
        Intent startIntent = getIntent();
        Uri dataUri = startIntent != null ? startIntent.getData() : null;
        String base = getSavedServerUrl();
        if (dataUri != null && dataUri.getQueryParameter("pay_token") != null) {
            String tok = dataUri.getQueryParameter("pay_token");
            webView.loadUrl(base + "/services/mobile/mobile-app.html?pay_token=" + Uri.encode(tok));
        } else {
            webView.loadUrl(base + "/services/mobile/mobile-app.html");
        }
    }

    private void showServerSwitchDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Cấu hình Máy chủ Nexora (Cloud / IP LAN)");
        final EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setText(getSavedServerUrl());
        builder.setView(input);

        builder.setPositiveButton("Lưu & Kết nối", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                saveServerUrl(input.getText().toString());
                loadNexoraPortal();
            }
        });
        builder.setNeutralButton("Dùng Cloud Mặc Định", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                saveServerUrl(DEFAULT_SERVER_URL);
                loadNexoraPortal();
            }
        });
        builder.setNegativeButton("Hủy", null);
        builder.show();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE_CHOOSER) {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null && data.getDataString() != null) {
                results = new Uri[]{Uri.parse(data.getDataString())};
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    public class NexoraAndroidBridge {
        @JavascriptInterface
        public String getServerUrl() {
            return getSavedServerUrl();
        }

        @JavascriptInterface
        public void setServerUrl(final String newUrl) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    saveServerUrl(newUrl);
                    Toast.makeText(MainActivity.this, "Đã lưu máy chủ: " + getSavedServerUrl(), Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void syncTheme(String themeId) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_ACTIVE_THEME, themeId != null ? themeId : "momo_lotus_pink").apply();
        }

        @JavascriptInterface
        public void vibrateShort() {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.vibrate(45);
                }
            } catch (Exception ignored) {
            }
        }
    }
}