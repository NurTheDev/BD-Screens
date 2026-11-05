/**
 * @file Search.jsx
 * @description Search with debounced queries, recent-search memory and honest
 * empty states.
 *
 * Small product details that matter:
 *  - the query lives in the URL (`?q=`), so a search can be shared and reloaded,
 *  - typing is debounced (350 ms) and every keystroke cancels the previous request,
 *  - "no results" is a designed state that suggests a next action, not a dead end,
 *  - the last five searches are remembered locally and offered as chips.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useFetch, useDebounced } from "../hooks/useFetch.js";
import { useLibrary } from "../lib/library.jsx";
import { KEYS, readJSON, writeJSON } from "../lib/storage.js";
import { Poster } from "../components/ui/Poster.jsx";
import { Search as SearchIcon, Close, Refresh, Warning } from "../components/ui/Icons.jsx";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";

  const [draft, setDraft] = useState(query);
  const debounced = useDebounced(draft.trim(), 350);
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  const { inWatchlist, toggleWatchlist } = useLibrary();
  const [recents, setRecents] = useState(() => readJSON(KEYS.recentSearches, []));

  const {
    data: results,
    loading,
    error,
    reload,
  } = useFetch(
    useCallback(
      async (signal) =>
        debounced.length > 0 ? api.search(debounced, { signal }) : { data: [] },
      [debounced],
    ),
    [debounced],
    { enabled: debounced.length > 0 },
  );

  /* Keep the URL in step with the settled query. */
  useEffect(() => {
    if (debounced === query) return;
    const next = new URLSearchParams(params);
    if (debounced) next.set("q", debounced);
    else next.delete("q");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  /* Remember successful searches. */
  useEffect(() => {
    if (!debounced || !results || results.length === 0) return;
    setRecents((current) => {
      const next = [debounced, ...current.filter((term) => term !== debounced)].slice(0, 5);
      writeJSON(KEYS.recentSearches, next);
      return next;
    });
  }, [debounced, results]);

  /* Focus the field on arrival; "/" is handled globally by the navbar. */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const suggestions = ["monsoon", "late night", "comedy", "Dhaka", "family"];

  return (
    <div className="pt-24 pb-16 sm:pt-28">
      <header className="gutter max-w-3xl">
        <p className="eyebrow">Search</p>
        <h1 className="display mt-2 text-[clamp(2rem,4.4vw,3rem)] leading-none">
          What are you in the mood for?
        </h1>

        <div className="relative mt-6">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mist-500">
            <SearchIcon size={18} />
          </span>
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            type="search"
            placeholder="Title, genre, or a word from the story…"
            aria-label="Search titles"
            className="field h-13 w-full pl-11 pr-11 text-[15px]"
          />
          {draft && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1.5 text-mist-500 hover:text-white"
              aria-label="Clear search"
            >
              <Close size={15} />
            </button>
          )}
        </div>

        {recents.length > 0 && !draft && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-mist-600">Recent:</span>
            {recents.map((term) => (
              <button key={term} type="button" className="chip" onClick={() => setDraft(term)}>
                {term}
              </button>
            ))}
            <button
              type="button"
              className="text-[11px] text-mist-600 underline-offset-2 hover:text-mist-300 hover:underline"
              onClick={() => {
                writeJSON(KEYS.recentSearches, []);
                setRecents([]);
              }}
            >
              clear
            </button>
          </div>
        )}

        {!draft && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-mist-600">Try:</span>
            {suggestions.map((term) => (
              <button key={term} type="button" className="chip" onClick={() => setDraft(term)}>
                {term}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="shell mt-8">
        {error && (
          <div className="rounded-xl border border-signal/25 bg-signal/5 p-5">
            <p className="flex items-center gap-2 text-[13px] text-signal-soft">
              <Warning size={15} /> {error.message}
            </p>
            <button
              type="button"
              onClick={reload}
              className="btn btn-ghost mt-3 h-9 text-[12px]"
            >
              <Refresh size={14} /> Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index}>
                <div className="skeleton aspect-[2/3] w-full" />
                <div className="skeleton mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && debounced && results?.length === 0 && (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-6 py-14 text-center">
            <p className="font-display text-2xl">No titles for “{debounced}”</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-mist-400">
              The demo catalogue is small on purpose. Try a genre like{" "}
              <button
                type="button"
                className="text-amber hover:underline"
                onClick={() => setDraft("drama")}
              >
                drama
              </button>{" "}
              or browse everything instead.
            </p>
            <Link to="/browse" className="btn btn-ghost mt-5 h-9 text-[12px]">
              Browse the catalogue
            </Link>
          </div>
        )}

        {!loading && results?.length > 0 && (
          <>
            <p className="text-[11.5px] text-mist-500">
              {results.length} {results.length === 1 ? "result" : "results"} for “{debounced}”
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {results.map((item, index) => (
                <li key={item.id}>
                  <Poster
                    title={item}
                    index={index}
                    showMeta
                    eager={index < 6}
                    onToggleWatchlist={toggleWatchlist}
                    inWatchlist={inWatchlist(item.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
