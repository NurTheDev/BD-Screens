/**
 * @file VerifyEmail.jsx
 * @description The screen an unverified account lands on, and the only screen it
 * can reach besides sign-out.
 *
 * Why this exists instead of a banner: a banner on top of a working app implies
 * the account is usable "except for a few things", and users learn to ignore it.
 * A dedicated gate says the account is not active yet and gives exactly three
 * actions — resend, I have verified, sign out — with no way to wander off.
 *
 * The "I have verified" button is honest: it re-reads the provider record
 * (`reload()`), because clicking a link in another tab does not update the
 * session that is already open in this one.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { Logo } from "../components/layout/Logo.jsx";
import { Check, Warning, Refresh, Logout, Mail } from "../components/ui/Icons.jsx";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, status, refreshUser, resendVerification, signOut, mode } = useAuth();

  const [busy, setBusy] = useState(/** @type {"resend"|"check"|null} */ (null));
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  /* Already verified (e.g. link opened, then this tab regained focus). */
  useEffect(() => {
    if (status === "signed-in") navigate("/profile", { replace: true });
    if (status === "signed-out") navigate("/signin", { replace: true });
  }, [status, navigate]);

  /* Poll once when the tab regains focus: that is when people come back. */
  useEffect(() => {
    const onFocus = async () => {
      const result = await refreshUser();
      if (result?.ok && status === "unverified") {
        // The provider record is authoritative; `status` updates via the
        // provider's own state, so nothing to do but let the effect above run.
        setError(null);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshUser, status]);

  /* A short cooldown matches Firebase's own rate limit; it is not decoration. */
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onResend = async () => {
    setBusy("resend");
    setError(null);
    const result = await resendVerification();
    setBusy(null);
    if (result?.ok) {
      setCooldown(45);
      toast.success("Verification email sent");
      return;
    }
    if (result?.code === "auth/too-many-requests") {
      setCooldown(60);
      setError("Firebase is rate-limiting verification emails. Try again in a minute.");
    } else if (result?.code === "no-user") {
      setError("Your session expired. Sign in again to request a new link.");
    } else {
      setError("Could not send the email. Check your connection and try again.");
    }
  };

  const onCheck = async () => {
    setBusy("check");
    setError(null);
    const result = await refreshUser();
    setBusy(null);

    // `refreshUser` updates the provider state; the effect above redirects when
    // it flips to signed-in. If it did not flip, say so plainly.
    if (result?.ok) {
      setError("Still unverified. Open the newest link in your inbox, then try again.");
    } else {
      setError("Could not reach Firebase. Check your connection and try again.");
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-ink-950">
      <div className="flex items-center justify-between px-5 py-6 sm:px-10">
        <Logo />
        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
          className="btn btn-quiet h-9 text-[12px]"
        >
          <Logout size={14} /> Sign out
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-20">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-amber/40 text-amber">
          <Mail size={22} />
        </span>

        <p className="eyebrow mt-5">One step left</p>
        <h1 className="display mt-2 text-[34px] leading-tight">Verify your email</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
          We sent a link to{" "}
          <span className="font-medium text-mist-100">{user?.email ?? "your inbox"}</span>. Your
          account becomes active the moment you open it — profile, settings and your saved data
          unlock together.
        </p>

        {mode === "firebase" ? (
          <>
            {error && (
              <p
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/8 px-3 py-2 text-[12px] leading-relaxed text-amber"
              >
                <Warning size={13} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={onCheck}
                disabled={busy !== null}
                className="btn btn-primary h-11 w-full"
              >
                {busy === "check" ? (
                  "Checking…"
                ) : (
                  <>
                    <Check size={16} /> I have verified my email
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onResend}
                disabled={busy !== null || cooldown > 0}
                className="btn btn-ghost h-11 w-full"
              >
                <Refresh size={15} />
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend the email"}
              </button>
            </div>

            <p className="mt-5 border-t border-white/8 pt-4 text-[11px] leading-relaxed text-mist-600">
              The link expires after one use. If it never arrived, check spam and confirm the
              address above — then sign out and create the account again with the right one.
            </p>
          </>
        ) : (
          <p className="mt-5 rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-[12px] leading-relaxed text-mist-400">
            Demo mode: this build is running without Firebase, so there is no email to verify.
            Open{" "}
            <Link to="/profile" className="text-amber underline">
              your profile
            </Link>{" "}
            to continue.
          </p>
        )}
      </div>
    </div>
  );
}
