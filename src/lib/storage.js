/**
 * @file storage.js
 * @description Namespaced, versioned, failure-tolerant localStorage.
 *
 * localStorage throws in private windows, in embedded webviews, and when the
 * quota is full. A portfolio demo should never white-screen because of that, so
 * every access is wrapped and degrades to an in-memory Map.
 *
 * All keys are namespaced (`bds:`) and carry a schema version, so a future change
 * to the watchlist shape can discard old data instead of crashing on it.
 */

const NAMESPACE = "bds";
const VERSION = "v1";

/** @type {Map<string, string>} */
const memory = new Map();

/** @returns {Storage | null} */
function backend() {
  try {
    const probe = `${NAMESPACE}:probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

const store = backend();

/**
 * @param {string} key
 */
function fullKey(key) {
  return `${NAMESPACE}:${VERSION}:${key}`;
}

/**
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
export function readJSON(key, fallback) {
  const full = fullKey(key);
  const raw = store ? store.getItem(full) : (memory.get(full) ?? null);
  if (raw === null) return fallback;

  try {
    return /** @type {T} */ (JSON.parse(raw));
  } catch {
    // Corrupt value: drop it rather than fighting it on every read.
    if (store) store.removeItem(full);
    memory.delete(full);
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {unknown} value
 */
export function writeJSON(key, value) {
  const full = fullKey(key);
  const raw = JSON.stringify(value);
  try {
    if (store) store.setItem(full, raw);
    else memory.set(full, raw);
  } catch {
    // Quota exceeded: keep it for this session only.
    memory.set(full, raw);
  }
}

/** @param {string} key */
export function remove(key) {
  const full = fullKey(key);
  if (store) store.removeItem(full);
  memory.delete(full);
}

/** Keys the app uses. Kept together so they are easy to audit. */
export const KEYS = Object.freeze({
  watchlist: "watchlist",
  progress: "progress",
  recentSearches: "recent-searches",
  guestProfile: "guest-profile",
  tasteRatings: "taste-ratings",
  playerPrefs: "player-prefs",
  seenIntro: "seen-intro",
});
