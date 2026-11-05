/**
 * @file SignUp.jsx
 * @description Account creation with a live password-strength meter.
 *
 * The meter is a guide, not a gate: Firebase's own minimum is 6 characters, but
 * the form recommends 8+ with variety and explains why in one line rather than
 * showing a red X with no reason. The "confirm email" state is explicit — users
 * who are told to check their inbox are far less likely to think signup failed.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, authErrorMessage, passwordStrength } from "../lib/auth.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { GoogleMark } from "../components/ui/Brand.jsx";
import { Logo } from "../components/layout/Logo.jsx";
import { Close, Warning, Check, ArrowRight } from "../components/ui/Icons.jsx";

export default function SignUp() {
  const navigate = useNavigate();
  const toast = useToast();
  const { signUp, signInWithGoogle, mode } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [formError, setFormError] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const strength = passwordStrength(form.password);

  /** @param {React.FormEvent} event */
  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    /** @type {Record<string, string>} */
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = "Tell us what to call you.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      nextErrors.email = "Enter a valid email address.";
    if (form.password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (!accepted) nextErrors.accepted = "Please accept the demo terms.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const result = await signUp(form.name.trim(), form.email.trim(), form.password);
      if (result?.verificationSent) {
        setVerificationSent(true);
      } else {
        toast.success("Account created");
        navigate("/");
      }
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------------- Verification */
  if (verificationSent) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-mint/40 text-mint">
          <Check size={26} />
        </span>
        <h1 className="mt-5 font-display text-[34px] leading-tight">Check your inbox</h1>
        <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-mist-400">
          We sent a verification link to <span className="text-mist-100">{form.email}</span>.
          You can browse and build a watchlist right away; downloading requires a verified
          address.
        </p>
        <div className="mt-6 flex gap-2">
          <Link to="/" className="btn btn-primary">
            Start watching <ArrowRight size={15} />
          </Link>
          <Link to="/signin" className="btn btn-ghost">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[0.95fr_1.05fr]">
      {/* Art side first on large screens for a different rhythm than sign-in */}
      <aside className="relative hidden overflow-hidden border-r border-white/8 lg:block">
        <img
          src="/art/plates/plate-khola-akash.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(200deg,rgba(8,8,11,0.3),rgba(8,8,11,0.94))]" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <p className="eyebrow">Join BD Screens</p>
          <div>
            <h2 className="max-w-sm font-display text-[30px] leading-[1.1] text-mist-100">
              Build a library that actually remembers what you were watching.
            </h2>
            <p className="mt-3 max-w-sm text-[12.5px] leading-relaxed text-mist-400">
              Progress, watchlist and ratings are stored on this device from the first click —
              an account simply keeps them in one place across sessions.
            </p>
          </div>
        </div>
      </aside>

      {/* Form */}
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
          <p className="eyebrow">Create account</p>
          <h1 className="display mt-2 text-[38px] leading-none">Join in 30 seconds</h1>

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
                htmlFor="name"
                className="mb-1.5 block text-[12px] font-medium text-mist-300"
              >
                Display name
              </label>
              <input
                id="name"
                autoComplete="nickname"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                aria-invalid={Boolean(errors.name)}
                className="field"
                placeholder="Nur"
                maxLength={24}
              />
              {errors.name && (
                <p className="mt-1.5 text-[11.5px] text-signal-soft">{errors.name}</p>
              )}
            </div>

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
                className="field"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1.5 text-[11.5px] text-signal-soft">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[12px] font-medium text-mist-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-strength"
                className="field"
                placeholder="At least 8 characters"
              />

              {/* Meter: only appears once typing starts. */}
              {form.password.length > 0 && (
                <div id="password-strength" className="mt-2">
                  <div className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <span
                        key={index}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          background:
                            index < strength.score
                              ? strength.score <= 2
                                ? "var(--color-signal)"
                                : strength.score <= 3
                                  ? "var(--color-amber)"
                                  : "var(--color-mint)"
                              : "rgba(255,255,255,0.12)",
                        }}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-mist-500">
                    {strength.label}
                    {strength.score < 3 && " — mix cases, add a number or symbol"}
                  </p>
                </div>
              )}
              {errors.password && (
                <p className="mt-1.5 text-[11.5px] text-signal-soft">{errors.password}</p>
              )}
            </div>

            <label className="flex items-start gap-2.5 pt-1 text-[11.5px] leading-relaxed text-mist-400">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-signal"
                aria-invalid={Boolean(errors.accepted)}
              />
              <span>
                This is a portfolio demo. My account is for testing, and no payment details will
                ever be requested.
              </span>
            </label>
            {errors.accepted && (
              <p className="text-[11.5px] text-signal-soft">{errors.accepted}</p>
            )}

            <button type="submit" className="btn btn-primary h-11 w-full" disabled={busy}>
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.2em] text-mist-600">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setFormError(null);
              setBusy(true);
              try {
                await signInWithGoogle();
                toast.success("Signed in with Google");
                navigate("/");
              } catch (error) {
                if (/** @type {any} */ (error)?.code !== "auth/popup-closed-by-user") {
                  setFormError(authErrorMessage(error));
                }
              } finally {
                setBusy(false);
              }
            }}
            className="btn btn-ghost h-11 w-full"
          >
            <GoogleMark size={17} />
            Sign up with Google
          </button>

          <p className="mt-6 text-center text-[12.5px] text-mist-400">
            Already have an account?{" "}
            <Link
              to="/signin"
              className="font-medium text-amber underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>

          <p className="mt-5 text-center text-[10.5px] text-mist-600">
            {mode === "firebase"
              ? "Passwords are handled by Firebase Authentication — never by this app."
              : "Demo mode: accounts are stored in this browser only."}
          </p>
        </div>
      </div>
    </div>
  );
}
