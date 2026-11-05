/**
 * @file Poster.jsx
 * @description The poster card used by every rail, grid and search result.
 *
 * Details that make it feel finished rather than assembled:
 *  - fixed 2:3 ratio via `aspect-ratio` (no layout shift as images load),
 *  - a real loading state (shimmer) and a graceful error fallback,
 *  - the title is always in the DOM for screen readers and for when the artwork
 *    fails, instead of being hidden until hover,
 *  - hover reveals a compact action bar (play, add, party) but the whole card
 *    remains one link, so keyboard users get one stop, not four,
 *  - optional `match` badge renders the Mood Match score.
 */

import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Plus, Check, Star } from "./Icons.jsx";

/**
 * @param {{
 *   title: any,
 *   index?: number,
 *   eager?: boolean,
 *   showMeta?: boolean,
 *   match?: number,
 *   onToggleWatchlist?: (title: any) => void,
 *   inWatchlist?: boolean,
 *   className?: string,
 * }} props
 */
function PosterBase({
  title,
  index = 0,
  eager = false,
  showMeta = false,
  match,
  onToggleWatchlist,
  inWatchlist = false,
  className = "",
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const href = `/title/${title.id}`;
  const year = title.year ?? (title.releaseDate ? String(title.releaseDate).slice(0, 4) : null);

  return (
    <article className={`group/poster relative ${className}`}>
      <Link
        to={href}
        className="poster-card block focus-visible:outline-offset-4"
        aria-label={`${title.title}${year ? `, ${year}` : ""}${title.rating ? `, rated ${title.rating} out of 10` : ""}`}
        style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {/*
            Image and skeleton are both painted, in a fixed stacking order: the
            image fades in *over* the skeleton. Swapping them out (as the first
            version did) produced a visible flash in headless rendering and on
            slow connections.
          */}
          <div className="skeleton absolute inset-0 rounded-none" aria-hidden="true" />

          {failed ? (
            // Deterministic gradient fallback keeps the grid tidy when artwork 404s.
            <div
              className="flex h-full w-full flex-col justify-end p-3"
              style={{
                background: `linear-gradient(160deg, ${title.accent ?? "#1e1e29"}, #0c0c11)`,
              }}
            >
              <p className="font-display text-lg leading-tight text-mist-100">{title.title}</p>
              {year && <p className="mt-1 text-[11px] text-mist-400">{year}</p>}
            </div>
          ) : (
            <img
              src={title.poster ?? `/api/art/${encodeURIComponent(title.id)}.svg?w=600&h=900`}
              alt=""
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={`relative h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out ${
                loaded ? "scale-100 opacity-100" : "scale-105 opacity-0"
              } group-hover/poster:scale-[1.04]`}
            />
          )}

          {/* Bottom scrim: guarantees the hover controls stay legible on any artwork. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/10 to-transparent opacity-80 transition group-hover/poster:opacity-100" />

          {match !== undefined && (
            <span className="absolute left-2 top-2 rounded-full bg-ink-950/80 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-mint backdrop-blur">
              {match}% match
            </span>
          )}

          {title.kind === "series" && (
            <span className="absolute right-2 top-2 rounded bg-ink-950/75 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mist-200 backdrop-blur">
              Series
            </span>
          )}

          {/* Hover controls */}
          <div className="absolute inset-x-2 bottom-2 flex translate-y-2 items-center gap-1.5 opacity-0 transition duration-200 group-hover/poster:translate-y-0 group-hover/poster:opacity-100 group-focus-visible/poster:translate-y-0 group-focus-visible/poster:opacity-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mist-100 text-ink-950">
              <Play size={16} />
            </span>

            {onToggleWatchlist && (
              <button
                type="button"
                onClick={(event) => {
                  // The card is a link; this control must not navigate.
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleWatchlist(title);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-ink-950/70 text-mist-100 backdrop-blur transition hover:border-white/60"
                aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                aria-pressed={inWatchlist}
              >
                {inWatchlist ? <Check size={15} /> : <Plus size={15} />}
              </button>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-2 min-w-0">
        <Link to={href} className="block">
          <h3 className="truncate text-[13px] font-medium text-mist-100 transition group-hover/poster:text-white">
            {title.title}
          </h3>
        </Link>

        {showMeta && (
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-mist-500">
            {year && <span>{year}</span>}
            {title.rating > 0 && (
              <span className="flex items-center gap-0.5 text-mist-400">
                <Star size={10} filled />
                {title.rating.toFixed(1)}
              </span>
            )}
            {title.genres?.[0] && <span className="truncate">{title.genres[0]}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Memoized: rails re-render whenever the parent does, and posters are the most
 * expensive leaf nodes on the page.
 */
export const Poster = memo(PosterBase);
