package cloud.castletech.nexora.mobile;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Vibrator;
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
import android.widget.LinearLayout;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private static final String PREFS_NAME = "NexoraMobilePrefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String KEY_ACTIVE_THEME = "active_theme";
    private static final String KEY_LAST_NOTIF_ID = "last_notif_id";
    private static final String DEFAULT_SERVER_URL = "https://nexora.castle-tech.cloud";
    private static final String CHANNEL_ID = "nexora_lockscreen_high_channel";
    private static final int REQ_RUNTIME_PERMISSIONS = 1001;
    private static final int REQ_FILE_CHOOSER = 1002;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private Handler bgPollHandler;
    private Runnable bgPollRunnable;
    private int notificationSeq = 2000;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createLockScreenNotificationChannel();
        requestRuntimePermissionsIfNeeded();

        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        rootLayout.setBackgroundColor(Color.parseColor("#052E16"));

        webView = new WebView(this);
        LinearLayout.LayoutParams webParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        webView.setLayoutParams(webParams);

        configureWebViewSettings();
        rootLayout.addView(webView);
        setContentView(rootLayout);

        loadNexoraPortal(getIntent());
        startBackgroundNotificationPoller();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && intent.getStringExtra("target_url") != null) {
            String tUrl = intent.getStringExtra("target_url");
            if (tUrl.startsWith("http://") || tUrl.startsWith("https://")) {
                webView.loadUrl(tUrl);
            } else {
                webView.loadUrl(getSavedServerUrl() + (tUrl.startsWith("/") ? tUrl : "/" + tUrl));
            }
        }
    }

    private void createLockScreenNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Thông Báo Khẩn & Biến Động Số Dư Nexora",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Hiển thị thông báo giảm giá, cập nhật điều khoản, Smart OTP và biến động số dư trên Màn Hình Khóa");
                channel.enableLights(true);
                channel.setLightColor(Color.parseColor("#10B981"));
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 250, 120, 250});
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                nm.createNotificationChannel(channel);
            }
        }
    }

    private void requestRuntimePermissionsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (Build.VERSION.SDK_INT >= 33) {
                if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED
                        || checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{
                            Manifest.permission.CAMERA,
                            "android.permission.POST_NOTIFICATIONS"
                    }, REQ_RUNTIME_PERMISSIONS);
                }
            } else {
                if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_RUNTIME_PERMISSIONS);
                }
            }
        }
    }

    public void showSystemLockScreenNotification(String title, String body, String targetUrl) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            Intent openIntent = new Intent(this, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            if (targetUrl != null && !targetUrl.isEmpty()) {
                openIntent.putExtra("target_url", targetUrl);
            }
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            int id = ++notificationSeq;
            PendingIntent pi = PendingIntent.getActivity(this, id, openIntent, flags);

            Notification.Builder builder;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder = new Notification.Builder(this, CHANNEL_ID);
            } else {
                builder = new Notification.Builder(this);
                builder.setPriority(Notification.PRIORITY_MAX);
                builder.setDefaults(Notification.DEFAULT_ALL);
            }

            builder.setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title != null ? title : "Nexora Super-App")
                    .setContentText(body != null ? body : "Bạn có thông báo mới trên Nexora Mobile")
                    .setStyle(new Notification.BigTextStyle().bigText(body != null ? body : ""))
                    .setAutoCancel(true)
                    .setContentIntent(pi);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                builder.setVisibility(Notification.VISIBILITY_PUBLIC);
                builder.setColor(Color.parseColor("#059669"));
            }

            nm.notify(id, builder.build());

            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                v.vibrate(180);
            }
        } catch (Exception ignored) {
        }
    }

    private void startBackgroundNotificationPoller() {
        bgPollHandler = new Handler(Looper.getMainLooper());
        bgPollRunnable = new Runnable() {
            @Override
            public void run() {
                new Thread(new Runnable() {
                    @Override
                    public void run() {
                        pollServerUnreadNotificationsOnce();
                    }
                }).start();
                if (bgPollHandler != null) {
                    bgPollHandler.postDelayed(this, 20000);
                }
            }
        };
        bgPollHandler.postDelayed(bgPollRunnable, 12000);
    }

    private void pollServerUnreadNotificationsOnce() {
        HttpURLConnection conn = null;
        try {
            String apiUrl = getSavedServerUrl() + "/api/mobile/notifications?unread_only=1&mark_polled=1&_t=" + System.currentTimeMillis();
            URL url = new URL(apiUrl);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);
            int code = conn.getResponseCode();
            if (code == 200) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line);
                }
                br.close();

                JSONObject json = new JSONObject(sb.toString());
                if (json.optBoolean("ok", false)) {
                    JSONArray arr = json.optJSONArray("notifications");
                    if (arr != null && arr.length() > 0) {
                        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                        int lastId = prefs.getInt(KEY_LAST_NOTIF_ID, 0);
                        int maxId = lastId;
                        for (int i = 0; i < arr.length(); i++) {
                            JSONObject n = arr.getJSONObject(i);
                            int nid = n.optInt("id", 0);
                            if (nid > lastId) {
                                final String t = n.optString("title", "Thông báo mới từ Nexora");
                                final String m = n.optString("message", "");
                                final String u = n.optString("target_url", "/services/mobile/mobile-app.html");
                                if (nid > maxId) maxId = nid;
                                runOnUiThread(new Runnable() {
                                    @Override
                                    public void run() {
                                        showSystemLockScreenNotification(t, m, u);
                                    }
                                });
                            }
                        }
                        if (maxId > lastId) {
                            prefs.edit().putInt(KEY_LAST_NOTIF_ID, maxId).apply();
                        }
                    }
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (conn != null) {
                conn.disconnect();
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

    private void loadNexoraPortal(Intent startIntent) {
        Uri dataUri = startIntent != null ? startIntent.getData() : null;
        String base = getSavedServerUrl();
        if (startIntent != null && startIntent.getStringExtra("target_url") != null) {
            String target = startIntent.getStringExtra("target_url");
            webView.loadUrl(base + (target.startsWith("/") ? target : "/" + target));
        } else if (dataUri != null && dataUri.getQueryParameter("pay_token") != null) {
            String tok = dataUri.getQueryParameter("pay_token");
            webView.loadUrl(base + "/services/mobile/mobile-app.html?pay_token=" + Uri.encode(tok));
        } else {
            webView.loadUrl(base + "/services/mobile/mobile-app.html");
        }
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
            prefs.edit().putString(KEY_ACTIVE_THEME, themeId != null ? themeId : "emerald_fintech_light").apply();
        }

        @JavascriptInterface
        public void pushLockScreenNotification(final String title, final String message, final String targetUrl) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    showSystemLockScreenNotification(title, message, targetUrl);
                }
            });
        }

        @JavascriptInterface
        public void vibrateShort() {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.vibrate(65);
                }
            } catch (Exception ignored) {
            }
        }
    }
}