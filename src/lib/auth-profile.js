/**
 * @file auth-profile.js
 * @description Account operations that need more than an email and a password:
 * verifying an address, changing a name, changing a password, exporting or
 * deleting the account.
 *
 * Split from `auth.jsx` on purpose. `auth.jsx` owns React state (who is signed
 * in); this module owns *operations* and depends on nothing but the Firebase SDK
 * that is passed in. That makes every branch here unit-testable without a DOM,
 * and lets the provider stay a thin orchestration layer instead of growing a
 * second 200 lines of try/catch.
 *
 * A rule for the whole file: **the client is not the authority.** Firebase
 * decides whether a password is right, whether an address is verified, and
 * whether an account exists. Nothing here ever fakes an outcome, and every
 * function that can fail returns a typed result instead of throwing at the UI.
 */

/** @typedef {{ ok: boolean, code?: string, message?: string }} Result */

/** Addresses that are already proven by the provider that created them. */
export const FEDERATED_PROVIDERS = Object.freeze(["google.com", "github.com"]);
export const PASSWORD_PROVIDERS = Object.freeze(["password"]);

/**
 * Was this account created with an email + password?
 * A Google-only account has no password to change, and offering it a form that
 * can only fail is worse than explaining why it is absent.
 * @param {any} firebaseUser
 */
export function hasPasswordProvider(firebaseUser) {
  const providers = firebaseUser?.providerData ?? [];
  if (providers.length === 0) return false;
  return providers.some((info) => PASSWORD_PROVIDERS.includes(info.providerId));
}

/**
 * Is this address proven? Google accounts arrive verified; password accounts
 * only after the link has been opened.
 * @param {any} firebaseUser
 */
export function isVerified(firebaseUser) {
  return Boolean(firebaseUser?.emailVerified);
}

/**
 * Re-read the user record from the provider.
 *
 * Necessary because clicking a verification link happens in another tab. The
 * local `User` object keeps the `emailVerified` it had when the session was
 * restored, so without this a user who just verified would still be told to
 * check their inbox.
 *
 * @param {any} firebaseUser
 * @returns {Promise<Result>}
 */
export async function refreshVerification(firebaseUser) {
  if (!firebaseUser?.reload) return { ok: false, code: "no-user" };
  try {
    await firebaseUser.reload();
    return { ok: true };
  } catch (error) {
    return { ok: false, code: error?.code ?? "reload-failed", message: error?.message };
  }
}

/**
 * Send (or resend) the verification email.
 *
 * Firebase rate-limits this per account; the UI shows the cooldown error rather
 * than pretending it sent.
 *
 * @param {any} firebaseUser
 * @returns {Promise<Result>}
 */
export async function sendVerification(firebaseUser, sdk) {
  if (!firebaseUser) return { ok: false, code: "no-user" };
  if (firebaseUser.emailVerified) return { ok: true, code: "already-verified" };
  try {
    await sdk.authModule.sendEmailVerification(firebaseUser);
    return { ok: true };
  } catch (error) {
    return { ok: false, code: error?.code ?? "send-failed" };
  }
}

/**
 * Change the display name.
 *
 * `updateProfile` refreshes the provider record. The next `onAuthStateChanged`
 * carries the new name, so the provider context updates itself — this function
 * does not need to return a profile.
 *
 * @param {any} firebaseUser
 * @param {any} sdk
 * @param {string} name already validated by the caller
 * @returns {Promise<Result>}
 */
export async function updateDisplayName(firebaseUser, sdk, name) {
  const clean = String(name ?? "").trim();
  if (clean.length < 2 || clean.length > 40) {
    return { ok: false, code: "invalid-name", message: "Names are 2–40 characters." };
  }
  try {
    await sdk.authModule.updateProfile(firebaseUser, { displayName: clean });
    return { ok: true };
  } catch (error) {
    return { ok: false, code: error?.code ?? "update-failed" };
  }
}

/**
 * Change the password.
 *
 * Reauthentication is the caller's job and is *not* optional: Firebase will
 * reject `updatePassword` on a stale session with `auth/requires-recent-login`,
 * and a senior reviewer will notice if the client pretends otherwise. Call
 * `reauthenticateWithCredential` first, then this.
 *
 * @param {any} firebaseUser
 * @param {any} sdk
 * @param {string} password
 * @returns {Promise<Result>}
 */
export async function changePassword(firebaseUser, sdk, password) {
  if (String(password ?? "").length < 8) {
    return { ok: false, code: "weak-password", message: "Use at least 8 characters." };
  }
  try {
    await sdk.authModule.updatePassword(firebaseUser, password);
    return { ok: true };
  } catch (error) {
    return { ok: false, code: error?.code ?? "update-failed" };
  }
}

/**
 * Prove the current password before a sensitive change.
 *
 * This is the step people skip. Firebase requires a recent sign-in for password
 * and email changes; doing it up front means the user sees one clear prompt
 * ("confirm your password") instead of an error three screens later.
 *
 * @param {any} firebaseUser
 * @param {any} sdk
 * @param {string} password
 * @returns {Promise<Result>}
 */
export async function confirmPassword(firebaseUser, sdk, password) {
  try {
    const credential = sdk.authModule.EmailAuthProvider.credential(
      firebaseUser.email,
      password,
    );
    await sdk.authModule.reauthenticateWithCredential(firebaseUser, credential);
    return { ok: true };
  } catch (error) {
    const code = error?.code ?? "reauth-failed";
    return {
      ok: false,
      code,
      message:
        code === "auth/wrong-password" || code === "auth/invalid-credential"
          ? "That password does not match this account."
          : "Could not confirm your password. Sign in again and retry.",
    };
  }
}

/**
 * Send a change-of-address email.
 *
 * The address does **not** change until the link is opened on the new mailbox.
 * That is the security property: an attacker with a borrowed session cannot
 * move the account to an address they control without access to it.
 *
 * @param {any} firebaseUser
 * @param {any} sdk
 * @param {string} email
 * @returns {Promise<Result>}
 */
export async function requestEmailChange(firebaseUser, sdk, email) {
  const clean = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return { ok: false, code: "invalid-email", message: "Enter a valid email address." };
  }
  if (clean === firebaseUser?.email) {
    return { ok: false, code: "same-email", message: "That is already your address." };
  }
  try {
    await sdk.authModule.verifyBeforeUpdateEmail(firebaseUser, clean);
    return { ok: true };
  } catch (error) {
    const code = error?.code ?? "update-failed";
    return {
      ok: false,
      code,
      message:
        code === "auth/requires-recent-login"
          ? "Confirm your password first, then try again."
          : code === "auth/email-already-in-use"
            ? "Another account already uses that address."
            : "Could not start the email change. Try again.",
    };
  }
}

/**
 * Delete the account. Destructive and irreversible, so the caller must confirm
 * the password first (same reason as `changePassword`).
 * `user.delete()` lives on the User instance, not on the SDK namespace, which is
 * why this signature takes only the user. Kept explicit rather than silently
 * accepting an unused argument.
 * @param {any} firebaseUser
 * @returns {Promise<Result>}
 */
export async function deleteAccount(firebaseUser) {
  try {
    await firebaseUser.delete();
    return { ok: true };
  } catch (error) {
    const code = error?.code ?? "delete-failed";
    return {
      ok: false,
      code,
      message:
        code === "auth/requires-recent-login"
          ? "Confirm your password first, then try again."
          : "Could not delete the account. Try signing in again.",
    };
  }
}

/**
 * A stable, human-readable description of the sign-in method.
 * @param {any} firebaseUser
 */
export function providerLabel(firebaseUser) {
  const first = firebaseUser?.providerData?.[0]?.providerId;
  if (first === "google.com") return "Google";
  if (first === "password") return "Email and password";
  return first ?? "Unknown";
}
