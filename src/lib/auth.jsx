/**
 * @file auth.jsx
 * @description Session + profile context.
 *
 * The shape deliberately mirrors what the app needs, not what Firebase returns:
 * `{ status, user, profile, signIn, signUp, signInWithGoogle, signOut, ... }`.
 * Swapping the identity provider later means editing this file only.
 *
 * **Verification gate.** Firebase lets an unverified session exist — indeed it
 * creates one on signup, because the user has to be "signed in" to request a
 * verification email. Treating that session as a real sign-in is the bug this
 * file is written around. An unverified account is mapped to `status:
 * "unverified"`, gets a profile only for identity display, and no screen
 * requiring an account is reachable. The provider of last resort is checked on
 * mount, on every auth event, and on `refreshUser()` after a verification link
 * is opened in another tab.
 *
 * Local mode: when Firebase is not configured or unreachable, accounts are
 * created in localStorage. That is clearly labelled in the UI ("demo profile")
 * — it is a portfolio requirement (a reviewer must be able to click through),
 * not a security feature.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { authMode as initialMode, loadFirebase } from "./firebase.js";
import {
  changePassword,
  confirmPassword,
  deleteAccount,
  hasPasswordProvider,
  providerLabel,
  refreshVerification,
  requestEmailChange,
  sendVerification,
  updateDisplayName,
} from "./auth-profile.js";
import { readJSON, writeJSON, KEYS } from "./storage.js";
// Re-exported so callers keep one obvious import for auth concerns, while the
// implementations live in a plain module (React Fast Refresh requirement).
export { authErrorMessage, passwordStrength } from "./auth-utils.js";

/**
 * @typedef {{
 *   uid: string,
 *   name: string,
 *   email: string,
 *   photo: string | null,
 *   verified: boolean,
 *   provider: string,
 *   hasPassword: boolean,
 *   createdAt: number | null,
 * }} Profile
 */

/** @type {import("react").Context<any>} */
const AuthContext = createContext(null);

/** @param {any} firebaseUser @returns {Profile} */
function toProfile(firebaseUser) {
  return {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Viewer",
    email: firebaseUser.email ?? "",
    photo: firebaseUser.photoURL ?? null,
    verified: Boolean(firebaseUser.emailVerified),
    provider: providerLabel(firebaseUser),
    hasPassword: hasPasswordProvider(firebaseUser),
    createdAt: firebaseUser.metadata?.creationTime
      ? Date.parse(firebaseUser.metadata.creationTime)
      : null,
  };
}

/**
 * One place that decides whether a Firebase session is *usable*.
 *
 * `signed-in` requires a verified address. Anything else is `unverified`: the
 * user can see who they are and ask for a new link, and nothing more.
 * @param {any} firebaseUser
 */
function statusFor(firebaseUser) {
  if (!firebaseUser) return /** @type {"signed-out"} */ ("signed-out");
  return firebaseUser.emailVerified
    ? /** @type {"signed-in"} */ ("signed-in")
    : /** @type {"unverified"} */ ("unverified");
}

export function AuthProvider({ children }) {
  const [mode, setMode] = useState(initialMode);
  const [status, setStatus] = useState(
    /** @type {"loading"|"signed-in"|"signed-out"|"unverified"} */ ("loading"),
  );
  /** @type {[Profile | null, Function]} */
  const [profile, setProfile] = useState(null);
  const [notice, setNotice] = useState(/** @type {string | null} */ (null));
  const sdkRef = useRef(/** @type {any} */ (null));

  /* Restore a local-mode session on first mount. */
  useEffect(() => {
    const local = readJSON(KEYS.guestProfile, null);
    setProfile(local);
    setStatus(local ? "signed-in" : "signed-out");
  }, []);

  /* Subscribe to Firebase auth if it is available. */
  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    loadFirebase().then((sdk) => {
      if (!sdk || cancelled) {
        setMode("local");
        return;
      }
      sdkRef.current = sdk;
      setMode("firebase");

      const { onAuthStateChanged } = sdk.authModule;
      unsubscribe = onAuthStateChanged(sdk.auth, (user) => {
        if (cancelled) return;
        setProfile(user ? toProfile(user) : null);
        setStatus(statusFor(user));
        setNotice(null);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  /** Local profiles keep the same shape, so screens never branch on mode. */
  const localProfile = useCallback(
    (
      /** @type {{ name: string, email: string, photo?: string | null, uid?: string }} */ seed,
    ) =>
      /** @type {Profile} */ ({
        uid: seed.uid ?? `local-${Date.now().toString(36)}`,
        name: seed.name,
        email: seed.email,
        photo: seed.photo ?? null,
        verified: true,
        provider: "Local demo profile",
        hasPassword: true,
        createdAt: Date.now(),
      }),
    [],
  );

  const persistLocal = useCallback((/** @type {Profile} */ next) => {
    writeJSON(KEYS.guestProfile, next);
    setProfile(next);
    setStatus("signed-in");
  }, []);

  const signIn = useCallback(
    async (/** @type {string} */ email, /** @type {string} */ password) => {
      const sdk = sdkRef.current;
      if (!sdk) {
        // Local mode: accept any well-formed input and create the profile.
        persistLocal(
          localProfile({
            uid: `local-${btoa(email)
              .replace(/[^a-z0-9]/gi, "")
              .slice(0, 10)}`,
            name: email.split("@")[0],
            email,
          }),
        );
        return;
      }
      const { signInWithEmailAndPassword } = sdk.authModule;
      const credential = await signInWithEmailAndPassword(sdk.auth, email, password);

      /*
       * The credential exists, but an unverified address is not a sign-in. The
       * caller needs to distinguish these three outcomes to send the user to the
       * right screen, so the status is returned, not just stored.
       */
      return { user: credential.user, status: statusFor(credential.user) };
    },
    [persistLocal, localProfile],
  );

  const signUp = useCallback(
    async (
      /** @type {string} */ name,
      /** @type {string} */ email,
      /** @type {string} */ password,
    ) => {
      const sdk = sdkRef.current;
      if (!sdk) {
        persistLocal(localProfile({ name, email }));
        return { verificationSent: false, mode: "local" };
      }

      const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } =
        sdk.authModule;
      const credential = await createUserWithEmailAndPassword(sdk.auth, email, password);

      // displayName is cosmetic; failure must not block signup.
      await updateProfile(credential.user, { displayName: name }).catch(() => {});
      const verificationSent = await sendEmailVerification(credential.user)
        .then(() => true)
        .catch(() => false);

      return {
        verificationSent,
        mode: "firebase",
        status: statusFor(credential.user),
        email: credential.user.email ?? email,
      };
    },
    [persistLocal, localProfile],
  );

  const signInWithGoogle = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk) {
      persistLocal(localProfile({ name: "Google Viewer", email: "viewer@example.com" }));
      return;
    }
    const { GoogleAuthProvider, signInWithPopup } = sdk.authModule;
    const provider = new GoogleAuthProvider();
    // Keep the consent screen minimal: no offline access, no extra scopes.
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(sdk.auth, provider);
  }, [persistLocal, localProfile]);

  const signOut = useCallback(async () => {
    const sdk = sdkRef.current;
    if (sdk) await sdk.authModule.signOut(sdk.auth);
    writeJSON(KEYS.guestProfile, null);
    setProfile(null);
    setStatus("signed-out");
    setNotice(null);
  }, []);

  /* ------------------------------------------------------------------ *
   * Account operations
   *
   * Every one of these returns a `Result` (`{ ok, code?, message? }`) instead of
   * throwing. A settings form that has to wrap five calls in try/catch, and
   * guess which failure it caught, is a form that eventually swallows one.
   * ------------------------------------------------------------------ */

  /** @returns {any} the live Firebase user, or null in local mode */
  const currentUser = useCallback(() => sdkRef.current?.auth.currentUser ?? null, []);

  /** Re-read the provider record (picks up a verification done in another tab). */
  const refreshUser = useCallback(async () => {
    const user = currentUser();
    if (!user) return { ok: true };
    const result = await refreshVerification(user);
    if (result.ok) {
      setProfile(toProfile(user));
      setStatus(statusFor(user));
    }
    return result;
  }, [currentUser]);

  const resendVerification = useCallback(async () => {
    const sdk = sdkRef.current;
    const user = currentUser();
    if (!sdk || !user) return { ok: false, code: "no-user" };
    const result = await sendVerification(user, sdk);
    if (result.ok) {
      setNotice("Verification email sent. Open the link, then press “I have verified”.");
    }
    return result;
  }, [currentUser]);

  /** Change the display name. Local mode updates the stored profile directly. */
  const updateName = useCallback(
    async (/** @type {string} */ name) => {
      const sdk = sdkRef.current;
      const user = currentUser();

      if (!sdk || !user) {
        const cleaned = String(name ?? "").trim();
        if (cleaned.length < 2 || cleaned.length > 40) {
          return { ok: false, code: "invalid-name", message: "Names are 2–40 characters." };
        }
        setProfile((current) => {
          if (!current) return current;
          const next = { ...current, name: cleaned };
          writeJSON(KEYS.guestProfile, next);
          return next;
        });
        return { ok: true };
      }

      const result = await updateDisplayName(user, sdk, name);
      if (result.ok) setProfile(toProfile(user));
      return result;
    },
    [currentUser],
  );

  /**
   * Change the password. Local mode has no password store to change, and says so
   * rather than showing a success toast for a no-op.
   */
  const updatePassword = useCallback(
    async (/** @type {string} */ currentPassword, /** @type {string} */ nextPassword) => {
      const sdk = sdkRef.current;
      const user = currentUser();
      if (!sdk || !user) return { ok: false, code: "local-mode" };

      const confirmed = await confirmPassword(user, sdk, currentPassword);
      if (!confirmed.ok) return confirmed;
      return changePassword(user, sdk, nextPassword);
    },
    [currentUser],
  );

  /** Start an email change; takes effect only when the link is opened. */
  const updateEmail = useCallback(
    async (/** @type {string} */ currentPassword, /** @type {string} */ email) => {
      const sdk = sdkRef.current;
      const user = currentUser();
      if (!sdk || !user) return { ok: false, code: "local-mode" };

      const confirmed = await confirmPassword(user, sdk, currentPassword);
      if (!confirmed.ok) return confirmed;
      return requestEmailChange(user, sdk, email);
    },
    [currentUser],
  );

  const removeAccount = useCallback(
    async (/** @type {string} */ currentPassword) => {
      const sdk = sdkRef.current;
      const user = currentUser();
      if (!sdk || !user) return { ok: false, code: "local-mode" };

      const confirmed = await confirmPassword(user, sdk, currentPassword);
      if (!confirmed.ok) return confirmed;

      const result = await deleteAccount(user);
      if (result.ok) {
        writeJSON(KEYS.guestProfile, null);
        setProfile(null);
        setStatus("signed-out");
      }
      return result;
    },
    [currentUser],
  );

  const value = useMemo(
    () => ({
      mode, // "firebase" | "local"
      status, // "loading" | "signed-in" | "signed-out" | "unverified"
      isSignedIn: status === "signed-in",
      isUnverified: status === "unverified",
      user: profile,
      notice,
      dismissNotice: () => setNotice(null),
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshUser,
      resendVerification,
      updateName,
      updatePassword,
      updateEmail,
      removeAccount,
    }),
    [
      mode,
      status,
      profile,
      notice,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshUser,
      resendVerification,
      updateName,
      updatePassword,
      updateEmail,
      removeAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * @returns {{
 *   mode: "firebase" | "local",
 *   status: "loading" | "signed-in" | "signed-out" | "unverified",
 *   isSignedIn: boolean,
 *   isUnverified: boolean,
 *   user: Profile | null,
 *   notice: string | null,
 *   dismissNotice: () => void,
 *   signIn: Function,
 *   signUp: Function,
 *   signInWithGoogle: Function,
 *   signOut: Function,
 *   refreshUser: () => Promise<any>,
 *   resendVerification: () => Promise<any>,
 *   updateName: (name: string) => Promise<any>,
 *   updatePassword: (current: string, next: string) => Promise<any>,
 *   updateEmail: (current: string, email: string) => Promise<any>,
 *   removeAccount: (current: string) => Promise<any>,
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
