package com.newroyalcars.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.webkit.CookieManager;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Registers this device's FCM token with the EXISTING New Royal Cars backend.
 *
 * Security model (no separate auth system, no credentials in the APK):
 *   1. The only accepted proof of identity is the same httpOnly admin session
 *      cookie the website uses ({@code nrc_admin_session}).
 *   2. The cookie is read from the WebView's own cookie jar, which is exactly
 *      the session created by signing in to the real Admin Suite.
 *   3. Without that cookie nothing is sent — so a random visitor of the website
 *      can never end up on the notification list.
 *   4. The backend re-verifies the session server-side before storing anything.
 */
final class PushRegistrar {

    private static final String TAG = "NRC-Push";
    private static final String PREFS = "nrc_push";
    private static final String KEY_REGISTERED_TOKEN = "registered_token";
    private static final String KEY_LAST_ATTEMPT = "last_attempt_at";
    /** The session cookie issued by the existing backend (see src/lib/auth.ts). */
    private static final String SESSION_COOKIE = "nrc_admin_session";
    /** Re-registering on resume is throttled to this interval. */
    private static final long REREGISTER_INTERVAL_MS = 10 * 60 * 1000L;

    private PushRegistrar() {}

    static boolean isRegistered(Context context) {
        return prefs(context).getString(KEY_REGISTERED_TOKEN, null) != null;
    }

    static void forgetRegistration(Context context) {
        prefs(context).edit().remove(KEY_REGISTERED_TOKEN).apply();
    }

    /**
     * Called on every page load and resume: if this device was registered but
     * the admin session cookie has disappeared (the admin logged out), ask the
     * backend to drop the token so a signed-out device no longer receives
     * enquiry notifications.
     *
     * Unregistration is authenticated by TOKEN POSSESSION, not by session —
     * the cookie is already gone at this point. The token is a long random
     * FCM secret known only to this device and the backend, and the endpoint
     * only ever performs an exact-match delete of that one row.
     */
    static void reconcileSession(Context context) {
        final Context app = context.getApplicationContext();
        String token = prefs(app).getString(KEY_REGISTERED_TOKEN, null);
        if (token == null) return; // never registered — nothing to reconcile

        String cookie = null;
        try {
            cookie = CookieManager.getInstance().getCookie(AppConfig.siteOrigin(app));
        } catch (Exception ignored) {
            // fall through to the unregistration below
        }
        if (cookie != null && cookie.contains(SESSION_COOKIE)) return; // still signed in

        Log.i(TAG, "Admin session is gone — unregistering this device's push token.");
        sendUnregister(app, token);
    }

    private static void sendUnregister(final Context context, final String token) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(AppConfig.siteOrigin(context) + "/api/push/register");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15_000);
                connection.setReadTimeout(15_000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setRequestProperty("Accept", "application/json");

                JSONObject payload = new JSONObject();
                payload.put("token", token);
                payload.put("action", "unregister");

                try (OutputStream out = connection.getOutputStream()) {
                    out.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                int status = connection.getResponseCode();
                if (status >= 200 && status < 300) {
                    forgetRegistration(context);
                    Log.i(TAG, "Device token unregistered from the backend.");
                } else {
                    Log.w(TAG, "Backend rejected push unregistration: HTTP " + status);
                }
            } catch (Exception e) {
                // A failed unregistration is retried on the next resume/page load.
                Log.w(TAG, "Push unregistration request failed", e);
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    /**
     * Fetches the current FCM token and hands it to the existing backend.
     * Safe to call from anywhere, as often as needed: it no-ops when Firebase
     * is not configured, when the device is already registered, or when there
     * is no admin session yet.
     */
    static void registerIfPossible(Context context) {
        final Context app = context.getApplicationContext();

        // No google-services.json → Firebase never initialised. Degrade quietly.
        if (FirebaseApp.getApps(app).isEmpty()) {
            Log.i(TAG, "Firebase is not configured yet (google-services.json missing) — push disabled.");
            return;
        }

        SharedPreferences prefs = prefs(app);
        boolean registered = prefs.getString(KEY_REGISTERED_TOKEN, null) != null;
        long lastAttempt = prefs.getLong(KEY_LAST_ATTEMPT, 0L);
        if (registered && System.currentTimeMillis() - lastAttempt < REREGISTER_INTERVAL_MS) {
            return;
        }
        prefs.edit().putLong(KEY_LAST_ATTEMPT, System.currentTimeMillis()).apply();

        FirebaseMessaging.getInstance()
                .getToken()
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful() || task.getResult() == null) {
                        Log.w(TAG, "Could not obtain an FCM token", task.getException());
                        return;
                    }
                    send(app, task.getResult());
                });
    }

    private static void send(final Context context, final String token) {
        if (token == null || token.isEmpty()) return;

        final String origin = AppConfig.siteOrigin(context);
        final String cookie = CookieManager.getInstance().getCookie(origin);

        if (cookie == null || !cookie.contains(SESSION_COOKIE)) {
            // Not signed in to the Admin Suite on this device yet. This is the
            // gate that keeps website visitors off the notification list.
            Log.i(TAG, "No admin session on this device — push registration deferred.");
            return;
        }

        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(origin + "/api/push/register");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15_000);
                connection.setReadTimeout(15_000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Cookie", cookie);

                JSONObject payload = new JSONObject();
                payload.put("token", token);
                payload.put("platform", "android");

                try (OutputStream out = connection.getOutputStream()) {
                    out.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }

                int status = connection.getResponseCode();
                if (status >= 200 && status < 300) {
                    prefs(context).edit().putString(KEY_REGISTERED_TOKEN, token).apply();
                    Log.i(TAG, "Device token registered with the New Royal Cars backend.");
                } else {
                    Log.w(TAG, "Backend rejected push registration: HTTP " + status);
                }
            } catch (Exception e) {
                // A failed registration must never affect the app or the enquiry.
                Log.w(TAG, "Push registration request failed", e);
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
