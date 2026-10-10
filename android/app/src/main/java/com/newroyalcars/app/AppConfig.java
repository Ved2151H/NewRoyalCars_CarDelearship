package com.newroyalcars.app;

import android.content.Context;
import android.net.Uri;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Single source of truth for the origin the WebView loads.
 *
 * Capacitor serialises the resolved {@code capacitor.config.ts} into
 * {@code assets/capacitor.config.json} on every {@code npx cap sync}, so the
 * native push layer and the WebView can never drift apart — both read the same
 * configured site URL. Nothing here is hardcoded twice.
 */
final class AppConfig {

    /** Used only if the packaged Capacitor config cannot be read. */
    static final String FALLBACK_ORIGIN = "https://new-royal-cars-car-delearship.vercel.app";

    private AppConfig() {}

    /** Scheme + authority of the configured site, e.g. {@code https://example.com}. */
    static String siteOrigin(Context context) {
        try (InputStream in = context.getAssets().open("capacitor.config.json")) {
            String json = readAll(in);
            JSONObject config = new JSONObject(json);
            JSONObject server = config.optJSONObject("server");
            String url = server == null ? "" : server.optString("url", "");
            if (url.isEmpty()) return FALLBACK_ORIGIN;

            Uri parsed = Uri.parse(url);
            String scheme = parsed.getScheme();
            String authority = parsed.getAuthority();
            if (scheme == null || authority == null) return FALLBACK_ORIGIN;
            return scheme + "://" + authority;
        } catch (Exception e) {
            return FALLBACK_ORIGIN;
        }
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int read;
        while ((read = in.read(buffer)) != -1) {
            out.write(buffer, 0, read);
        }
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }
}
