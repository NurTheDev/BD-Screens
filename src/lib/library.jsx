/**
 * @file library.jsx
 * @description The viewer's own data: watchlist, playback progress, taste ratings.
 *
 * Kept in one context because these three things talk to each other. The best
 * example is **Continue Watching**: it only appears once progress exists, and it
 * disappears the moment a title is finished — that interaction is why progress
 * and watchlist live behind the same provider.
 *
 * Persistence is localStorage (see lib/storage.js). No account is required to
 * build a library, which is a deliberate product decision: the first session
 * should not cost a signup.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { KEYS, readJSON, writeJSON } from "./storage.js";

/** @typedef {{ id: string, title: string, poster: string | null, kind: string, year: number | null, addedAt: number, runtime: number | null }} WatchlistEntry */
/** @typedef {{ id: string, title: string, poster: string | null, seconds: number, duration: number, updatedAt: number }} ProgressEntry */

const MAX_ENTRIES = 80;

/** @type {import("react").Context<any>} */
const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  /** @type {[WatchlistEntry[], Function]} */
  const [watchlist, setWatchlist] = useState(() => readJSON(KEYS.watchlist, []));
  /** @type {[ProgressEntry[], Function]} */
  const [progress, setProgress] = useState(() => readJSON(KEYS.progress, []));
  /** @type {[Record<string, "up" | "down">, Function]} */
  const [ratings, setRatings] = useState(() => readJSON(KEYS.tasteRatings, {}));

  // Persist after every change. These arrays are tiny; no debounce needed.
  useEffect(() => writeJSON(KEYS.watchlist, watchlist), [watchlist]);
  useEffect(() => writeJSON(KEYS.progress, progress), [progress]);
  useEffect(() => writeJSON(KEYS.tasteRatings, ratings), [ratings]);

  /* ---------------- Watchlist ---------------- */

  const inWatchlist = useCallback(
    (/** @type {string} */ id) => watchlist.some((entry) => entry.id === id),
    [watchlist],
  );

  const toggleWatchlist = useCallback((/** @type {any} */ title) => {
    setWatchlist((current) => {
      const exists = current.some((entry) => entry.id === title.id);
      if (exists) return current.filter((entry) => entry.id !== title.id);

      /** @type {WatchlistEntry} */
      const entry = {
        id: title.id,
        title: title.title,
        poster: title.poster ?? null,
        kind: title.kind ?? "movie",
        year: title.year ?? null,
        runtime: title.runtime ?? null,
        addedAt: Date.now(),
      };
      return [entry, ...current].slice(0, MAX_ENTRIES);
    });
  }, []);

  /* ---------------- Progress ---------------- */

  /**
   * Record playback position. Called at most every 5s by the player, and once on
   * unmount, so it never becomes a write amplifier.
   * @param {any} title
   * @param {{ seconds: number, duration: number }} state
   */
  const saveProgress = useCallback((title, state) => {
    if (!Number.isFinite(state.seconds) || state.seconds < 5) return;

    setProgress((current) => {
      const finished = state.duration > 0 && state.seconds / state.duration > 0.95;
      const without = current.filter((entry) => entry.id !== title.id);
      if (finished) return without; // finished titles leave Continue Watching

      /** @type {ProgressEntry} */
      const entry = {
        id: title.id,
        title: title.title,
        poster: title.poster ?? null,
        seconds: Math.round(state.seconds),
        duration: Math.round(state.duration || 0),
        updatedAt: Date.now(),
      };
      return [entry, ...without].slice(0, 20);
    });
  }, []);

  const clearProgress = useCallback((/** @type {string} */ id) => {
    setProgress((current) => current.filter((entry) => entry.id !== id));
  }, []);

  /* ---------------- Taste ---------------- */

  const rate = useCallback((/** @type {string} */ id, /** @type {"up"|"down"} */ verdict) => {
    setRatings((current) => {
      if (current[id] === verdict) {
        const { [id]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [id]: verdict };
    });
  }, []);

  /* ---------------- Derived ---------------- */

  const continueWatching = useMemo(
    () =>
      [...progress]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((entry) => ({
          ...entry,
          percent:
            entry.duration > 0
              ? Math.min(100, Math.round((entry.seconds / entry.duration) * 100))
              : 0,
        })),
    [progress],
  );

  const value = useMemo(
    () => ({
      watchlist,
      continueWatching,
      ratings,
      inWatchlist,
      toggleWatchlist,
      saveProgress,
      clearProgress,
      rate,
      stats: {
        watchlist: watchlist.length,
        inProgress: continueWatching.length,
        rated: Object.keys(ratings).length,
      },
    }),
    [
      watchlist,
      continueWatching,
      ratings,
      inWatchlist,
      toggleWatchlist,
      saveProgress,
      clearProgress,
      rate,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return context;
}
