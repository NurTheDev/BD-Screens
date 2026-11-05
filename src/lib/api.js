/**
 * @file api.js
 * @description The client's single door to the backend.
 *
 * Rules this module enforces so components never have to think about them:
 *  - every request is abortable (a fast navigator must not trigger setState
 *    after unmount),
 *  - every request has a timeout (a hung request should not freeze a skeleton),
 *  - every failure is normalized into `ApiError` with a human message,
 *  - URLs are relative (`/api/...`), so the same code works behind Vite's dev
 *    proxy and behind Express in production, on any host.
 */

const DEFAULT_TIMEOUT_MS = 12_000;

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, requestId?: string }} [meta]
   */
  constructor(message, meta = {}) {
    super(message);
    this.name = "ApiError";
    this.status = meta.status ?? 0;
    this.code = meta.code ?? "network_error";
    this.requestId = meta.requestId;
  }
}

/**
 * @param {string} path
 * @param {{ signal?: AbortSignal, timeoutMs?: number, params?: Record<string, string | number | undefined> }} [options]
 */
async function request(path, options = {}) {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS, params } = options;

  let url = path;
  if (params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") search.set(key, String(value));
    }
    const query = search.toString();
    if (query) url += `?${query}`;
  }

  // Compose the caller's signal with our own timeout signal.
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(new Error("timeout")), timeoutMs);
  const composed = signal
    ? (AbortSignal.any?.([signal, timeout.signal]) ?? timeout.signal)
    : timeout.signal;

  try {
    const response = await fetch(url, {
      signal: composed,
      headers: { accept: "application/json" },
    });

    /** @type {any} */
    let payload = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
    }

    if (!response.ok) {
      throw new ApiError(payload?.error?.message ?? `Request failed (${response.status}).`, {
        status: response.status,
        code: payload?.error?.code,
        requestId: payload?.error?.requestId,
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (/** @type {Error} */ (error).name === "AbortError") {
      // Distinguish "the user navigated away" from "the server was too slow":
      // only the latter should show a retry affordance.
      const timedOut = timeout.signal.aborted;
      throw new ApiError(
        timedOut ? "That took too long. Check your connection and try again." : "Cancelled.",
        { code: timedOut ? "timeout" : "aborted" },
      );
    }
    throw new ApiError("Cannot reach the server. Is the API running?", {
      code: "offline",
    });
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ *
 * Endpoints
 * ------------------------------------------------------------------ */

export const api = {
  /** Liveness + which catalogue source is active. */
  health: (/** @type {AbortSignal} */ signal) => request("/api/health", { signal }),

  /** Home page payload: spotlight + every editorial row. */
  feeds: (/** @type {AbortSignal} */ signal) => request("/api/feeds", { signal }),

  /** @param {string} name @param {number} page */
  feed: (name, page = 1, /** @type {AbortSignal} */ signal) =>
    request(`/api/feed/${encodeURIComponent(name)}`, { signal, params: { page } }),

  /** @param {string} q @param {{ signal?: AbortSignal, page?: number }} [options] */
  search: (q, options = {}) =>
    request("/api/search", { params: { q, page: options.page }, signal: options.signal }),

  /** @param {string} id */
  title: (id, /** @type {AbortSignal} */ signal) =>
    request(`/api/title/${encodeURIComponent(id)}`, { signal }),

  /**
   * @param {string[]} moods
   * @param {{ minutes?: number, limit?: number, exclude?: string[] }} [options]
   * @param {AbortSignal} [signal]
   */
  matchMoods: (moods, options = {}, signal) =>
    request("/api/moods/match", {
      signal,
      params: {
        moods: moods.join(","),
        minutes: options.minutes ?? 0,
        limit: options.limit ?? 12,
        exclude: options.exclude?.join(",") ?? "",
      },
    }),

  moods: (/** @type {AbortSignal} */ signal) => request("/api/moods", { signal }),
};

/**
 * Small helper for the "party code exists?" check on /party/:code.
 * @param {string} code
 */
export function verifyParty(code) {
  return request(`/api/party/${encodeURIComponent(code)}/verify`, { timeoutMs: 5000 });
}
