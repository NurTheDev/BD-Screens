/**
 * @file auth.jsx
 * @description Session + profile context.
 *
 * The shape deliberately mirrors what the app needs, not what Firebase returns:
 * `{ status, user, profile, signIn, signUp, signInWithGoogle, signOut, ... }`.
 * Swapping the identity provider later means editing this file only.
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
import { readJSON, writeJSON, KEYS } from "./storage.js";
// Re-exported so callers keep one obvious import for auth concerns, while the
// implementations live in a plain module (React Fast Refresh requirement).
export { authErrorMessage, passwordStrength } from "./auth-utils.js";

/** @typedef {{ uid: string, name: string, email: string, photo: string | null, verified: boolean }} Profile */

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
  };
}

export function AuthProvider({ children }) {
  const [mode, setMode] = useState(initialMode);
  const [status, setStatus] = useState(
    /** @type {"loading"|"signed-in"|"signed-out"} */ ("loading"),
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
        setStatus(user ? "signed-in" : "signed-out");
        setNotice(
          user && !user.emailVerified ? "Please verify your email to unlock downloads." : null,
        );
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

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
        persistLocal({
          uid: `local-${btoa(email)
            .replace(/[^a-z0-9]/gi, "")
            .slice(0, 10)}`,
          name: email.split("@")[0],
          email,
          photo: null,
          verified: true,
        });
        return;
      }
      const { signInWithEmailAndPassword } = sdk.authModule;
      const credential = await signInWithEmailAndPassword(sdk.auth, email, password);
      if (!credential.user.emailVerified) {
        setNotice("Your email is not verified yet — check your inbox to unlock downloads.");
      }
      return credential;
    },
    [persistLocal],
  );

  const signUp = useCallback(
    async (
      /** @type {string} */ name,
      /** @type {string} */ email,
      /** @type {string} */ password,
    ) => {
      const sdk = sdkRef.current;
      if (!sdk) {
        persistLocal({
          uid: `local-${Date.now().toString(36)}`,
          name,
          email,
          photo: null,
          verified: true,
        });
        return { verificationSent: false };
      }

      const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } =
        sdk.authModule;
      const credential = await createUserWithEmailAndPassword(sdk.auth, email, password);

      // displayName is cosmetic; failure must not block signup.
      await updateProfile(credential.user, { displayName: name }).catch(() => {});
      const verificationSent = await sendEmailVerification(credential.user)
        .then(() => true)
        .catch(() => false);

      return { verificationSent };
    },
    [persistLocal],
  );

  const signInWithGoogle = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk) {
      persistLocal({
        uid: `local-${Date.now().toString(36)}`,
        name: "Google Viewer",
        email: "viewer@example.com",
        photo: null,
        verified: true,
      });
      return;
    }
    const { GoogleAuthProvider, signInWithPopup } = sdk.authModule;
    const provider = new GoogleAuthProvider();
    // Keep the consent screen minimal: no offline access, no extra scopes.
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(sdk.auth, provider);
  }, [persistLocal]);

  const signOut = useCallback(async () => {
    const sdk = sdkRef.current;
    if (sdk) await sdk.authModule.signOut(sdk.auth);
    writeJSON(KEYS.guestProfile, null);
    setProfile(null);
    setStatus("signed-out");
    setNotice(null);
  }, []);

  const resendVerification = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk?.auth.currentUser) return false;
    try {
      await sdk.authModule.sendEmailVerification(sdk.auth.currentUser);
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({
      mode, // "firebase" | "local"
      status, // "loading" | "signed-in" | "signed-out"
      isSignedIn: status === "signed-in",
      user: profile,
      notice,
      dismissNotice: () => setNotice(null),
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resendVerification,
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
      resendVerification,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** @returns {ReturnType<typeof Object> & { mode: string, status: string, isSignedIn: boolean, user: Profile | null, notice: string | null, dismissNotice: () => void, signIn: Function, signUp: Function, signInWithGoogle: Function, signOut: Function, resendVerification: Function }} */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
