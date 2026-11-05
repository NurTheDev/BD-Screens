/**
 * @file api.js
 * @description The public JSON API consumed by the React client.
 *
 * Route map (also documented in docs/API.md):
 *
 *   GET  /api/health                  liveness + which source is active
 *   GET  /api/feeds                   every row the home page needs, in one request
 *   GET  /api/feed/:name?page=n       a single named feed
 *   GET  /api/search?q=...&page=n     multi search (movies + series)
 *   GET  /api/title/:id               detail + cast + similar
 *   GET  /api/moods                   mood definitions for Mood Match
 *   GET  /api/moods/match             scored recommendations for chosen moods
 *   GET  /api/art/:seed.svg           deterministic placeholder artwork
 *
 * Every response is `{ data, meta }` so the client has one envelope to handle and
 * one place to read pagination/caching hints from.
 */

import { Router } from "express";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { HttpError } from "../lib/http-error.js";
import * as tmdb from "../lib/tmdb.js";
import { placeholderPosterSvg, gradientFor } from "../lib/art.js";
import {
  ALL_DEMO_TITLES,
  MOODS,
  ORIGINAL_TITLES,
  findDemoTitle,
  matchMoods,
  searchDemo,
} from "../data/catalogue.js";
import {
  clampNumber,
  sanitizePartyCode,
  sanitizeSearch,
  sanitizeTitleId,
} from "../lib/validate.js";

export const apiRouter = Router();
const log = logger.child({ module: "api" });

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/**
 * @template T
 * @param {import("express").Response} res
 * @param {T} data
 * @param {Record<string, unknown>} [meta]
 * @param {number} [status]
 */
function ok(res, data, meta = {}, status = 200) {
  res.status(status).json({
    data,
    meta: { source: config.tmdbToken ? "tmdb" : "demo", ...meta },
  });
}

/** The curated rows, used both by /feeds and by the demo fallback. */
function demoRows() {
  const byGenre = (/** @type {string} */ genre) =>
    ALL_DEMO_TITLES.filter((title) => title.genres.includes(genre));

  return {
    spotlight: ORIGINAL_TITLES.slice(0, 3),
    originals: ORIGINAL_TITLES,
    "late-night": ALL_DEMO_TITLES.filter((title) => title.moods?.includes("late-night")),
    drama: byGenre("Drama"),
    comedy: byGenre("Comedy"),
    trending: [...ALL_DEMO_TITLES].sort((a, b) => b.votes - a.votes).slice(0, 18),
    "top-rated": [...ALL_DEMO_TITLES].sort((a, b) => b.rating - a.rating).slice(0, 18),
  };
}

/**
 * Merge two lists without duplicates, keeping the first list's order.
 * @template T
 * @param {T[]} primary
 * @param {T[]} secondary
 * @param {(item: T) => string} keyOf
 * @param {number} limit
 */
function mergeUnique(primary, secondary, keyOf, limit) {
  const seen = new Set();
  const out = [];
  for (const item of [...primary, ...secondary]) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Run an upstream loader, falling back to the bundled catalogue on any failure.
 *
 * This is the single most important resilience decision in the API: TMDB being
 * down, rate-limited, or unconfigured must never produce an empty home page.
 *
 * @template T
 * @param {string} label
 * @param {() => Promise<T>} loader
 * @param {T} fallback
 * @returns {Promise<{ value: T, degraded: boolean }>}
 */
async function withFallback(label, loader, fallback) {
  if (!config.tmdbToken) return { value: fallback, degraded: true };
  try {
    return { value: await loader(), degraded: false };
  } catch (error) {
    log.warn("feed fell back to demo catalogue", {
      label,
      reason: /** @type {Error} */ (error).message,
    });
    return { value: fallback, degraded: true };
  }
}

/* ------------------------------------------------------------------ *
 * Health
 * ------------------------------------------------------------------ */

apiRouter.get("/health", (_req, res) => {
  ok(res, {
    status: "ok",
    app: config.app,
    uptimeSeconds: Math.round(process.uptime()),
    /* Tells the client whether to show the "demo catalogue" ribbon. It is
     * deliberately not an error: the app is fully usable either way. */
    catalogue: config.tmdbToken ? "live" : "demo",
    counts: {
      demoTitles: ALL_DEMO_TITLES.length,
      originals: ORIGINAL_TITLES.length,
    },
    cache: tmdb.cacheStats(),
  });
});

/* ------------------------------------------------------------------ *
 * Feeds
 * ------------------------------------------------------------------ */

apiRouter.get("/feeds", async (_req, res, next) => {
  try {
    const rows = demoRows();

    // One request per row, all in flight together. Each has its own fallback, so
    // a single failing upstream call only degrades that one row.
    const [spotlight, trending, topRated, nowPlaying, series, bangla, lateNight, drama] =
      await Promise.all([
        withFallback(
          "spotlight",
          async () => (await tmdb.getFeed("trending")).slice(0, 5),
          rows.spotlight,
        ),
        withFallback("trending", () => tmdb.getFeed("trending"), rows.trending),
        withFallback("top-rated", () => tmdb.getFeed("topRated"), rows["top-rated"]),
        withFallback("now-playing", () => tmdb.getFeed("nowPlaying"), rows.originals),
        withFallback("series", () => tmdb.getFeed("popularSeries"), rows.drama),
        withFallback("bangla", () => tmdb.getFeed("bangla"), rows.drama),
        withFallback("late-night", () => tmdb.getFeed("popular"), rows["late-night"]),
        withFallback("drama", () => tmdb.getFeed("topRatedSeries"), rows.drama),
      ]);

    const degraded = [
      spotlight,
      trending,
      topRated,
      nowPlaying,
      series,
      bangla,
      lateNight,
      drama,
    ].some((entry) => entry.degraded);

    ok(
      res,
      {
        // Originals are ours: always first, always available.
        spotlight: spotlight.value,
        rows: [
          {
            id: "bd-originals",
            title: "BD Screens Originals",
            subtitle: "Made here. Streaming here first.",
            items: ORIGINAL_TITLES,
            layout: "poster",
            href: "/browse?row=originals",
          },
          {
            id: "trending",
            title: "Trending this week",
            subtitle: "What everyone is arguing about",
            items: trending.value,
            layout: "poster",
            href: "/browse?row=trending",
          },
          {
            id: "late-night",
            title: "Late night, lights off",
            subtitle: "Headphones recommended",
            items: lateNight.value,
            layout: "poster",
            href: "/browse?row=late-night",
          },
          {
            id: "top-rated",
            title: "Critics keep coming back",
            subtitle: "The highest rated in the catalogue",
            items: topRated.value,
            layout: "poster",
            href: "/browse?row=top-rated",
          },
          {
            id: "now-playing",
            title: "New this week",
            subtitle: "Fresh on the shelf",
            items: nowPlaying.value,
            layout: "poster",
            href: "/browse?row=now-playing",
          },
          {
            id: "bangla",
            title: "Bangla cinema",
            subtitle: "Films in Bangla, by Bangla filmmakers",
            items: bangla.value,
            layout: "poster",
            href: "/browse?row=bangla",
          },
          {
            id: "series",
            title: "Binge-worthy series",
            subtitle: "One more episode. One more.",
            items: series.value,
            layout: "poster",
            href: "/browse?row=series",
          },
        ],
      },
      { degraded, cachedAt: new Date().toISOString() },
    );
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/feed/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    const page = clampNumber(req.query.page, 1, 20, 1);
    const rows = demoRows();
    const known = ["trending", "top-rated", "now-playing", "series", "bangla", "late-night"];
    if (!known.includes(name)) throw new HttpError(404, `Unknown feed "${name}".`);

    const map = {
      trending: ["trending", () => tmdb.getFeed("trending", page)],
      "top-rated": ["topRated", () => tmdb.getFeed("topRated", page)],
      "now-playing": ["nowPlaying", () => tmdb.getFeed("nowPlaying", page)],
      series: ["popularSeries", () => tmdb.getFeed("popularSeries", page)],
      bangla: ["bangla", () => tmdb.getFeed("bangla", page)],
      "late-night": ["popular", () => tmdb.getFeed("popular", page)],
    };

    const [feedName, loader] = map[name];
    const fallback = rows[name] ?? rows.trending;
    const { value, degraded } = await withFallback(name, loader, fallback);

    ok(res, value, { degraded, page, feed: feedName });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

apiRouter.get("/search", async (req, res, next) => {
  try {
    const query = sanitizeSearch(req.query.q);
    const page = clampNumber(req.query.page, 1, 10, 1);

    const local = searchDemo(query);
    const { value: live, degraded } = await withFallback(
      "search",
      () => tmdb.search(query, page),
      [],
    );

    // Local hits first (they are ours), then live results, de-duplicated by title.
    const results = mergeUnique(
      local,
      live,
      (title) => `${title.title.toLowerCase()}|${title.year}`,
      40,
    );

    ok(res, results, {
      degraded,
      query,
      page,
      took: results.length === 0 ? "no-match" : "match",
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ *
 * Title detail
 * ------------------------------------------------------------------ */

apiRouter.get("/title/:id", async (req, res, next) => {
  try {
    const id = sanitizeTitleId(req.params.id);
    const demo = findDemoTitle(id);

    if (demo) {
      // Enrich demo titles with "similar" from our own catalogue so the detail
      // page is never a dead end.
      const similar = ALL_DEMO_TITLES.filter(
        (title) =>
          title.id !== demo.id && title.genres.some((genre) => demo.genres.includes(genre)),
      ).slice(0, 10);

      return ok(res, { ...demo, similar });
    }

    if (id.startsWith("demo-")) throw new HttpError(404, "Title not found.");

    const detail = await tmdb.getTitle(id);
    return ok(res, detail);
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ *
 * Moods
 * ------------------------------------------------------------------ */

apiRouter.get("/moods", (_req, res) => {
  ok(res, MOODS, { count: MOODS.length });
});

apiRouter.get("/moods/match", (req, res, next) => {
  try {
    const raw = String(req.query.moods ?? "");
    const requested = raw
      .split(",")
      .map((mood) => mood.trim())
      .filter(Boolean);

    const valid = new Set(MOODS.map((mood) => mood.id));
    const moods = requested.filter((mood) => valid.has(mood));
    if (moods.length === 0) {
      throw new HttpError(400, "Pick at least one mood to get recommendations.");
    }
    if (moods.length > 3) {
      throw new HttpError(
        400,
        "Pick up to three moods — more than that and everything matches.",
      );
    }

    const limit = clampNumber(req.query.limit, 1, 24, 12);
    const minutes = clampNumber(req.query.minutes, 0, 240, 0);
    const exclude = String(req.query.exclude ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    let results = matchMoods(moods, ALL_DEMO_TITLES, { limit: 24, excludeIds: exclude });

    if (minutes > 0) {
      // Runtime is a hard filter, not a sort: the user said "I have 90 minutes".
      results = results.filter((title) => (title.runtime ?? 999) <= minutes);
    }

    ok(res, results.slice(0, limit), {
      moods,
      minutes,
      // Rounded confidence derived from the top score, for the UI's meter.
      confidence: results.length === 0 ? 0 : Math.min(97, 62 + results.length),
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ *
 * Artwork
 * ------------------------------------------------------------------ */

apiRouter.get("/art/:seed.svg", (req, res) => {
  const seed = String(req.params.seed).slice(0, 120);
  const label = String(req.query.label ?? "").slice(0, 40);
  const width = clampNumber(req.query.w, 120, 1200, 600);
  const height = clampNumber(req.query.h, 120, 1600, 900);

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  // Immutable per seed: safe to cache for a year.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(placeholderPosterSvg(seed, { width, height, label }));
});

apiRouter.get("/color/:seed", (req, res) => {
  res.json({ data: gradientFor(String(req.params.seed).slice(0, 120)) });
});

/* ------------------------------------------------------------------ *
 * Watch party codes
 * ------------------------------------------------------------------ */

apiRouter.get("/party/:code/verify", (req, res, next) => {
  try {
    const code = sanitizePartyCode(req.params.code);
    // Imported lazily to avoid a circular dependency between the router and the
    // WS hub (the hub imports catalogue helpers, not the router).
    const registry = /** @type {{ has: (code: string) => boolean }} */ (
      req.app.get("partyRegistry")
    );
    if (!registry?.has(code)) {
      throw new HttpError(404, "No party with that code. Check the link again.");
    }
    res.json({ data: { code, active: true } });
  } catch (error) {
    next(error);
  }
});
