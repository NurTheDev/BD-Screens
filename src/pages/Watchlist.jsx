/**
 * @file Watchlist.jsx
 * @description The viewer's own list, plus a "what should I actually watch" nudge.
 *
 * Two things make this page more than a grid:
 *  1. the oldest item is surfaced as "sitting here longest", because watchlists
 *     are where films go to be forgotten,
 *  2. the total runtime of the list is shown, which reframes it as a queue
 *     ("you have 14 hours picked out") instead of a pile.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useLibrary } from "../lib/library.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { Bookmark, Clock, Play, Trash, Warning } from "../components/ui/Icons.jsx";

/** @param {number} minutes */
function hours(minutes) {
  if (!minutes) return "unknown length";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export default function Watchlist() {
  const { watchlist, toggleWatchlist, stats, continueWatching } = useLibrary();
  const toast = useToast();

  const totalMinutes = useMemo(
    () =>
      watchlist.reduce(
        (sum, entry) => sum + (entry.runtime && entry.kind !== "series" ? entry.runtime : 0),
        0,
      ),
    [watchlist],
  );

  const oldest = useMemo(
    () => [...watchlist].sort((a, b) => a.addedAt - b.addedAt)[0],
    [watchlist],
  );

  if (watchlist.length === 0) {
    return (
      <div className="shell flex min-h-[72svh] flex-col items-center justify-center py-24 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/12 text-mist-400">
          <Bookmark size={24} />
        </span>
        <h1 className="mt-5 font-display text-[32px] leading-tight">Your watchlist is empty</h1>
        <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-mist-400">
          Add titles from any poster — the small plus on hover. They are saved on this device,
          no account needed.
        </p>
        <div className="mt-6 flex gap-2">
          <Link to="/browse" className="btn btn-primary">
            Browse titles
          </Link>
          <Link to="/discover" className="btn btn-ghost">
            Find by mood
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 sm:pt-28">
      <header className="shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Your library</p>
            <h1 className="display mt-2 text-[clamp(2.2rem,5vw,3.6rem)] leading-none">
              Watchlist
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-mist-400">
              <span>{watchlist.length} saved</span>
              <span className="text-mist-700">·</span>
              <span className="flex items-center gap-1">
                <Clock size={12} /> {hours(totalMinutes)} of viewing picked out
              </span>
              {continueWatching.length > 0 && (
                <>
                  <span className="text-mist-700">·</span>
                  <span>{continueWatching.length} in progress</span>
                </>
              )}
            </p>
          </div>

          <Link to="/discover" className="btn btn-ghost h-9 text-[12px]">
            Add more by mood
          </Link>
        </div>
      </header>

      {/* "Sitting here longest" — a gentle nudge, not a blocking modal. */}
      {oldest && watchlist.length >= 3 && (
        <div className="shell mt-7">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber/20 bg-amber/[0.06] px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber">
              <Warning size={15} />
            </span>
            <p className="flex-1 text-[12.5px] leading-snug text-mist-200">
              <span className="font-medium text-mist-100">{oldest.title}</span> has been waiting{" "}
              {Math.max(1, Math.round((Date.now() - oldest.addedAt) / 86400000))} day
              {Math.round((Date.now() - oldest.addedAt) / 86400000) === 1 ? "" : "s"}. Start
              there tonight?
            </p>
            <Link to={`/watch/${oldest.id}`} className="btn btn-primary h-8 text-[11.5px]">
              <Play size={12} /> Play now
            </Link>
          </div>
        </div>
      )}

      <ul className="shell mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {watchlist.map((entry) => (
          <li key={entry.id} className="group relative">
            <Link to={`/title/${entry.id}`} className="poster-card block">
              <div className="relative aspect-[2/3] w-full overflow-hidden">
                <img
                  src={entry.poster ?? `/api/art/${encodeURIComponent(entry.id)}.svg`}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent opacity-70" />
                <span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-mist-100 text-ink-950 opacity-0 transition group-hover:opacity-100">
                  <Play size={14} />
                </span>
              </div>
            </Link>

            <div className="mt-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to={`/title/${entry.id}`}>
                  <h2 className="truncate text-[12.5px] font-medium text-mist-100">
                    {entry.title}
                  </h2>
                </Link>
                <p className="mt-0.5 text-[10.5px] text-mist-500">
                  {entry.year ?? "—"}
                  {entry.runtime ? ` · ${entry.runtime} min` : ""}
                  {entry.kind === "series" ? " · Series" : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  toggleWatchlist(entry);
                  toast.success("Removed from watchlist");
                }}
                className="shrink-0 rounded p-1 text-mist-600 opacity-0 transition hover:text-signal-soft group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Remove ${entry.title} from watchlist`}
              >
                <Trash size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p className="shell mt-10 text-[11px] text-mist-600">
        Stored on this device ({stats.watchlist} entries). Clearing site data clears the list.
      </p>
    </div>
  );
}
