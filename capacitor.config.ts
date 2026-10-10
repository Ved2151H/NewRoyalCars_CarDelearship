import type { CapacitorConfig } from '@capacitor/cli';

/**
 * New Royal Cars — Android shell (Capacitor).
 *
 * ARCHITECTURE
 *   Existing Next.js web app (unchanged, deployed)
 *            │
 *            ▼
 *   THIS Capacitor Android app  →  android WebView loads the existing site
 *            +  native FCM push notifications
 *            │
 *            ▼
 *   NewRoyalCar.apk
 *
 * The web application is the single source of truth: the APK is just another
 * client of the ALREADY EXISTING backend/API/database/storage. Nothing is
 * duplicated and no web source is modified by this shell.
 *
 * `server.url` points the WebView straight at the deployed origin, so the
 * website renders exactly as it does in a browser — same UI, same responsive
 * layout, same pages/animations/navigation, same admin login, same car
 * listings, same enquiry system, same database and the same cookie session.
 *
 * Override the target origin at build time without editing this file:
 *   CAPACITOR_SERVER_URL=https://your-domain npx cap sync android
 */
const SERVER_URL =
  process.env.CAPACITOR_SERVER_URL?.replace(/\/+$/, '') ||
  'https://new-royal-cars-car-delearship.vercel.app';

const SERVER_HOST = (() => {
  try {
    return new URL(SERVER_URL).host;
  } catch {
    return 'new-royal-cars-car-delearship.vercel.app';
  }
})();

const config: CapacitorConfig = {
  appId: 'com.newroyalcars.app',
  appName: 'New Royal Cars',
  // Local assets (the branded "no connection" fallback). With `server.url` set
  // these are only shown when the live site cannot be reached.
  webDir: 'capacitor/www',
  android: {
    // Keep the WebView background on-brand instead of a white flash.
    backgroundColor: '#050607',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    url: SERVER_URL,
    // The deployed site is HTTPS; no cleartext traffic is permitted.
    cleartext: false,
    // In-app navigation is limited to the site itself — any other origin is
    // handed to the system browser by Capacitor.
    allowNavigation: [SERVER_HOST],
  },
};

export default config;
