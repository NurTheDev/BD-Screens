/**
 * @file Browse.jsx
 * @description Full catalogue with filters that live in the URL.
 *
 * Filters are URL parameters (`?row=&genre=&sort=&q=`) rather than component
 * state because that makes every view shareable, bookmarkable and back-button
 * friendly. It is a small decision that separates a demo from a product.
 */

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useFetch } from "../hooks/useFetch.js";
import { useLibrary } from "../lib/library.jsx";
import { Poster } from "../components/ui/Poster.jsx";
import { Rail, RailItem } from "../components/ui/Rail.jsx";
import { Refresh, Warning } from "../components/ui/Icons.jsx";

const SORTS = [
  { id: "recommended", label: "Recommended" },
  { id: "rating", label: "Highest rated" },
  { id: "newest", label: "Newest" },
  { id: "title", label: "A–Z" },
];

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const { inWatchlist, toggleWatchlist } = useLibrary();

  const rowId = params.get("row") ?? "";
  const genre = params.get("genre") ?? "";
  const sort = params.get("sort") ?? "recommended";

  const { data, loading, error, reload } = useFetch(
    useCallback((signal) => api.feeds(signal), []),
    [],
  );

  // Stable identity: `data?.rows ?? []` creates a new array on every render,
  // which would invalidate every memo below it.
  const rows = useMemo(() => data?.rows ?? [], [data]);

  /* Flat list for filtering, de-duplicated by id. */
  const allItems = useMemo(() => {
    const seen = new Set();
    const items = [];
    for (const row of rows) {
      for (const item of row.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        items.push(item);
      }
    }
    return items;
  }, [rows]);

  const genres = useMemo(() => {
    const counts = new Map();
    for (const item of allItems) {
      for (const value of item.genres ?? []) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([value]) => value);
  }, [allItems]);

  const visible = useMemo(() => {
    const base = genre
      ? allItems.filter((item) => item.genres?.includes(genre))
      : rowId
        ? (rows.find((row) => row.id === rowId)?.items ?? allItems)
        : allItems;

    const sorted = [...base];
    switch (sort) {
      case "rating":
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "newest":
        sorted.sort((a, b) =>
          String(b.releaseDate ?? "").localeCompare(String(a.releaseDate ?? "")),
        );
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }
    return sorted;
  }, [allItems, genre, rowId, rows, sort]);

  /** @param {string} key @param {string} value */
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  if (error) {
    return (
      <div className="shell flex min-h-[70svh] flex-col items-center justify-center text-center">
        <Warning size={26} className="text-signal" />
        <h1 className="mt-4 font-display text-3xl">The catalogue did not load</h1>
        <p className="mt-2 max-w-sm text-sm text-mist-400">{error.message}</p>
        <button type="button" onClick={reload} className="btn btn-ghost mt-6">
          <Refresh size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 sm:pt-28">
      <header className="shell">
        <p className="eyebrow">Catalogue</p>
        <h1 className="display mt-2 text-[clamp(2.2rem,5vw,3.8rem)] leading-none">
          Browse everything
        </h1>
        <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-mist-400">
          {allItems.length} titles across {genres.length} genres — BD Screens Originals
          alongside the live catalogue. Filters update the address bar, so any view can be
          shared.
        </p>
      </header>

      {/* Filters */}
      <div className="shell mt-7 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="chip"
          data-active={!genre && !rowId}
          onClick={() => {
            const next = new URLSearchParams(params);
            next.delete("genre");
            next.delete("row");
            setParams(next, { replace: true });
          }}
        >
          All
        </button>

        {genres.map((value) => (
          <button
            key={value}
            type="button"
            className="chip"
            data-active={genre === value}
            onClick={() => setParam("genre", genre === value ? "" : value)}
          >
            {value}
          </button>
        ))}

        <label className="ml-auto flex items-center gap-2 text-[11.5px] text-mist-500">
          Sort
          <select
            value={sort}
            onChange={(event) => setParam("sort", event.target.value)}
            className="rounded-lg border border-white/12 bg-ink-850 px-2 py-1.5 text-[12px] text-mist-200 focus:border-amber/60 focus:outline-none"
          >
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Grid */}
      <div className="shell mt-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 18 }).map((_, index) => (
              <div key={index}>
                <div className="skeleton aspect-[2/3] w-full" />
                <div className="skeleton mt-2 h-3 w-3/4" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-6 py-14 text-center">
            <p className="font-display text-2xl">Nothing matches those filters</p>
            <button
              type="button"
              className="btn btn-ghost mt-4"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {visible.map((item, index) => (
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
        )}
      </div>

      {/* Editorial rails at the bottom keep the page explorable rather than terminal. */}
      {!loading && !genre && !rowId && (
        <div className="mt-16 space-y-8">
          {rows.slice(0, 3).map((row) => (
            <Rail key={row.id} title={row.title} subtitle={row.subtitle} href={row.href}>
              {row.items.slice(0, 12).map((item, index) => (
                <RailItem key={item.id}>
                  <Poster
                    title={item}
                    index={index}
                    onToggleWatchlist={toggleWatchlist}
                    inWatchlist={inWatchlist(item.id)}
                  />
                </RailItem>
              ))}
            </Rail>
          ))}
        </div>
      )}
    </div>
  );
}
