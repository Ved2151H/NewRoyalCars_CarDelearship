package com.newroyalcars.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.WebViewListener;

/**
 * New Royal Cars — Android shell around the EXISTING web application.
 *
 * This activity deliberately does not render any UI of its own: the Capacitor
 * WebView loads the deployed website (configured in {@code capacitor.config.ts})
 * so the app shows the exact same UI, pages, animations, responsive layout,
 * login/admin flow, car listings and enquiry system as the site itself — backed
 * by the very same API, database and storage.
 *
 * Native additions on top of the unmodified website:
 *   • real Android push notifications for new enquiries (FCM)
 *   • device-token registration against the existing backend session
 *   • correct Android back-button behaviour (web history first)
 *   • a branded connection-lost screen with retry + automatic recovery
 */
public class MainActivity extends BridgeActivity {

    /** Extra carrying the in-app path a tapped notification should open. */
    public static final String EXTRA_DEEP_LINK = "nrc_deep_link";

    private static final String TAG = "NRC-App";
    private static final int REQ_POST_NOTIFICATIONS = 4301;
    /** How often to retry token registration until it succeeds. */
    private static final long PUSH_RETRY_INTERVAL_MS = 30_000L;
    /** Give the initial page load a moment before honouring a notification tap. */
    private static final long DEEP_LINK_DELAY_MS = 1_200L;
    private static final String OFFLINE_ASSET = "file:///android_asset/public/offline.html";

    private final Handler handler = new Handler(Looper.getMainLooper());

    private String siteOrigin;
    @Nullable private WebView hookedWebView;
    private boolean offlineShown;
    @Nullable private String pendingDeepLink;
    @Nullable private ConnectivityManager.NetworkCallback networkCallback;
    @Nullable private OnBackPressedCallback backCallback;
    @Nullable private Runnable pushRetryLoop;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Bridge bridge = getBridge();
        if (bridge == null) {
            // Capacitor could not create a WebView on this device.
            Log.e(TAG, "Capacitor bridge unavailable — native setup skipped.");
            return;
        }

        siteOrigin = AppConfig.siteOrigin(this);

        NotificationHelper.ensureChannel(this);
        installPageListener(bridge);
        ensureWebViewHooks();

        installBackButtonHandler();
        requestNotificationPermission();
        watchConnectivity();

        handleIntent(getIntent());
        startPushRegistration();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-arm back handling after the root back press temporarily disabled it.
        if (backCallback != null) backCallback.setEnabled(true);
        ensureWebViewHooks();
        PushRegistrar.reconcileSession(this);
        attemptPushRegistration();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent == null) return;
        setIntent(intent);
        handleIntent(intent);
    }

    @Override
    public void onDestroy() {
        if (pushRetryLoop != null) handler.removeCallbacks(pushRetryLoop);
        unwatchConnectivity();
        super.onDestroy();
    }

    /* ------------------------------------------------------------------ *
     * Android back button
     * ------------------------------------------------------------------ */

    /**
     * Back follows the website's own navigation history first, so
     * Car Details → back → Showroom and Admin Enquiries → back → previous
     * admin page behave exactly as in a browser. Only when there is nothing
     * left to pop does Android take over (backgrounding the app) instead of
     * hard-killing it.
     */
    private void installBackButtonHandler() {
        backCallback = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                Bridge bridge = getBridge();
                WebView webView = bridge == null ? null : bridge.getWebView();
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
            }
        };
        getOnBackPressedDispatcher().addCallback(this, backCallback);
    }

    /* ------------------------------------------------------------------ *
     * WebView hooks
     * ------------------------------------------------------------------ */

    private void installPageListener(Bridge bridge) {
        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                String url = webView.getUrl();
                if (url != null && url.startsWith(siteOrigin)) {
                    // The live site is back — clear the connection-lost state.
                    offlineShown = false;
                }
                deliverPendingDeepLink();
                // Sign-in/logout may have just happened on this page load:
                // drop the token if the session is gone, then try to register.
                PushRegistrar.reconcileSession(MainActivity.this);
                attemptPushRegistration();
            }
        });
    }

    /**
     * Wraps Capacitor's own {@link BridgeWebViewClient} (never replaces it) so
     * the bridge keeps working while we add main-frame failure detection.
     */
    private void ensureWebViewHooks() {
        Bridge bridge = getBridge();
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null || webView == hookedWebView) return;

        hookedWebView = webView;
        webView.setWebViewClient(new NrcWebViewClient(bridge));
        try {
            // Used by the bundled connection-lost page to ask for a retry.
            webView.addJavascriptInterface(new OfflineRetryBridge(), "NRCAndroid");
        } catch (Exception e) {
            Log.w(TAG, "Could not attach the offline retry bridge", e);
        }
    }

    private class NrcWebViewClient extends BridgeWebViewClient {

        NrcWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request != null && request.isForMainFrame()) {
                showOffline(view);
            }
        }

        @Override
        public void onReceivedHttpError(
                WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
            super.onReceivedHttpError(view, request, errorResponse);
            if (request != null
                    && request.isForMainFrame()
                    && errorResponse != null
                    && errorResponse.getStatusCode() >= 500) {
                showOffline(view);
            }
        }
    }

    private class OfflineRetryBridge {
        @JavascriptInterface
        public void retry() {
            handler.post(MainActivity.this::retrySite);
        }
    }

    /* ------------------------------------------------------------------ *
     * Connection handling
     * ------------------------------------------------------------------ */

    private void showOffline(WebView view) {
        if (offlineShown) return;
        offlineShown = true;
        Log.i(TAG, "Network failure — showing the connection screen.");
        try {
            view.loadUrl(OFFLINE_ASSET + "?site=" + Uri.encode(siteOrigin + "/"));
        } catch (Exception e) {
            Log.w(TAG, "Could not display the connection screen", e);
            offlineShown = false;
        }
    }

    private void retrySite() {
        Bridge bridge = getBridge();
        WebView webView = bridge == null ? null : bridge.getWebView();
        if (webView == null) return;
        offlineShown = false;
        webView.post(() -> {
            try {
                webView.loadUrl(siteOrigin + "/");
            } catch (Exception e) {
                Log.w(TAG, "Retry failed to start", e);
            }
        });
    }

    /** Reloads automatically when connectivity comes back while offline. */
    private void watchConnectivity() {
        try {
            ConnectivityManager manager =
                    (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (manager == null) return;
            networkCallback = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(@NonNull Network network) {
                    if (offlineShown) handler.post(MainActivity.this::retrySite);
                }
            };
            manager.registerDefaultNetworkCallback(networkCallback);
        } catch (Exception e) {
            Log.w(TAG, "Could not watch for connectivity changes", e);
        }
    }

    private void unwatchConnectivity() {
        if (networkCallback == null) return;
        try {
            ConnectivityManager manager =
                    (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (manager != null) manager.unregisterNetworkCallback(networkCallback);
        } catch (Exception e) {
            Log.w(TAG, "Could not stop watching connectivity", e);
        }
        networkCallback = null;
    }

    /* ------------------------------------------------------------------ *
     * Push notifications
     * ------------------------------------------------------------------ */

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) {
            return;
        }
        ActivityCompat.requestPermissions(
                this,
                new String[] { Manifest.permission.POST_NOTIFICATIONS },
                REQ_POST_NOTIFICATIONS);
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        if (requestCode == REQ_POST_NOTIFICATIONS) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                attemptPushRegistration();
            }
            return;
        }
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    /**
     * Keeps trying to register this device until the backend confirms it, then
     * stops. Registration itself is a no-op until an admin is signed in.
     */
    private void startPushRegistration() {
        attemptPushRegistration();
        if (pushRetryLoop != null) handler.removeCallbacks(pushRetryLoop);
        pushRetryLoop = new Runnable() {
            @Override
            public void run() {
                if (PushRegistrar.isRegistered(MainActivity.this)) return;
                attemptPushRegistration();
                handler.postDelayed(this, PUSH_RETRY_INTERVAL_MS);
            }
        };
        handler.postDelayed(pushRetryLoop, PUSH_RETRY_INTERVAL_MS);
    }

    private void attemptPushRegistration() {
        if (!NotificationHelper.hasRuntimePermission(this)) return;
        PushRegistrar.registerIfPossible(this);
    }

    /* ------------------------------------------------------------------ *
     * Notification tap → open the matching page in the web app
     * ------------------------------------------------------------------ */

    private void handleIntent(@Nullable Intent intent) {
        if (intent == null) return;
        String deepLink = firstNonEmpty(
                intent.getStringExtra(EXTRA_DEEP_LINK),
                intent.getStringExtra("deepLink"),
                intent.getStringExtra("deeplink"));
        if (deepLink == null) return;

        pendingDeepLink = absoluteUrl(deepLink);
        // Consume it so a rotation/restore cannot replay the navigation.
        intent.removeExtra(EXTRA_DEEP_LINK);
        intent.removeExtra("deepLink");
        intent.removeExtra("deeplink");

        handler.postDelayed(this::deliverPendingDeepLink, DEEP_LINK_DELAY_MS);
    }

    private void deliverPendingDeepLink() {
        final String target = pendingDeepLink;
        if (target == null) return;
        Bridge bridge = getBridge();
        WebView webView = bridge == null ? null : bridge.getWebView();
        if (webView == null) return;

        pendingDeepLink = null;
        offlineShown = false;
        webView.post(() -> {
            try {
                // Routed through the website's own URL routing, so the existing
                // auth guard decides what the user actually sees.
                webView.loadUrl(target);
            } catch (Exception e) {
                Log.w(TAG, "Could not open " + target, e);
            }
        });
    }

    private String absoluteUrl(String path) {
        if (path.startsWith("http://") || path.startsWith("https://")) return path;
        return siteOrigin + (path.startsWith("/") ? path : "/" + path);
    }

    private static String firstNonEmpty(String... candidates) {
        for (String candidate : candidates) {
            if (candidate != null && !candidate.trim().isEmpty()) return candidate;
        }
        return null;
    }
}
