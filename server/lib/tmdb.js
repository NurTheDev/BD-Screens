/**
 * @file tmdb.js
 * @description The only place in the codebase that knows how to talk to TMDB.
 *
 * Responsibilities:
 *  1. Keep the read token server-side (the browser never sees it).
 *  2. Turn TMDB's loose JSON into the app's own `Title` shape, so the UI has a
 *     single render path for live data and the bundled demo catalogue.
 *  3. Cache aggressively — TMDB rate-limits, and a home page fires ~6 requests.
 *
 * Every function returns normalized `Title` objects (see docs/API.md#title-shape),
 * or throws a `HttpError` carrying a safe message for the client.
 */

import { config } from "../config.js";
import { logger } from "./logger.js";
import { HttpError } from "./http-error.js";

const log = logger.child({ module: "tmdb" });

/** Genre ids → names. Static because TMDB's ids are stable and this saves a request. */
const MOVIE_GENRES = new Map([
  [28, "Action"],
  [12, "Adventure"],
  [16, "Animation"],
  [35, "Comedy"],
  [80, "Crime"],
  [99, "Documentary"],
  [18, "Drama"],
  [10751, "Family"],
  [14, "Fantasy"],
  [36, "History"],
  [27, "Horror"],
  [10402, "Music"],
  [9648, "Mystery"],
  [10749, "Romance"],
  [878, "Sci-Fi"],
  [10770, "TV Movie"],
  [53, "Thriller"],
  [10752, "War"],
  [37, "Western"],
]);

const TV_GENRES = new Map([
  [10759, "Action & Adventure"],
  [16, "Animation"],
  [35, "Comedy"],
  [80, "Crime"],
  [99, "Documentary"],
  [18, "Drama"],
  [10751, "Family"],
  [10762, "Kids"],
  [9648, "Mystery"],
  [10763, "News"],
  [10764, "Reality"],
  [10765, "Sci-Fi & Fantasy"],
  [10766, "Soap"],
  [10767, "Talk"],
  [10768, "War & Politics"],
  [37, "Western"],
]);

/* ------------------------------------------------------------------ *
 * Cache
 * ------------------------------------------------------------------ */

/**
 * @typedef {{ expiresAt: number, value: unknown }} CacheEntry
 * @type {Map<string, CacheEntry>}
 */
const cache = new Map();
/** @type {Map<string, Promise<unknown>>} */
const inFlight = new Map();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 300;

/**
 * Memoized async call. Collapses concurrent identical requests into one
 * upstream fetch (the classic "6 carousels ask for trending at once" case).
 *
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} loader
 * @param {number} [ttlMs]
 * @returns {Promise<T>}
 */
async function memo(key, loader, ttlMs = DEFAULT_TTL_MS) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return /** @type {T} */ (hit.value);

  const pending = inFlight.get(key);
  if (pending) return /** @type {Promise<T>} */ (pending);

  const promise = loader()
    .then((value) => {
      if (cache.size >= MAX_ENTRIES) {
        // Cheap FIFO eviction: Map preserves insertion order.
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

/* ------------------------------------------------------------------ *
 * Low level request
 * ------------------------------------------------------------------ */

/**
 * @param {string} endpoint e.g. "trending/movie/week"
 * @param {Record<string, string | number | undefined>} [query]
 * @returns {Promise<any>}
 */
async function request(endpoint, query = {}) {
  if (!config.tmdbToken) {
    throw new HttpError(503, "Live catalogue is not configured on this server.");
  }

  const url = new URL(`${config.tmdbBaseUrl}/${endpoint.replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  // Never log the token, and never log query strings verbatim (they can carry
  // a user's free-text search).
  url.searchParams.set("api_key", "");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.upstreamTimeoutMs);

  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.tmdbToken}`,
        accept: "application/json",
      },
      signal: controller.signal,
    });

    log.debug("upstream request", {
      endpoint,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });

    if (response.status === 401 || response.status === 403) {
      // A bad token is an operator problem, not a user problem.
      throw new HttpError(502, "Catalogue provider rejected our credentials.");
    }
    if (response.status === 429) {
      throw new HttpError(429, "Catalogue provider rate limit reached. Try again shortly.");
    }
    if (!response.ok) {
      throw new HttpError(502, "Catalogue provider returned an unexpected response.");
    }

    return await response.json();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (/** @type {Error} */ (error).name === "AbortError") {
      throw new HttpError(504, "Catalogue provider timed out.");
    }
    throw new HttpError(502, "Could not reach the catalogue provider.");
  } finally {
    clearTimeout(timeout);
  }
}

/* ------------------------------------------------------------------ *
 * Normalization
 * ------------------------------------------------------------------ */

/**
 * @param {string | null | undefined} path
 * @param {"w342" | "w500" | "w780" | "original"} size
 */
function imageUrl(path, size = "w500") {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path; // already absolute (demo data)
  return `${config.tmdbImageBase}/${size}${path}`;
}

/**
 * @typedef {object} Title
 * @property {string} id
 * @property {"tmdb" | "demo"} source
 * @property {"movie" | "series"} kind
 * @property {string} title
 * @property {string} overview
 * @property {number | null} year
 * @property {string | null} releaseDate
 * @property {string[]} genres
 * @property {number} rating
 * @property {number} votes
 * @property {string | null} poster
 * @property {string | null} backdrop
 * @property {string} accent  dominant-ish accent colour used by the UI
 */

/** Stable, pleasant accent per title so cards never look uniform. */
const ACCENTS = ["#ff4d5e", "#f0a93b", "#4ea8de", "#9b7ede", "#3ddc97", "#e6739f"];
/** @param {string | number} seed */
function accentFor(seed) {
  let hash = 0;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  }
  return ACCENTS[hash % ACCENTS.length];
}

/**
 * @param {any} raw
 * @param {"movie" | "series"} [forcedKind]
 * @returns {Title}
 */
export function normalizeTitle(raw, forcedKind) {
  const kind =
    forcedKind ?? (raw.media_type === "tv" || raw.first_air_date ? "series" : "movie");
  const genreMap = kind === "series" ? TV_GENRES : MOVIE_GENRES;

  const genres = Array.isArray(raw.genres)
    ? raw.genres.map((/** @type {{name: string}} */ g) => g.name)
    : (raw.genre_ids ?? []).map((/** @type {number} */ id) => genreMap.get(id)).filter(Boolean);

  const releaseDate = raw.release_date || raw.first_air_date || null;

  return {
    id: `tmdb-${kind}-${raw.id}`,
    source: "tmdb",
    kind,
    title: raw.title || raw.name || "Untitled",
    overview: raw.overview || "",
    year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    releaseDate,
    genres,
    rating: Math.round((raw.vote_average ?? 0) * 10) / 10,
    votes: raw.vote_count ?? 0,
    poster: imageUrl(raw.poster_path),
    backdrop: imageUrl(raw.backdrop_path, "original"),
    // `hero` is the wide 16:9 still the landing page wants. TMDB has no separate
    // hero asset, so it reuses the backdrop at a capped size.
    hero: imageUrl(raw.backdrop_path, "w780"),
    accent: accentFor(raw.id),
  };
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/** Feed definitions: what the UI asks for by name. */
export const FEEDS = Object.freeze({
  trending: { endpoint: "trending/all/week", kind: "mixed" },
  popular: { endpoint: "movie/popular", kind: "movie" },
  topRated: { endpoint: "movie/top_rated", kind: "movie" },
  nowPlaying: { endpoint: "movie/now_playing", kind: "movie" },
  upcoming: { endpoint: "movie/upcoming", kind: "movie" },
  popularSeries: { endpoint: "tv/popular", kind: "series" },
  topRatedSeries: { endpoint: "tv/top_rated", kind: "series" },
  bangla: { endpoint: "discover/movie", kind: "movie" },
});

/**
 * Fetch a named feed.
 * @param {keyof typeof FEEDS} feed
 * @param {number} [page]
 * @returns {Promise<Title[]>}
 */
export async function getFeed(feed, page = 1) {
  const definition = FEEDS[feed];
  if (!definition) throw new HttpError(400, `Unknown feed "${feed}".`);

  const query = { page, language: "en-US" };
  if (feed === "bangla") {
    query.with_original_language = "bn";
    query.sort_by = "popularity.desc";
    query.include_adult = "false";
  }

  return memo(`feed:${feed}:${page}`, async () => {
    const payload = await request(definition.endpoint, query);
    return (payload.results ?? []).map((/** @type {any} */ item) =>
      normalizeTitle(item, definition.kind === "mixed" ? undefined : definition.kind),
    );
  });
}

/**
 * Full-text search across movies and people-free multi search.
 * @param {string} query
 * @param {number} [page]
 * @returns {Promise<Title[]>}
 */
export async function search(query, page = 1) {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  return memo(
    `search:${trimmed.toLowerCase()}:${page}`,
    async () => {
      const payload = await request("search/multi", {
        query: trimmed,
        page,
        include_adult: "false",
        language: "en-US",
      });

      return (payload.results ?? [])
        .filter((/** @type {any} */ item) => item.media_type !== "person")
        .map((/** @type {any} */ item) => normalizeTitle(item));
    },
    60 * 1000,
  );
}

/**
 * Detail view. TMDB needs two calls (details + credits) — we fire them together.
 * @param {string} id "tmdb-movie-693134"
 * @returns {Promise<Title & { runtime: number | null, seasons: number | null, cast: Array<{name: string, role: string, photo: string | null}>, crew: Array<{name: string, job: string}>, trailerKey: string | null, similar: Title[] }>}
 */
export async function getTitle(id) {
  const match = /^tmdb-(movie|series)-(\d+)$/.exec(id);
  if (!match) throw new HttpError(404, "Title not found.");
  const [, kind, numericId] = match;

  return memo(
    `title:${id}`,
    async () => {
      const base = kind === "series" ? "tv" : "movie";
      const [details, credits, related, videos] = await Promise.all([
        request(`${base}/${numericId}`, { language: "en-US" }),
        request(`${base}/${numericId}/credits`, { language: "en-US" }),
        request(`${base}/${numericId}/similar`, { page: 1, language: "en-US" }),
        request(`${base}/${numericId}/videos`, { language: "en-US" }),
      ]);

      const title = normalizeTitle(
        { ...details, media_type: base === "tv" ? "tv" : "movie" },
        kind === "series" ? "series" : "movie",
      );
      const trailer = (videos.results ?? []).find(
        (/** @type {any} */ v) => v.site === "YouTube" && v.type === "Trailer",
      );

      return {
        ...title,
        overview: details.overview || title.overview,
        runtime: details.runtime ?? (details.episode_run_time?.[0] || null),
        seasons: details.number_of_seasons ?? null,
        cast: (credits.cast ?? []).slice(0, 10).map((/** @type {any} */ person) => ({
          name: person.name,
          role: person.character || "",
          photo: imageUrl(person.profile_path, "w342"),
        })),
        crew: (credits.crew ?? [])
          .filter((/** @type {any} */ person) =>
            ["Director", "Writer", "Screenplay"].includes(person.job),
          )
          .slice(0, 4)
          .map((/** @type {any} */ person) => ({ name: person.name, job: person.job })),
        trailerKey: trailer?.key ?? null,
        similar: (related.results ?? [])
          .slice(0, 12)
          .map((/** @type {any} */ item) =>
            normalizeTitle(item, base === "tv" ? "series" : "movie"),
          ),
      };
    },
    15 * 60 * 1000,
  );
}

/** Exposed for tests and for /api/health. */
export function cacheStats() {
  return { entries: cache.size, inFlight: inFlight.size };
}

/** Test helper. */
export function clearCache() {
  cache.clear();
  inFlight.clear();
}
