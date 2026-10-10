# New Royal Cars — Android app (Capacitor shell)

The APK is a thin native shell around the **existing, unchanged web application**. It is
another client of the same backend.

```
Existing Next.js web app  (unchanged, deployed)
            │
            ▼
   EXISTING backend / API  →  EXISTING database + storage
            ▲
            │  (same origin, same cookie session)
   Android Capacitor app
     • WebView loads the live site        (cap.config.ts → server.url)
     • native FCM push for new enquiries  (EnquiryMessagingService)
     • Android back button, offline screen, branded icon/splash
            │
            ▼
        NewRoyalCar.apk
```

A car added on the website appears in the app immediately and vice versa: both read and
write the same database through the same API. An enquiry submitted in the app lands in the
same **Admin → Enquiries** view as one submitted on the website.

---

## 1. Capacitor configuration

[`capacitor.config.ts`](../capacitor.config.ts)

| Setting | Value | Why |
| --- | --- | --- |
| `appId` | `com.newroyalcars.app` | Android package name |
| `appName` | `New Royal Cars` | Launcher label |
| `webDir` | `capacitor/www` | Holds only the branded "no connection" fallback |
| `server.url` | `https://new-royal-cars-car-delearship.vercel.app` | The live site — the app renders it exactly as a browser does |
| `server.allowNavigation` | the same host | In-app navigation stays on the site; other origins open in the browser |
| `android.backgroundColor` | `#050607` | No white flash before paint |

Override the target origin without editing anything:

```bash
CAPACITOR_SERVER_URL=https://your-domain.example npx cap sync android
```

The native layer reads the resolved URL back out of the generated
`assets/capacitor.config.json` ([`AppConfig.java`](app/src/main/java/com/newroyalcars/app/AppConfig.java)),
so the WebView and the push layer can never point at different origins.

Because the app loads the site from its real origin, everything behaves identically:
responsive layout, animations, navigation, admin login, car listings, enquiries, image
loading, forms, file upload/download, external links and the URL routing/refresh behaviour.

## 2. Native additions

| File | Purpose |
| --- | --- |
| [`MainActivity.java`](app/src/main/java/com/newroyalcars/app/MainActivity.java) | Back button, connection handling, notification tap routing, token registration loop |
| [`EnquiryMessagingService.java`](app/src/main/java/com/newroyalcars/app/EnquiryMessagingService.java) | `FirebaseMessagingService` — receives messages, shows notifications |
| [`NotificationHelper.java`](app/src/main/java/com/newroyalcars/app/NotificationHelper.java) | Notification channel + branded notification |
| [`PushRegistrar.java`](app/src/main/java/com/newroyalcars/app/PushRegistrar.java) | Sends the FCM token to the existing backend using the existing session cookie |
| [`AppConfig.java`](app/src/main/java/com/newroyalcars/app/AppConfig.java) | Resolves the site origin from Capacitor's generated config |
| [`tools/generate-brand-assets.py`](tools/generate-brand-assets.py) | Regenerates every icon/splash size from `brand/newroyalcars-logo.png` |

### Android back button

`onBackPressed` is intercepted and the **WebView history is popped first**, so
Car Details → back → Showroom and Admin Enquiries → back → previous admin page mirror the
browser. Only when the WebView has nothing left to pop is the press handed back to Android
(the task is backgrounded, not hard-killed).

### Connection handling

A main-frame load failure (or HTTP 5xx) swaps in the bundled, branded
[`offline.html`](../capacitor/www/offline.html) instead of a blank white screen. "Try again"
reloads the site, and the app also reloads automatically as soon as connectivity returns
(`ConnectivityManager.registerDefaultNetworkCallback`).

## 3. Firebase / FCM setup — the one manual step

The build is already complete and **compiles and installs without Firebase**. Until the four
items below are added, the app runs the full website but cannot receive push notifications.

### 3.1 Create the Firebase project

1. <https://console.firebase.google.com> → **Add project** → name it e.g. `new-royal-cars`.
2. Inside the project → **Add app** → **Android**.
3. Android package name — enter exactly: `com.newroyalcars.app`
4. Download `google-services.json`.

### 3.2 Android: `google-services.json`

Place it here (exact path):

```
android/app/google-services.json
```

Then rebuild. Capacitor's Gradle setup already applies the `com.google.gms.google-services`
plugin automatically as soon as that file exists — see the conditional at the bottom of
[`app/build.gradle`](app/build.gradle). Nothing else needs editing.

### 3.3 Backend: service-account credentials

The server needs to *send* notifications; this key must never reach the app or the browser.

1. Firebase Console → **Project settings** → **Service accounts** → **Generate new private key**.
2. Add its contents to the **server** environment (e.g. Vercel → Settings → Environment Variables):

```
FIREBASE_SERVICE_ACCOUNT = <the entire downloaded JSON, pasted verbatim>
```

(or, alternatively, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).

See [`.env.example`](../.env.example). Then redeploy the web app so the new
`/api/push/register` route and the notification sender are live.

### 3.4 Register an admin device

1. Install the APK on the phone.
2. Open the app, go to the site's **Admin Suite** and sign in.
3. Grant the "Allow notifications?" prompt.
4. The app now registers its FCM token against the existing backend. Verify with:

```sql
SELECT token, platform, email, "createdAt" FROM push_tokens ORDER BY "createdAt" DESC;
```

Repeat on any number of authorised admin devices — all of them are notified.

## 4. Backend notification flow

```
Customer submits the enquiry form  (website OR Android app — same form, same action)
        │
        ▼
Existing validation + rate limiting            (unchanged)
        │
        ▼
Prisma transaction: customer upsert + enquiry insert   (unchanged)
        │
        ▼
Enquiry is COMMITTED  ✅  — the reference id is returned to the customer
        │
        ▼
notifyAdminsOfNewEnquiry()                     src/lib/push.ts
        ├─ reads FCM service account from the server env
        ├─ loads every row in push_tokens        (authorised admin devices only)
        ├─ mints an OAuth2 token (RS256 JWT via `jose`, no new dependency)
        ├─ POST https://fcm.googleapis.com/v1/projects/<id>/messages:send
        └─ prunes tokens FCM reports as unregistered
        │
        ▼
Real Android notification on every admin device
        │
        ▼
Tap → app opens → WebView routes to /admin/enquiries (the existing auth guard decides
      what is shown, so a signed-out device is sent to the admin login)
```

**Failure isolation:** the whole dispatch runs inside `try/catch`, each device send is
wrapped in `Promise.allSettled`, and it runs strictly *after* the enquiry is committed. A
push failure can never roll back, delay or break an enquiry — worst case it is logged.

**Who gets notified:** only devices that registered while holding a valid
`nrc_admin_session`. `POST /api/push/register` re-uses the existing admin session
(`getSession()`) — it adds no new auth system — and returns `401` for anyone without a
session, so ordinary website visitors can never be added to the list.

## 5. Building the APK

Prereqs: JDK 21 (Gradle 8.14.3 does not support JDK 25), Android SDK with platform 36.

```bash
# from the repository root
npx cap sync android

cd android
JAVA_HOME=/path/to/jdk-21 ./gradlew assembleRelease bundleRelease
```

Output:

```
android/app/build/outputs/apk/release/NewRoyalCar.apk      ← direct install / testing
android/app/build/outputs/bundle/release/app-release.aab   ← Google Play upload
android/app/build/outputs/apk/debug/NewRoyalCar.apk
```

Copies of both release artifacts are kept in the repo-root `dist/` directory
(`dist/NewRoyalCar.apk` + `dist/NewRoyalCar.aab`).

Versioning lives in `app/build.gradle`: bump `versionCode` by exactly 1 for every
Play upload (Play rejects reused codes) and keep `versionName` as the user-facing
semver string (currently 1.0.0 / code 1).

Install on a phone with **Install unknown apps** enabled (USB debugging:
`adb install -r android/app/build/outputs/apk/release/NewRoyalCar.apk`).

### Signing

The release APK is signed with `android/keystore/newroyalcars-release.jks`
(alias/password `newroyalcars`, documented in `app/build.gradle`). It is a self-signed app
identity — not a backend credential — and should be kept so future builds update in place.
If it is missing, the release build still succeeds but produces an unsigned APK.

## 6. Regenerating the branding

```bash
python android/tools/generate-brand-assets.py
```

Reads `android/brand/newroyalcars-logo.png` (the uploaded logo) and rewrites every launcher
icon density, the adaptive-icon foreground, the monochrome notification icon and all splash
variants. The artwork is never redrawn: the logo's black panel is turned into transparency
via a luminance floor and the exact strokes are rescaled.

## 7. Known limitations

- Push needs a physical device or an emulator image with Google Play services; it cannot be
  verified with `wrangler`/desktop tools alone.
- Logout is handled: on every page load/resume the app checks for the session cookie and, if
  the admin signed out, calls `POST /api/push/register` with `{token, action: "unregister"}`
  so the device stops receiving enquiry notifications. That unregister call is authorised by
  possession of the FCM token (the session is already gone at that point) and can only delete
  that one exact row. Manual revocation remains possible by deleting the row from
  `push_tokens`.
- The APK has no offline copy of the site (the site is server-rendered against the shared
  Postgres database), so with no connection the app shows the branded connection screen.
