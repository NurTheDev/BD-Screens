/**
 * @file Profile.jsx
 * @description The viewer's own page: who they are, what they have watched, and
 * how their taste is shaping up.
 *
 * This is deliberately not a second settings form. Settings is where you change
 * things; this is where you *see* them. The only editable element is the name,
 * inline, because that is the one field people want to fix the moment they see
 * it — sending them to another page for that is friction for no reason.
 *
 * Everything else is derived from data the app already keeps: watchlist,
 * in-progress titles, ratings, and the mood shortlist saved from Discover.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { useLibrary } from "../lib/library.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { Poster } from "../components/ui/Poster.jsx";
import {
  Check,
  Clock,
  Edit3,
  Logout,
  Mail,
  Settings,
  Shield,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
  Warning,
} from "../components/ui/Icons.jsx";

/** A labelled statistic. Kept dumb so the dashboard stays readable. */
function Stat({ label, value, hint }) {
  return (
    <div className="panel px-4 py-3">
      <p className="text-[10.5px] uppercase tracking-[0.14em] text-mist-600">{label}</p>
      <p className="mt-1 font-display text-[26px] leading-none text-mist-100">{value}</p>
      {hint && <p className="mt-1 text-[10.5px] text-mist-600">{hint}</p>}
    </div>
  );
}

export default function Profile() {
  const toast = useToast();
  const { user, mode, updateName, signOut } = useAuth();
  const { watchlist, continueWatching, ratings, stats } = useLibrary();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* If the name changes elsewhere (another tab, or the provider), resync. */
  useEffect(() => {
    if (!editing) setDraft(user?.name ?? "");
  }, [user?.name, editing]);

  const onSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await updateName(draft);
    setSaving(false);
    if (result?.ok) {
      setEditing(false);
      toast.success("Name updated");
    } else {
      setError(result?.message ?? "Could not save the name.");
    }
  };

  const liked = Object.values(ratings).filter((verdict) => verdict === "up").length;
  const disliked = Object.values(ratings).filter((verdict) => verdict === "down").length;

  /*
   * Watch time is the one number here that is not a count, so it is derived from
   * the progress the player already saves. Rounded down to hours: "2.4 hours"
   * implies a precision the sample does not have.
   */
  const watchTime = (() => {
    const minutes = continueWatching.reduce(
      (total, entry) => total + (entry.seconds ?? 0) / 60,
      0,
    );
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${Math.floor(minutes / 60)}h`;
  })();

  const initials = (user?.name ?? "Viewer")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <div className="pt-24 pb-16 sm:pt-28">
      <div className="shell">
        {/* ------------------------------------------------------- identity */}
        <header className="panel-raised relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(120% 100% at 0% 0%, rgba(244,55,75,0.35), transparent 55%), radial-gradient(100% 100% at 100% 0%, rgba(150,120,255,0.28), transparent 60%)",
            }}
            aria-hidden="true"
          />

          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
            {user?.photo ? (
              <img
                src={user.photo}
                alt=""
                className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-white/20"
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-signal to-lilac font-display text-[26px] text-white ring-1 ring-white/20">
                {initials || <User size={26} />}
              </span>
            )}

            <div className="min-w-0 flex-1">
              {editing ? (
                <form onSubmit={onSave} className="max-w-sm">
                  <label htmlFor="profile-name" className="sr-only">
                    Display name
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id="profile-name"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      maxLength={40}
                      minLength={2}
                      autoFocus
                      className="field h-10 flex-1 text-[16px]"
                    />
                    <button type="submit" className="btn btn-primary h-10" disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet h-10"
                      onClick={() => {
                        setEditing(false);
                        setDraft(user?.name ?? "");
                        setError("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  {error && (
                    <p role="alert" className="mt-1.5 text-[11.5px] text-signal-soft">
                      {error}
                    </p>
                  )}
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="display text-[clamp(1.9rem,4vw,2.8rem)] leading-none">
                    {user?.name}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-full p-1.5 text-mist-500 transition hover:bg-white/8 hover:text-mist-100"
                    aria-label="Edit display name"
                    title="Edit display name"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}

              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mist-400">
                <span className="inline-flex items-center gap-1">
                  <Mail size={12} /> {user?.email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Shield size={12} />
                  {user?.verified ? "Verified account" : "Unverified"}
                </span>
                {memberSince && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> Since {memberSince}
                  </span>
                )}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="chip h-6 px-2 text-[10.5px] text-mist-300">
                  {mode === "firebase" ? (user?.provider ?? "Firebase") : "Local demo profile"}
                </span>
                {user?.hasPassword && (
                  <span className="chip h-6 px-2 text-[10.5px] text-mist-300">
                    Password sign-in
                  </span>
                )}
                {!user?.verified && (
                  <Link
                    to="/verify"
                    className="chip h-6 border-amber/40 px-2 text-[10.5px] text-amber"
                  >
                    <Warning size={10} /> Verify to activate
                  </Link>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <Link to="/settings" className="btn btn-ghost h-9 text-[12px]">
                <Settings size={14} /> Settings
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  window.location.assign("/");
                }}
                className="btn btn-quiet h-9 text-[12px]"
              >
                <Logout size={14} /> Sign out
              </button>
            </div>
          </div>
        </header>

        {/* ------------------------------------------------------- statistics */}
        <section className="mt-4" aria-label="Your activity">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="In watchlist" value={stats.watchlist} />
            <Stat label="In progress" value={stats.inProgress} />
            <Stat label="Rated" value={stats.rated} hint={`${liked} up · ${disliked} down`} />
            <Stat label="Watched" value={watchTime} hint="From saved progress" />
          </div>
        </section>

        {/* --------------------------------------------------- continue watching */}
        {continueWatching.length > 0 && (
          <section className="mt-10" aria-labelledby="resume-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="resume-heading" className="text-[15px] font-semibold text-mist-100">
                Pick up where you left off
              </h2>
              <Link to="/watchlist" className="text-[11.5px] text-mist-400 hover:text-mist-100">
                Full watchlist
              </Link>
            </div>

            <ul className="mt-3 space-y-1.5">
              {continueWatching.slice(0, 4).map((entry) => (
                <li key={entry.id}>
                  <Link
                    to={`/watch/${entry.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-white/6 bg-white/3 px-2.5 py-2 transition hover:border-white/15 hover:bg-white/6"
                  >
                    <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded">
                      {entry.poster && (
                        <img src={entry.poster} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-mist-100 group-hover:text-white">
                        {entry.title}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full rounded-full bg-signal"
                            style={{ width: `${entry.percent}%` }}
                          />
                        </span>
                        <span className="font-mono text-[10px] text-mist-500">
                          {entry.percent}%
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ------------------------------------------------------------ taste */}
        <section className="mt-10" aria-labelledby="taste-heading">
          <h2 id="taste-heading" className="text-[15px] font-semibold text-mist-100">
            Your taste, as recorded
          </h2>
          <p className="mt-1 text-[12px] text-mist-500">
            Ratings are what Mood Match uses to nudge the shortlist. There are no hidden
            signals.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="panel p-4">
              <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-mint">
                <ThumbsUp size={12} /> Liked
              </p>
              <p className="mt-1 font-display text-2xl text-mist-100">{liked}</p>
              <p className="mt-1 text-[11px] text-mist-600">
                {liked === 0
                  ? "Rate a title from its page to start."
                  : "These pull the shortlist."}
              </p>
            </div>
            <div className="panel p-4">
              <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-signal-soft">
                <ThumbsDown size={12} /> Not for me
              </p>
              <p className="mt-1 font-display text-2xl text-mist-100">{disliked}</p>
              <p className="mt-1 text-[11px] text-mist-600">
                {disliked === 0 ? "Nothing marked down yet." : "These get pushed down."}
              </p>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- watchlist */}
        <section className="mt-10" aria-labelledby="saved-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="saved-heading" className="text-[15px] font-semibold text-mist-100">
              Saved for later
            </h2>
            <Link to="/watchlist" className="text-[11.5px] text-mist-400 hover:text-mist-100">
              Manage
            </Link>
          </div>

          {watchlist.length === 0 ? (
            <div className="panel mt-3 flex flex-col items-start gap-2 p-5">
              <p className="flex items-center gap-1.5 text-[12.5px] text-mist-300">
                <Star size={13} className="text-amber" /> Nothing saved yet.
              </p>
              <Link to="/browse" className="btn btn-ghost h-8 text-[11.5px]">
                Browse the catalogue
              </Link>
            </div>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
              {watchlist.slice(0, 5).map((entry, index) => (
                <li key={entry.id}>
                  <Poster title={entry} index={index} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-10 flex flex-wrap items-center gap-3 border-t border-white/8 pt-5 text-[11.5px] text-mist-500">
          <span className="inline-flex items-center gap-1">
            <Check size={11} className="text-mint" /> Library stored on this device
          </span>
          <span className="text-mist-700">·</span>
          <Link to="/settings#security" className="hover:text-mist-100">
            Password and email
          </Link>
          <span className="text-mist-700">·</span>
          <Link to="/settings#data" className="hover:text-mist-100">
            Export or delete data
          </Link>
        </footer>
      </div>
    </div>
  );
}
