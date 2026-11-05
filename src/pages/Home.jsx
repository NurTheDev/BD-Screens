/**
 * @file Home.jsx
 * @description Landing page: hero → moods → continue watching → editorial rails.
 *
 * One request (`/api/feeds`) drives the whole page. The server already absorbed
 * the fan-out and the fallbacks, so this component stays a layout: skeleton while
 * loading, a single honest error state with a retry, then content.
 */

import { useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useFetch } from "../hooks/useFetch.js";
import { useLibrary } from "../lib/library.jsx";
import { Hero } from "../components/home/Hero.jsx";
import { MoodStrip } from "../components/home/MoodStrip.jsx";
import { ContinueWatching } from "../components/home/ContinueWatching.jsx";
import { SpotlightCard } from "../components/home/SpotlightCard.jsx";
import { BuildNotes } from "../components/home/BuildNotes.jsx";
import { Rail, RailItem } from "../components/ui/Rail.jsx";
import { Poster } from "../components/ui/Poster.jsx";
import { Refresh, Warning } from "../components/ui/Icons.jsx";

export function Home() {
  const { data, loading, error, reload } = useFetch(
    useCallback((signal) => api.feeds(signal), []),
    [],
  );

  const { inWatchlist, toggleWatchlist } = useLibrary();

  /* Fatal error: the API itself is unreachable. Everything else degrades quietly. */
  if (error) {
    return (
      <div className="shell flex min-h-[70svh] flex-col items-center justify-center text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-signal/40 text-signal">
          <Warning size={22} />
        </span>
        <h1 className="font-display text-3xl">We could not load the catalogue</h1>
        <p className="mt-2 max-w-md text-sm text-mist-400">{error.message}</p>
        <button type="button" onClick={reload} className="btn btn-ghost mt-6">
          <Refresh size={16} /> Try again
        </button>
      </div>
    );
  }

  const rows = data?.rows ?? [];
  const spotlight = data?.spotlight ?? [];
  const editorial = rows.find((/** @type {any} */ row) => row.id === "bd-originals")
    ?.items?.[0];

  return (
    <div className="pb-10">
      <Hero items={spotlight} loading={loading} />

      <MoodStrip />

      <ContinueWatching />

      {/* Demo-mode banner: honest, dismissible, and it links to the docs. */}
      {data?.meta?.degraded && (
        <div className="shell mt-8">
          <p className="flex flex-wrap items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-[12px] text-mist-400">
            <span className="chip h-5 px-2 text-[10px]">Demo catalogue</span>
            Streaming live data is offline in this environment, so you are seeing the bundled BD
            Screens Originals set. Every feature below works the same way.
          </p>
        </div>
      )}

      <div className="mt-10 space-y-9 sm:mt-12 sm:space-y-11">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Rail key={index} title="Loading" loading />
            ))
          : rows.map((row, index) => (
              <div key={row.id}>
                <Rail title={row.title} subtitle={row.subtitle} href={row.href}>
                  {row.items.map(
                    (/** @type {any} */ title, /** @type {number} */ itemIndex) => (
                      <RailItem key={title.id}>
                        <Poster
                          title={title}
                          index={itemIndex}
                          eager={index === 0 && itemIndex < 6}
                          onToggleWatchlist={toggleWatchlist}
                          inWatchlist={inWatchlist(title.id)}
                        />
                      </RailItem>
                    ),
                  )}
                </Rail>

                {/* Editorial break after the second row keeps the page from
                    becoming an endless wall of posters. */}
                {index === 1 && editorial && <SpotlightCard title={editorial} />}
              </div>
            ))}
      </div>

      <BuildNotes />

      <section className="shell mt-10">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.055] to-transparent p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-display text-[24px] leading-tight sm:text-[28px]">
              Not sure what to watch?
            </h2>
            <p className="mt-1.5 max-w-md text-[13px] text-mist-400">
              Answer three short questions and get a shortlist built for your taste — not the
              same “popular” list everyone else sees.
            </p>
          </div>
          <Link to="/discover" className="btn btn-primary shrink-0">
            Find my film
          </Link>
        </div>
      </section>
    </div>
  );
}
