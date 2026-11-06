/**
 * @file Hero.jsx
 * @description The opening screen: one featured title, large, with a slow
 * background rotation and enough real information to make a decision.
 *
 * Design decisions worth defending:
 *  - The artwork rotates every 9s, pauses on hover/focus, and stops entirely
 *    when the tab is hidden or the user prefers reduced motion. Auto-advancing
 *    content that cannot be paused is an accessibility failure; this one can be.
 *  - The copy sits in the left third with a readable measure (max 46ch) over a
 *    gradient scrim — never white text straight on a busy still.
 *  - Progress dots double as buttons, and every slide is a link to its title.
 *  - There is no autoplaying video with sound. Ever.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLibrary } from "../../lib/library.jsx";
import { useMediaQuery } from "../../hooks/useFetch.js";
import { usePreferences } from "../../lib/preferences.jsx";
import { Play, Info, Plus, Check, Star, Clock } from "../ui/Icons.jsx";
import { LivePill } from "../ui/Brand.jsx";

const ROTATE_MS = 9000;

/**
 * @param {{ items: any[], loading?: boolean }} props
 */
export function Hero({ items, loading = false }) {
  const slides = items?.slice(0, 4) ?? [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const systemReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  // The Settings choice wins over the OS query; `null` there means "follow it".
  const { motionReduced } = usePreferences();
  const reducedMotion = motionReduced ?? systemReduced;
  const timer = useRef(/** @type {any} */ (null));

  const { inWatchlist, toggleWatchlist } = useLibrary();
  const active = slides[index];

  const go = useCallback(
    (/** @type {number} */ next) => {
      if (slides.length === 0) return;
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length],
  );

  /* Rotation */
  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return undefined;

    const tick = () => {
      if (document.hidden) return; // do not advance in a background tab
      setIndex((current) => (current + 1) % slides.length);
    };
    timer.current = setInterval(tick, ROTATE_MS);
    return () => clearInterval(timer.current);
  }, [slides.length, paused, reducedMotion]);

  /* Reset to the first slide whenever the content changes (e.g. data arrives). */
  const firstSlideId = slides[0]?.id;
  useEffect(() => setIndex(0), [firstSlideId]);

  if (loading || !active) {
    return (
      <section className="relative min-h-[86svh] w-full overflow-hidden" aria-busy="true">
        <div className="skeleton absolute inset-0 rounded-none" />
        <div className="shell relative flex min-h-[86svh] flex-col justify-end pb-16">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton mt-5 h-14 w-3/4 max-w-xl" />
          <div className="skeleton mt-4 h-4 w-2/3 max-w-md" />
          <div className="mt-8 flex gap-3">
            <div className="skeleton h-11 w-32 rounded-full" />
            <div className="skeleton h-11 w-28 rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  const year = active.year ?? String(active.releaseDate ?? "").slice(0, 4);
  const saved = inWatchlist(active.id);

  return (
    <section
      className="relative isolate min-h-[86svh] w-full overflow-hidden sm:min-h-[86svh]"
      aria-roledescription="carousel"
      aria-label="Featured titles"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Artwork stack — cross-faded, not a sliding track, so the layout never jumps. */}
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-[1100ms] ${
            slideIndex === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={slideIndex !== index}
        >
          <img
            src={slide.hero ?? slide.backdrop ?? slide.poster}
            alt=""
            loading={slideIndex === 0 ? "eager" : "lazy"}
            fetchPriority={slideIndex === 0 ? "high" : "auto"}
            className="h-full w-full object-cover"
            style={
              slideIndex === index && !reducedMotion
                ? { animation: "kenBurns 14s ease-out both" }
                : undefined
            }
          />
        </div>
      ))}

      {/*
        Scrim strategy: the left third must carry copy at 7:1 contrast, the right
        third must stay visible (it is the artwork the title is selling). Hence a
        horizontal gradient that is opaque at 0% and almost clear at 70%, plus a
        vertical pass that only darkens the top edge (under the navbar) and the
        bottom (where the next section begins).
      */}
      <div className="absolute inset-0 bg-[linear-gradient(97deg,rgba(8,8,11,0.97)_0%,rgba(8,8,11,0.88)_26%,rgba(8,8,11,0.45)_52%,rgba(8,8,11,0.08)_74%,rgba(8,8,11,0.35)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,11,0.75)_0%,transparent_28%,transparent_62%,rgba(8,8,11,0.92)_100%)]" />

      <div className="shell relative flex min-h-[86svh] flex-col justify-end pb-12 pt-24 sm:pb-20 sm:pt-28">
        <div className="max-w-[46rem]">
          <div className="flex flex-wrap items-center gap-2.5">
            <LivePill label={active.kind === "series" ? "New series" : "Featured film"} />
            {active.genres?.slice(0, 2).map((/** @type {string} */ genre) => (
              <span
                key={genre}
                className="text-[11px] font-medium uppercase tracking-[0.16em] text-mist-400"
              >
                {genre}
              </span>
            ))}
          </div>

          <h1 className="display mt-3 text-[clamp(2.35rem,7.4vw,5.6rem)] text-mist-100">
            {active.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-mist-300">
            {active.rating > 0 && (
              <span className="flex items-center gap-1.5 font-semibold text-amber">
                <Star size={14} filled />
                {active.rating.toFixed(1)}
                <span className="font-normal text-mist-500">/10</span>
              </span>
            )}
            {year && <span>{year}</span>}
            {active.runtime && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                {active.kind === "series"
                  ? `${active.runtime} min per episode`
                  : `${active.runtime} min`}
              </span>
            )}
            {active.maturity && (
              <span className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-mist-300">
                {active.maturity}
              </span>
            )}
            <span className="text-mist-500">{active.language ?? "Bengali"}</span>
          </div>

          <p className="mt-3 max-w-[44ch] sm:mt-4 text-[13.5px] leading-relaxed text-mist-300 sm:text-[15px]">
            {active.overview}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2 sm:mt-7">
            <Link
              to={`/title/${active.id}`}
              className="btn btn-primary h-11 px-6 text-[13.5px]"
            >
              <Play size={16} />
              Watch now
            </Link>

            <Link to={`/title/${active.id}`} className="btn btn-ghost h-11 px-5 text-[13.5px]">
              <Info size={16} />
              More info
            </Link>

            <button
              type="button"
              onClick={() => toggleWatchlist(active)}
              className="btn btn-ghost h-11 px-4 text-[13.5px]"
              aria-pressed={saved}
            >
              {saved ? <Check size={16} /> : <Plus size={16} />}
              <span className="hidden sm:inline">{saved ? "In watchlist" : "Watchlist"}</span>
            </button>

            <Link
              to={`/party?title=${encodeURIComponent(active.id)}`}
              className="btn btn-quiet h-11 text-[13px]"
            >
              Watch with friends
            </Link>
          </div>
        </div>

        {/* Slide selector */}
        {slides.length > 1 && (
          <div
            className="mt-10 flex items-center gap-2"
            role="tablist"
            aria-label="Choose featured title"
          >
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={slideIndex === index}
                aria-label={slide.title}
                onClick={() => go(slideIndex)}
                className="group relative h-1 overflow-hidden rounded-full bg-white/20 transition-all"
                style={{ width: slideIndex === index ? 46 : 18 }}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-mist-100"
                  style={{
                    width: slideIndex === index ? "100%" : "0%",
                    transition:
                      slideIndex === index && !paused && !reducedMotion
                        ? `width ${ROTATE_MS}ms linear`
                        : "width .3s ease",
                  }}
                />
              </button>
            ))}
            <span className="ml-2 text-[11px] tabular-nums text-mist-500">
              {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      {/* Scroll cue */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950 to-transparent" />
    </section>
  );
}
