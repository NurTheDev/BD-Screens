/**
 * @file Settings.jsx
 * @description Account and app settings, grouped by what the user is trying to
 * do rather than by which subsystem happens to own the data.
 *
 * Design rules applied here:
 *
 *  - **Nothing is a lie.** Every control either changes something immediately
 *    and says how, or is labelled with what it needs (`Needs a backend`). The
 *    notification switches are stored and honestly described as taking effect
 *    once email delivery exists — the alternative is a fake "saved" toast.
 *  - **Destructive actions are separated.** Password, email change and account
 *    deletion each sit behind their own confirmation, in their own card, with
 *    the consequence spelled out. A single "Save" button that can delete an
 *    account is how people lose accounts.
 *  - **Reauthentication is explicit.** Changing a password or address requires
 *    the current password. Firebase enforces it; the UI asks for it up front so
 *    the failure is a clear prompt rather than a mystery error.
 *  - **Escape hatches.** Reset preferences, sign out everywhere, delete account.
 *    A settings page without a way to undo is a trap.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, passwordStrength } from "../lib/auth.jsx";
import { usePreferences } from "../lib/preferences.jsx";
import { useLibrary } from "../lib/library.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { KEYS, readJSON, writeJSON } from "../lib/storage.js";
import {
  Check,
  Close,
  Download,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Refresh,
  Settings as SettingsIcon,
  Shield,
  Trash,
  User,
  Warning,
} from "../components/ui/Icons.jsx";

/* ---------------------------------------------------------------- helpers */

/**
 * A labelled switch that behaves like a checkbox for keyboards and screen
 * readers, with a visible on/off state.
 * @param {{ id: string, label: string, description?: string, checked: boolean, onChange: (value: boolean) => void, disabled?: boolean, hint?: string }} props
 */
function Toggle({ id, label, description, checked, onChange, disabled = false, hint }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className={`block text-[13px] font-medium ${disabled ? "text-mist-500" : "text-mist-100"}`}
        >
          {label}
        </label>
        {description && (
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-mist-500">{description}</p>
        )}
        {hint && (
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-mist-400">
            {hint}
          </p>
        )}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked ? "border-signal bg-signal/85" : "border-white/15 bg-white/10"
        } ${disabled ? "opacity-40" : "hover:border-white/35"}`}
      >
        <span
          className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[calc(100%-1.25rem)]" : "left-0.5"
          }`}
          style={{ height: "1.125rem", width: "1.125rem" }}
        />
      </button>
    </div>
  );
}

/** @param {{ title: string, description?: string, children: React.ReactNode, danger?: boolean }} props */
function Card({ title, description, children, danger = false }) {
  return (
    <section
      className={`panel p-5 sm:p-6 ${danger ? "border-signal/25" : ""}`}
      aria-labelledby={`card-${title.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <h2
        id={`card-${title.replace(/\s+/g, "-").toLowerCase()}`}
        className={`text-[15px] font-semibold ${danger ? "text-signal-soft" : "text-mist-100"}`}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-[12px] leading-relaxed text-mist-500">{description}</p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Inline feedback for a form; one pattern for success and failure. */
function Note({ tone = "ok", children }) {
  if (!children) return null;
  const danger = tone === "error";
  return (
    <p
      role={danger ? "alert" : "status"}
      className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed ${
        danger
          ? "border-signal/30 bg-signal/8 text-signal-soft"
          : "border-mint/30 bg-mint/8 text-mint"
      }`}
    >
      {danger ? (
        <Warning size={13} className="mt-0.5 shrink-0" />
      ) : (
        <Check size={13} className="mt-0.5 shrink-0" />
      )}
      {children}
    </p>
  );
}

/** A password field with a show/hide control and correct autocomplete. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  hint,
}) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-mist-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="field pr-11"
        />
        <button
          type="button"
          onClick={() => setShown((current) => !current)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-mist-500 transition hover:text-mist-100"
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          tabIndex={-1}
        >
          {shown ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-mist-600">{hint}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- page */

const SECTIONS = [
  { id: "account", label: "Account", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "playback", label: "Playback", icon: SettingsIcon },
  { id: "accessibility", label: "Accessibility", icon: Eye },
  { id: "notifications", label: "Notifications", icon: Mail },
  { id: "data", label: "Data", icon: Download },
  { id: "danger", label: "Delete account", icon: Trash },
];

export default function Settings() {
  const toast = useToast();
  const {
    user,
    mode,
    status,
    updateName,
    updatePassword,
    updateEmail,
    removeAccount,
    signOut,
    refreshUser,
  } = useAuth();
  const { preferences, setPreference, resetPreferences } = usePreferences();
  const { stats, continueWatching, watchlist, ratings, resetLibrary } = useLibrary();

  const [active, setActive] = useState("account");

  /* ---- account ---- */
  const [name, setName] = useState(user?.name ?? "");
  const [nameState, setNameState] = useState({ busy: false, error: "", ok: "" });

  /* ---- security ---- */
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordState, setPasswordState] = useState({ busy: false, error: "", ok: "" });
  const [emailForm, setEmailForm] = useState({ current: "", next: "" });
  const [emailState, setEmailState] = useState({ busy: false, error: "", ok: "" });

  /* ---- danger ---- */
  const [deleteForm, setDeleteForm] = useState({ password: "", phrase: "" });
  const [deleteState, setDeleteState] = useState({ busy: false, error: "" });

  const strength = passwordStrength(passwordForm.next);
  const localMode = mode === "local" || status !== "signed-in";

  /*
   * Deep links: /settings#security opens that section, and clicking a section
   * updates the hash so the state can be linked and reloaded.
   *
   * Both directions are driven by one value. An earlier version wrote the hash
   * from a mount effect *and* read it from a `hashchange` listener; because the
   * write happened first, the read saw `#account` and every deep link to a
   * section other than the default landed on the wrong panel.
   */
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace("#", "");
      if (SECTIONS.some((section) => section.id === hash)) setActive(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const selectSection = useCallback((id) => {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
  }, []);

  const currentSection = useMemo(
    () => SECTIONS.find((section) => section.id === active) ?? SECTIONS[0],
    [active],
  );

  /* ----------------------------------------------------------- handlers */

  const onSaveName = async (event) => {
    event.preventDefault();
    setNameState({ busy: true, error: "", ok: "" });
    const result = await updateName(name);
    if (result?.ok) {
      setNameState({ busy: false, error: "", ok: "Name updated everywhere in the app." });
      toast.success("Name updated");
    } else {
      setNameState({
        busy: false,
        error: result?.message ?? "Could not save the name.",
        ok: "",
      });
    }
  };

  const onChangePassword = async (event) => {
    event.preventDefault();
    setPasswordState({ busy: true, error: "", ok: "" });

    if (passwordForm.next.length < 8) {
      setPasswordState({
        busy: false,
        error: "New password must be at least 8 characters.",
        ok: "",
      });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordState({ busy: false, error: "The two new passwords do not match.", ok: "" });
      return;
    }
    if (passwordForm.next === passwordForm.current) {
      setPasswordState({
        busy: false,
        error: "Pick a password you have not used here.",
        ok: "",
      });
      return;
    }

    const result = await updatePassword(passwordForm.current, passwordForm.next);
    if (result?.ok) {
      setPasswordForm({ current: "", next: "", confirm: "" });
      setPasswordState({
        busy: false,
        error: "",
        ok: "Password changed. Other devices stay signed in until their session expires.",
      });
      toast.success("Password changed");
    } else {
      setPasswordState({
        busy: false,
        error: result?.message ?? "Could not change the password.",
        ok: "",
      });
    }
  };

  const onRequestEmailChange = async (event) => {
    event.preventDefault();
    setEmailState({ busy: true, error: "", ok: "" });
    const result = await updateEmail(emailForm.current, emailForm.next);
    if (result?.ok) {
      setEmailForm({ current: "", next: "" });
      setEmailState({
        busy: false,
        error: "",
        ok: "Confirmation sent. Your address changes only after you open the link sent to the new inbox.",
      });
    } else {
      setEmailState({
        busy: false,
        error: result?.message ?? "Could not start the email change.",
        ok: "",
      });
    }
  };

  const onDelete = async (event) => {
    event.preventDefault();
    setDeleteState({ busy: true, error: "" });

    if (deleteForm.phrase.trim().toUpperCase() !== "DELETE") {
      setDeleteState({ busy: false, error: "Type DELETE to confirm." });
      return;
    }
    const result = await removeAccount(deleteForm.password);
    if (result?.ok) {
      toast.info("Account deleted");
      resetLibrary();
      window.location.assign("/");
      return;
    }
    setDeleteState({ busy: false, error: result?.message ?? "Could not delete the account." });
  };

  /** Export everything this browser holds about the viewer, as JSON. */
  const onExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: "BD Screens",
      schema: 1,
      account: user ? { name: user.name, email: user.email, provider: user.provider } : null,
      preferences,
      library: { watchlist, progress: continueWatching, ratings },
      recents: readJSON(KEYS.recentSearches, []),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bd-screens-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  };

  const onClearRecents = () => {
    writeJSON(KEYS.recentSearches, []);
    toast.success("Recent searches cleared");
  };

  return (
    <div className="pt-24 pb-16 sm:pt-28">
      <div className="shell">
        <header className="max-w-2xl">
          <p className="eyebrow flex items-center gap-1.5">
            <SettingsIcon size={12} /> Settings
          </p>
          <h1 className="display mt-2 text-[clamp(2.1rem,4.6vw,3.2rem)] leading-none">
            Everything you can change.
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-mist-400">
            Account, security, playback and privacy in one place. Each change takes effect the
            moment you make it — nothing on this page is decorative.
          </p>
        </header>

        <div className="mt-9 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          {/* -------------------------------------------------- section nav */}
          {/*
            `min-w-0` is load-bearing: a grid item's automatic minimum size is its
            content, so without it the horizontal scroller below reports its full
            row width as the layout width and the page widens to ~790px on a
            phone. The nav itself must be allowed to be narrower than its items.
          */}
          <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-24">
            <ul className="rail flex max-w-full gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = section.id === active;
                return (
                  <li key={section.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => selectSection(section.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={`flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[12.5px] transition ${
                        isActive
                          ? "bg-white/8 text-mist-100"
                          : "text-mist-400 hover:bg-white/4 hover:text-mist-200"
                      } ${section.id === "danger" ? "text-signal-soft/80 hover:text-signal-soft" : ""}`}
                    >
                      <Icon size={14} />
                      {section.label}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 hidden rounded-lg border border-white/8 bg-white/3 p-3 lg:block">
              <p className="text-[10.5px] font-medium text-mist-300">Signed in via</p>
              <p className="mt-0.5 text-[11.5px] text-mist-500">
                {mode === "local" ? "Local demo profile" : (user?.provider ?? "Firebase")}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-mist-600">
                {mode === "local"
                  ? "Settings work, but nothing leaves this browser."
                  : "Sensitive changes ask for your password first."}
              </p>
            </div>
          </nav>

          {/* -------------------------------------------------- section body */}
          <div className="min-w-0 space-y-4" id="settings-panel">
            <h2 className="sr-only">{currentSection.label}</h2>

            {active === "account" && (
              <>
                <Card
                  title="Profile"
                  description="The name shown next to your watch-party messages and reviews."
                >
                  <form onSubmit={onSaveName} className="space-y-3">
                    <div>
                      <label
                        htmlFor="display-name"
                        className="mb-1.5 block text-[12px] font-medium text-mist-300"
                      >
                        Display name
                      </label>
                      <input
                        id="display-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={40}
                        minLength={2}
                        required
                        className="field"
                        autoComplete="nickname"
                      />
                      <p className="mt-1 text-[11px] text-mist-600">
                        2–40 characters. Letters, marks, numbers, spaces and . _ -
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="btn btn-primary h-9 text-[12px]"
                        disabled={nameState.busy || name.trim() === user?.name}
                      >
                        {nameState.busy ? "Saving…" : "Save name"}
                      </button>
                      {name !== user?.name && (
                        <button
                          type="button"
                          className="btn btn-quiet h-9 text-[12px]"
                          onClick={() => setName(user?.name ?? "")}
                        >
                          Undo
                        </button>
                      )}
                    </div>
                    <Note tone="error">{nameState.error}</Note>
                    <Note>{nameState.ok}</Note>
                  </form>
                </Card>

                <Card title="Email address" description="Used to sign in and to contact you.">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-mist-100">{user?.email}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-mist-500">
                        {user?.verified ? (
                          <>
                            <Check size={11} className="text-mint" /> Verified
                          </>
                        ) : (
                          <>
                            <Warning size={11} className="text-amber" /> Not verified
                          </>
                        )}
                        <span className="text-mist-700">·</span>
                        <span>{user?.provider}</span>
                      </p>
                    </div>
                    {user?.verified ? (
                      <button
                        type="button"
                        onClick={() => selectSection("security")}
                        className="btn btn-ghost h-8 text-[11.5px]"
                      >
                        Change email
                      </button>
                    ) : (
                      <Link to="/verify" className="btn btn-ghost h-8 text-[11.5px]">
                        Verify now
                      </Link>
                    )}
                  </div>

                  {user?.createdAt && (
                    <p className="mt-3 text-[11px] text-mist-600">
                      Account created {new Date(user.createdAt).toLocaleDateString()}.
                    </p>
                  )}
                </Card>

                <Card title="Your library" description="Stored in this browser.">
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Watchlist", stats.watchlist],
                      ["In progress", stats.inProgress],
                      ["Rated", stats.rated],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-white/8 bg-white/3 py-2.5"
                      >
                        <dt className="text-[10.5px] text-mist-500">{label}</dt>
                        <dd className="font-display text-xl text-mist-100">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to="/watchlist" className="btn btn-ghost h-8 text-[11.5px]">
                      Open watchlist
                    </Link>
                    <button
                      type="button"
                      onClick={refreshUser}
                      className="btn btn-quiet h-8 text-[11.5px]"
                    >
                      <Refresh size={12} /> Refresh account
                    </button>
                  </div>
                </Card>
              </>
            )}

            {active === "security" && (
              <>
                <Card
                  title="Change password"
                  description="You will stay signed in here; other devices keep their sessions until they expire."
                >
                  {localMode ? (
                    <p className="rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-[12px] leading-relaxed text-mist-400">
                      {mode === "local"
                        ? "Demo mode stores no password, so there is nothing to change."
                        : "Verify your email first — the account is inactive until then."}
                    </p>
                  ) : !user?.hasPassword ? (
                    <p className="rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-[12px] leading-relaxed text-mist-400">
                      This account signs in with {user?.provider}, so it has no password here.
                      Manage the password with that provider.
                    </p>
                  ) : (
                    <form onSubmit={onChangePassword} className="space-y-3">
                      <PasswordField
                        id="current-password"
                        label="Current password"
                        value={passwordForm.current}
                        onChange={(value) =>
                          setPasswordForm({ ...passwordForm, current: value })
                        }
                        hint="Required by Firebase before a sensitive change."
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <PasswordField
                          id="new-password"
                          label="New password"
                          autoComplete="new-password"
                          value={passwordForm.next}
                          onChange={(value) =>
                            setPasswordForm({ ...passwordForm, next: value })
                          }
                        />
                        <PasswordField
                          id="confirm-password"
                          label="Repeat new password"
                          autoComplete="new-password"
                          value={passwordForm.confirm}
                          onChange={(value) =>
                            setPasswordForm({ ...passwordForm, confirm: value })
                          }
                        />
                      </div>

                      {passwordForm.next.length > 0 && (
                        <div>
                          <div className="flex gap-1" aria-hidden="true">
                            {[0, 1, 2, 3, 4].map((index) => (
                              <span
                                key={index}
                                className="h-1 flex-1 rounded-full"
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
                          <p className="mt-1 text-[11px] text-mist-500">{strength.label}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn btn-primary h-9 text-[12px]"
                        disabled={passwordState.busy}
                      >
                        {passwordState.busy ? "Updating…" : "Update password"}
                      </button>
                      <Note tone="error">{passwordState.error}</Note>
                      <Note>{passwordState.ok}</Note>
                    </form>
                  )}
                </Card>

                <Card
                  title="Email address"
                  description="A confirmation link goes to the new address. Until it is opened, the old one stays active."
                >
                  {localMode ? (
                    <p className="rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-[12px] leading-relaxed text-mist-400">
                      Email changes need Firebase. This build is running on a local demo
                      profile.
                    </p>
                  ) : (
                    <form onSubmit={onRequestEmailChange} className="space-y-3">
                      <div>
                        <label
                          htmlFor="new-email"
                          className="mb-1.5 block text-[12px] font-medium text-mist-300"
                        >
                          New email
                        </label>
                        <input
                          id="new-email"
                          type="email"
                          value={emailForm.next}
                          onChange={(event) =>
                            setEmailForm({ ...emailForm, next: event.target.value })
                          }
                          className="field"
                          autoComplete="email"
                          placeholder={user?.email ?? "you@example.com"}
                        />
                      </div>
                      <PasswordField
                        id="email-current-password"
                        label="Confirm with your password"
                        value={emailForm.current}
                        onChange={(value) => setEmailForm({ ...emailForm, current: value })}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary h-9 text-[12px]"
                        disabled={emailState.busy}
                      >
                        {emailState.busy ? "Sending…" : "Send confirmation"}
                      </button>
                      <Note tone="error">{emailState.error}</Note>
                      <Note>{emailState.ok}</Note>
                    </form>
                  )}
                </Card>

                <Card title="Sessions" description="Sign this browser out of your account.">
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      toast.info("Signed out");
                      window.location.assign("/");
                    }}
                    className="btn btn-ghost h-9 text-[12px]"
                  >
                    Sign out of this browser
                  </button>
                </Card>
              </>
            )}

            {active === "playback" && (
              <Card title="Playback" description="Defaults for the player on this browser.">
                <Toggle
                  id="autoplay-next"
                  label="Autoplay the next episode"
                  description="Only for series, and only when you are in the player."
                  checked={preferences.autoplayNext}
                  onChange={(value) => setPreference("autoplayNext", value)}
                />
                <div className="border-t border-white/8">
                  <div className="py-3">
                    <label
                      htmlFor="default-volume"
                      className="block text-[13px] font-medium text-mist-100"
                    >
                      Default volume
                    </label>
                    <p className="mt-0.5 text-[11.5px] text-mist-500">
                      Applied when a new title starts. Current setting:{" "}
                      <span className="text-mist-200">
                        {Math.round(preferences.defaultVolume * 100)}%
                      </span>
                    </p>
                    <input
                      id="default-volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={preferences.defaultVolume}
                      onChange={(event) =>
                        setPreference("defaultVolume", Number(event.target.value))
                      }
                      className="mt-3 w-full accent-signal"
                    />
                  </div>
                </div>
                <div className="border-t border-white/8">
                  <Toggle
                    id="poster-quality"
                    label="Larger poster captions"
                    description="Bigger title text under posters, for reading in bed."
                    checked={preferences.posterQuality === "cosy"}
                    onChange={(value) =>
                      setPreference("posterQuality", value ? "cosy" : "standard")
                    }
                  />
                </div>
                <div className="border-t border-white/8">
                  <Toggle
                    id="spoiler-titles"
                    label="Hide plot details until I ask"
                    description="Titles on cards stay visible; episode-level summaries are collapsed."
                    checked={preferences.spoilerTitles}
                    onChange={(value) => setPreference("spoilerTitles", value)}
                  />
                </div>
              </Card>
            )}

            {active === "accessibility" && (
              <Card
                title="Comfort"
                description="These apply immediately and are remembered on this browser."
              >
                <div className="py-3">
                  <label
                    htmlFor="motion"
                    className="block text-[13px] font-medium text-mist-100"
                  >
                    Motion
                  </label>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-mist-500">
                    Your system is set to{" "}
                    <span className="text-mist-200">
                      {window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
                        ? "reduce motion"
                        : "full motion"}
                    </span>
                    . Choose what this site should do.
                  </p>
                  <div
                    className="mt-3 flex flex-wrap gap-1.5"
                    role="radiogroup"
                    aria-label="Motion"
                  >
                    {[
                      ["system", "Follow system", null],
                      ["reduce", "Reduce motion", true],
                      ["full", "Allow motion", false],
                    ].map(([value, label, setting]) => {
                      const selected = preferences.reduceMotion === setting;
                      return (
                        <button
                          key={String(value)}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setPreference("reduceMotion", setting)}
                          className={`rounded-full border px-3 py-1.5 text-[11.5px] transition ${
                            selected
                              ? "border-amber/50 bg-amber/10 text-amber"
                              : "border-white/12 text-mist-400 hover:border-white/30 hover:text-mist-200"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-white/8">
                  <Toggle
                    id="high-contrast"
                    label="Higher contrast text"
                    description="Lifts the grey body text so it is easier to read on a dim screen."
                    checked={preferences.highContrast}
                    onChange={(value) => setPreference("highContrast", value)}
                  />
                </div>

                <div className="border-t border-white/8 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetPreferences();
                      toast.success("Preferences reset");
                    }}
                    className="btn btn-quiet h-8 text-[11.5px]"
                  >
                    Reset these preferences
                  </button>
                </div>
              </Card>
            )}

            {active === "notifications" && (
              <Card
                title="Notifications"
                description="Stored with your preferences. Delivery needs a backend, which this demo does not have."
              >
                <Toggle
                  id="notify-digest"
                  label="Weekly digest"
                  description="A short email about what is new in the catalogue."
                  hint="Saved now · sends once email delivery exists"
                  checked={preferences.emailDigest}
                  onChange={(value) => setPreference("emailDigest", value)}
                />
                <div className="border-t border-white/8">
                  <Toggle
                    id="notify-party"
                    label="Party invitations"
                    description="Let hosts find your name when they start a room."
                    hint="Applies to new parties you join"
                    checked={preferences.partyInvites}
                    onChange={(value) => setPreference("partyInvites", value)}
                  />
                </div>
                <div className="border-t border-white/8">
                  <Toggle
                    id="notify-recommendations"
                    label="Recommendation refreshes"
                    description="Tell me when a mood shortlist changes because the catalogue did."
                    hint="Saved now · sends once email delivery exists"
                    checked={preferences.recommendations}
                    onChange={(value) => setPreference("recommendations", value)}
                  />
                </div>
                <p className="mt-3 rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-[11px] leading-relaxed text-mist-500">
                  We do not send marketing email from this demo. These switches are real values;
                  the honest label is that nothing is dispatched yet.
                </p>
              </Card>
            )}

            {active === "data" && (
              <>
                <Card
                  title="Export your data"
                  description="One JSON file with your library, preferences and profile."
                >
                  <button
                    type="button"
                    onClick={onExport}
                    className="btn btn-ghost h-9 text-[12px]"
                  >
                    <Download size={14} /> Download JSON
                  </button>
                  <p className="mt-2 text-[11px] text-mist-600">
                    Includes what this browser stores. Passwords are never included — the app
                    never has them.
                  </p>
                </Card>

                <Card
                  title="Clear local data"
                  description="Watchlist, progress and ratings are separate from your account."
                  danger
                >
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onClearRecents}
                      className="btn btn-quiet h-8 text-[11.5px]"
                    >
                      Clear recent searches
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Reset watchlist, progress and ratings on this browser? This cannot be undone.",
                          )
                        ) {
                          resetLibrary();
                          toast.success("Library cleared");
                        }
                      }}
                      className="btn btn-quiet h-8 text-[11.5px]"
                    >
                      Reset watchlist and progress
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-mist-600">
                    Clearing the library does not sign you out. Clearing site data in your
                    browser removes everything, including preferences.
                  </p>
                </Card>
              </>
            )}

            {active === "danger" && (
              <Card
                title="Delete the account"
                description="This removes the account permanently. Your local watchlist and progress stay on this device until you clear them."
                danger
              >
                {localMode ? (
                  <p className="rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-[12px] leading-relaxed text-mist-400">
                    {mode === "local"
                      ? "Demo mode: there is no server account to delete. Clearing your library above removes the local data."
                      : "Verify your email first. Deletion needs an active account."}
                  </p>
                ) : (
                  <form onSubmit={onDelete} className="space-y-3">
                    <PasswordField
                      id="delete-password"
                      label="Confirm with your password"
                      value={deleteForm.password}
                      onChange={(value) => setDeleteForm({ ...deleteForm, password: value })}
                    />
                    <div>
                      <label
                        htmlFor="delete-phrase"
                        className="mb-1.5 block text-[12px] font-medium text-mist-300"
                      >
                        Type <span className="font-mono text-signal-soft">DELETE</span> to
                        confirm
                      </label>
                      <input
                        id="delete-phrase"
                        value={deleteForm.phrase}
                        onChange={(event) =>
                          setDeleteForm({ ...deleteForm, phrase: event.target.value })
                        }
                        className="field font-mono uppercase"
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={deleteState.busy}
                      className="btn h-9 border border-signal/40 bg-signal/12 text-[12px] text-signal-soft hover:bg-signal/20"
                    >
                      <Close size={13} />
                      {deleteState.busy ? "Deleting…" : "Delete account permanently"}
                    </button>
                    <Note tone="error">{deleteState.error}</Note>
                  </form>
                )}
              </Card>
            )}
          </div>
        </div>

        <p className="mt-10 flex items-center gap-1.5 border-t border-white/8 pt-4 text-[11px] text-mist-600">
          <Lock size={11} />
          {mode === "firebase"
            ? "Passwords are handled by Firebase Authentication. This app never stores one."
            : "Demo mode: this browser only. Nothing leaves the device."}
        </p>
      </div>
    </div>
  );
}
