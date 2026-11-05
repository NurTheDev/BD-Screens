/**
 * @file ContinueWatching.jsx
 * @description "Pick up where you left off" row.
 *
 * The cards here are wide (16:9) rather than posters, because progress needs
 * horizontal space to breathe: artwork, title, a real progress bar and the
 * remaining time. This is the one row on the page that is about *you* instead of
 * the catalogue, so it deliberately looks different from the poster rails.
 */

import { Link } from "react-router-dom";
import { useLibrary } from "../../lib/library.jsx";
import { Play, Close } from "../ui/Icons.jsx";

/** @param {number} seconds */
function remaining(seconds) {
  if (!seconds || seconds < 0) return "";
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "less than a minute left";
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min left` : `${hours} h left`;
}

export function ContinueWatching() {
  const { continueWatching, clearProgress } = useLibrary();
  if (continueWatching.length === 0) return null;

  return (
    <section className="shell mt-14" aria-labelledby="continue-heading">
      <div className="flex items-end justify-between gap-4 pb-3">
        <div>
          <h2
            id="continue-heading"
            className="text-[17px] font-semibold tracking-tight sm:text-lg"
          >
            Continue watching
          </h2>
          <p className="mt-0.5 text-xs text-mist-500">
            {continueWatching.length === 1
              ? "One film waiting for you"
              : `${continueWatching.length} films waiting for you`}
          </p>
        </div>
      </div>

      <div className="rail no-scrollbar" role="group" aria-label="Continue watching">
        {continueWatching.map((entry) => (
          <div key={entry.id} className="group relative w-[240px] sm:w-[288px]">
            <Link
              to={`/title/${entry.id}`}
              className="block overflow-hidden rounded-xl border border-white/8 bg-ink-850 transition hover:border-white/20"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={entry.poster ?? "/art/plates/plate-chaya.jpg"}
                  alt=""
                  loading="lazy"
                  className="h-full w-full scale-110 object-cover opacity-80 blur-[1px] transition duration-500 group-hover:scale-[1.14] group-hover:opacity-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />

                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-200 group-hover:opacity-100">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mist-100 text-ink-950 shadow-lg">
                    <Play size={18} />
                  </span>
                </span>

                <div className="absolute inset-x-0 bottom-0">
                  <div className="h-[3px] w-full bg-white/15">
                    <div
                      className="h-full bg-signal"
                      style={{ width: `${Math.max(3, entry.percent)}%` }}
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2 p-2.5">
                    <h3 className="truncate text-[12.5px] font-medium text-mist-100">
                      {entry.title}
                    </h3>
                    <span className="shrink-0 text-[10.5px] text-mist-400">
                      {remaining(entry.duration - entry.seconds)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => clearProgress(entry.id)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink-950/80 text-mist-300 opacity-0 backdrop-blur transition hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Remove ${entry.title} from continue watching`}
            >
              <Close size={13} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
