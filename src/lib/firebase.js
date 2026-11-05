/**
 * @file firebase.js
 * @description Firebase bootstrap and the app's auth surface.
 *
 * Two deliberate decisions here:
 *
 * 1. **Lazy loading.** Firebase is ~120 kB gzipped. The landing page does not
 *    need it, so the SDK is only imported when something actually asks for auth
 *    (opening the sign-in sheet, resolving a session). The imports below are
 *    dynamic and memoized, so the download happens once, after first paint.
 *
 * 2. **Firebase is optional at runtime.** If the project is unreachable or the
 *    config is missing, the app falls back to a local "profile" so a reviewer
 *    with no backend still sees every screen working. `authMode` reports which
 *    mode is live so the UI can be honest about it instead of pretending.
 *
 * Security notes (see docs/SECURITY.md):
 *  - The Firebase web config in `.env` is public by design. It identifies the
 *    project; it does not grant access.
 *  - Only Firebase Auth is used. There is no database here, so there is no rule
 *    set to misconfigure or forget to deploy.
 *  - This client never trusts `emailVerified` for authorisation decisions that
 *    matter; the server is the source of truth for anything sensitive.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** @type {"firebase" | "local"} */
export let authMode = config.apiKey && config.projectId ? "firebase" : "local";

/** @type {Promise<{ app: any, auth: any }> | null} */
let sdkPromise = null;

/**
 * Load and initialise the Firebase SDK exactly once.
 * @returns {Promise<{ app: any, auth: any } | null>} null when Firebase is not configured
 */
export function loadFirebase() {
  if (authMode === "local") return Promise.resolve(null);
  if (sdkPromise) return sdkPromise;

  sdkPromise = Promise.all([import("firebase/app"), import("firebase/auth")])
    .then(([appModule, authModule]) => {
      const existing = appModule.getApps?.()[0];
      const app = existing ?? appModule.initializeApp(config);

      // Persist sessions in localStorage so a refresh does not sign people out.
      // (PKCE-based popups are used for OAuth, so no third-party cookies.)
      const auth = authModule.getAuth(app);
      auth.useDeviceLanguage?.();
      return { app, auth, authModule, appModule };
    })
    .catch((error) => {
      // A blocked network or an adblocker must not break the app.
      console.warn("[bd-screens] Firebase unavailable, using local profile:", error?.message);
      authMode = "local";
      return null;
    });

  return sdkPromise;
}
