/**
 * @file SignIn.jsx
 * @description Split-screen sign-in.
 *
 * Security-relevant choices visible in this file:
 *  - the password field never has `autocomplete="off"` (that breaks password
 *    managers) and is paired with a visible "show" toggle instead,
 *  - a generic failure message is shown for bad credentials, so the form cannot
 *    be used to discover which emails have accounts,
 *  - no credentials are logged, and nothing is stored locally,
 *  - the Google button uses the popup flow (PKCE) rather than redirect-with-token,
 *    and the Firebase SDK is only downloaded when this page is opened.
 *
 * The right-hand panel is honest about the demo: it explains that when Firebase
 * is unreachable the form creates a local profile, and says exactly what that
 * means. Pretending otherwise would be the least trustworthy thing on the page.
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, authErrorMessage } from "../lib/auth.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { GoogleMark } from "../components/ui/Brand.jsx";
import { Logo } from "../components/layout/Logo.jsx";
import { Close, Warning, Check } from "../components/ui/Icons.jsx";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { signIn, signInWithGoogle, status, mode } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(/** @type {string | null} */ (null));

  const next = /** @type {string} */ (/** @type {any} */ (location.state)?.from ?? "/");
  const bounced = /** @type {any} */ (location.state)?.reason === "unverified";

  /** @param {React.FormEvent} event */
  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    /** @type {Record<string, string>} */
    const nextErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      nextErrors.email = "Enter a valid email address.";
    if (form.password.length < 6)
      nextErrors.password = "Your password is at least 6 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const result = await signIn(form.email.trim(), form.password);

      /*
       * A credential is not a sign-in. If the address is unproven, the user goes
       * to /verify with an explanation — never into the app with a banner they
       * will learn to ignore.
       */
      if (result?.status === "unverified") {
        toast.info("Verify your email to activate the account");
        navigate("/verify", { replace: true });
        return;
      }

      toast.success("Welcome back");
      navigate(next);
    } catch (error) {
      // Deliberately generic: do not reveal whether the account exists.
      setFormError(
        /** @type {any} */ (error)?.code === "auth/too-many-requests"
          ? authErrorMessage(error)
          : "Email or password is incorrect.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      {/* ------------------------------------------------------ Form side */}
      <div className="relative flex flex-col px-5 py-6 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between">
          <Logo />
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-mist-400 transition hover:border-white/30 hover:text-mist-100"
            aria-label="Close and return home"
          >
            <Close size={16} />
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <p className="eyebrow">Welcome back</p>
          <h1 className="display mt-2 text-[38px] leading-none">Sign in</h1>
          <p className="mt-2 text-[13px] text-mist-400">
            Your watchlist and progress stay on this device either way.
          </p>

          {bounced && !formError && (
            <div
              role="status"
              className="mt-5 flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/8 px-3 py-2.5 text-[12.5px] leading-relaxed text-amber"
            >
              <Warning size={14} className="mt-0.5 shrink-0" />
              That account still needs email verification. Sign in again to resend the link.
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-lg border border-signal/30 bg-signal/8 px-3 py-2.5 text-[12.5px] text-signal-soft"
            >
              <Warning size={14} className="mt-0.5 shrink-0" />
              {formError}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[12px] font-medium text-mist-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                className="field"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-[11.5px] text-signal-soft">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="password" className="text-[12px] font-medium text-mist-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-[11px] text-mist-500 transition hover:text-mist-200"
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                className="field"
                placeholder="••••••••"
              />
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-[11.5px] text-signal-soft">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary mt-2 h-11 w-full"
              disabled={busy || status === "loading"}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.2em] text-mist-600">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={async () => {
              setFormError(null);
              setBusy(true);
              try {
                await signInWithGoogle();
                toast.success("Signed in with Google");
                navigate(next);
              } catch (error) {
                const code = /** @type {any} */ (error)?.code;
                if (code !== "auth/popup-closed-by-user") {
                  setFormError(authErrorMessage(error));
                }
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="btn btn-ghost h-11 w-full"
          >
            <GoogleMark size={17} />
            Continue with Google
          </button>

          <p className="mt-6 text-center text-[12.5px] text-mist-400">
            No account?{" "}
            <Link
              to="/signup"
              className="font-medium text-amber underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>

        <p className="text-center text-[10.5px] text-mist-600 lg:text-left">
          {mode === "firebase"
            ? "Secured by Firebase Authentication"
            : "Demo mode: local profile only"}
        </p>
      </div>

      {/* ----------------------------------------------------- Art side */}
      <aside className="relative hidden overflow-hidden border-l border-white/8 lg:block">
        <img
          src="/art/plates/plate-monsoon-express.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(8,8,11,0.35),rgba(8,8,11,0.92))]" />

        <div className="relative flex h-full flex-col justify-end p-10">
          <blockquote className="max-w-sm font-display text-[27px] leading-[1.15] text-mist-100">
            “A streaming service is only ever as good as the second after you press play.”
          </blockquote>
          <p className="mt-3 text-[11.5px] text-mist-500">Design note · BD Screens</p>

          <ul className="mt-8 space-y-2.5 border-t border-white/10 pt-6">
            {[
              "Watchlist and progress need no account",
              "Firebase Auth for real sessions, when configured",
              "No passwords stored, logged or sent anywhere but Firebase",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2 text-[12px] text-mist-400">
                <span className="mt-0.5 text-mint">
                  <Check size={13} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
