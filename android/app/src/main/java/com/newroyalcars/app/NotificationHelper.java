package com.newroyalcars.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Builds the real Android notifications for new enquiries.
 *
 * The channel id/name here must stay in sync with the manifest meta-data
 * ({@code default_notification_channel_id}) so that notifications drawn by the
 * FCM SDK while the app is backgrounded land in the same branded channel.
 */
final class NotificationHelper {

    static final String CHANNEL_ID = "nrc_enquiries";
    private static final String TAG = "NRC-Notify";
    /** Brand gold, matching the website accent. */
    private static final int BRAND_COLOR = 0xFFC9A227;

    private NotificationHelper() {}

    /** Must exist before any notification is posted on Android 8+. */
    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "New Car Enquiries",
                NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Alerts when a customer submits a new enquiry on New Royal Cars.");
        channel.enableVibration(true);
        channel.setShowBadge(true);
        manager.createNotificationChannel(channel);
    }

    static boolean areNotificationsEnabled(Context context) {
        try {
            return NotificationManagerCompat.from(context).areNotificationsEnabled();
        } catch (Exception e) {
            return true;
        }
    }

    static boolean hasRuntimePermission(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return areNotificationsEnabled(context);
        }
        return context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * Posts the enquiry notification. Used when the app is in the foreground —
     * in the background the FCM SDK draws the tray notification itself from the
     * {@code notification} block, using the manifest defaults set in
     * {@code AndroidManifest.xml}.
     *
     * @param deepLink in-app path to open on tap, e.g. {@code /admin/enquiries}
     */
    static void show(Context context, String title, String body, String deepLink) {
        ensureChannel(context);
        if (!hasRuntimePermission(context)) {
            Log.i(TAG, "Notification permission not granted — skipping display.");
            return;
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra(MainActivity.EXTRA_DEEP_LINK, deepLink);

        PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                (int) (System.currentTimeMillis() % Integer.MAX_VALUE),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_nrc)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setColor(BRAND_COLOR)
                .setContentIntent(contentIntent);

        try {
            NotificationManagerCompat.from(context)
                    .notify((int) (System.currentTimeMillis() % Integer.MAX_VALUE), builder.build());
        } catch (Exception e) {
            // Never let a notification failure surface as a crash.
            Log.w(TAG, "Could not post enquiry notification", e);
        }
    }
}
