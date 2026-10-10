package com.newroyalcars.app;

import android.util.Log;

import androidx.annotation.NonNull;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Native Firebase Cloud Messaging entry point.
 *
 * Delivery matrix:
 *   • foreground  — {@link #onMessageReceived} is always called; we post the
 *                   notification ourselves so it looks identical to the
 *                   background case.
 *   • background  — the FCM SDK draws the tray notification from the
 *                   {@code notification} block using the manifest defaults
 *                   (channel + monochrome icon). The {@code data} payload is
 *                   attached to the launch intent when the user taps it.
 *   • closed      — same as background (works unless the app was force-stopped).
 */
public class EnquiryMessagingService extends FirebaseMessagingService {

    private static final String TAG = "NRC-FCM";
    private static final String DEFAULT_TITLE = "New Car Enquiry";
    private static final String DEFAULT_BODY = "A new enquiry has been submitted on New Royal Cars.";
    private static final String DEFAULT_DEEP_LINK = "/admin/enquiries";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.i(TAG, "FCM registration token refreshed.");
        // Forget the stale entry, then re-register right away when the admin
        // session cookie is still present (app backgrounded). With no session,
        // MainActivity reconciles the stored token on the next launch.
        PushRegistrar.forgetRegistration(this);
        PushRegistrar.registerIfPossible(this);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> data = message.getData();
        RemoteMessage.Notification notification = message.getNotification();

        String title = notification != null && notification.getTitle() != null
                ? notification.getTitle()
                : data.get("title");
        String body = notification != null && notification.getBody() != null
                ? notification.getBody()
                : data.get("body");
        String deepLink = firstNonEmpty(data.get("deepLink"), data.get("deeplink"), DEFAULT_DEEP_LINK);

        NotificationHelper.show(
                getApplicationContext(),
                firstNonEmpty(title, DEFAULT_TITLE),
                firstNonEmpty(body, DEFAULT_BODY),
                deepLink);
    }

    private static String firstNonEmpty(String... candidates) {
        for (String candidate : candidates) {
            if (candidate != null && !candidate.trim().isEmpty()) return candidate;
        }
        return null;
    }
}
