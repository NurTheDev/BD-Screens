/**
 * @file auth-utils.js
 * @description Pure helpers for the auth screens: friendly error copy and a
 * password-strength heuristic. No React, no Firebase — trivially testable.
 */

/** Friendlier copy for the Firebase error codes a user can actually hit. */
const ERROR_COPY = {
  "auth/invalid-email": "That email address does not look right.",
  "auth/missing-password": "Enter your password.",
  "auth/weak-password": "Use at least 8 characters, with a number.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/user-not-found": "No account with that email. Create one instead?",
  "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
  "auth/network-request-failed": "Network problem. Check your connection.",
  "auth/popup-blocked": "Your browser blocked the popup. Allow popups and retry.",
  "auth/popup-closed-by-user": "Sign-in window closed before finishing.",
  "auth/operation-not-allowed": "This sign-in method is disabled for the project.",
};

/**
 * @param {unknown} error
 * @returns {string}
 */
export function authErrorMessage(error) {
  const code = /** @type {{ code?: string }} */ (error)?.code ?? "";
  return ERROR_COPY[code] ?? /** @type {Error} */ (error)?.message ?? "Something went wrong.";
}

/**
 * Password strength, used by both the sign-up form and the field meter.
 * Deliberately simple and explainable: length + variety, no false precision.
 * @param {string} password
 */
export function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels = ["Too short", "Weak", "Okay", "Good", "Strong", "Excellent"];
  return { score, label: labels[Math.min(score, 5)], percent: Math.min(100, score * 20) };
}
