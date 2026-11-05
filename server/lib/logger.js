/**
 * @file logger.js
 * @description Minimal structured logger.
 *
 * Why not a logging library? Because this app needs four levels and one rule:
 * never print a secret or a full URL with a query string. A 40-line module is
 * easier to reason about (and to explain in an interview) than a dependency.
 *
 * Output format: `<iso timestamp> <level> <message> {json metadata}`
 */

/* eslint-disable no-console -- this module *is* the console sink. */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

/** @type {keyof LEVELS} */
const activeLevel =
  process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

const threshold = LEVELS[activeLevel] ?? LEVELS.info;

/** Keys that must never reach a log sink. */
const REDACTED_KEYS = new Set([
  "token",
  "authorization",
  "password",
  "apikey",
  "api_key",
  "secret",
  "cookie",
]);

/**
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {unknown}
 */
function redact(value, depth = 0) {
  if (depth > 4) return "[truncated]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? "[redacted]" : redact(entry, depth + 1);
  }
  return out;
}

/**
 * @param {"debug"|"info"|"warn"|"error"} level
 * @param {string} message
 * @param {Record<string, unknown>} [meta]
 */
function write(level, message, meta) {
  if (LEVELS[level] < threshold) return;

  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${message}`;
  const sink = level === "error" || level === "warn" ? console.error : console.log;

  if (meta && Object.keys(meta).length > 0) {
    sink(line, JSON.stringify(redact(meta)));
  } else {
    sink(line);
  }
}

export const logger = {
  /** @param {string} message @param {Record<string, unknown>} [meta] */
  debug: (message, meta) => write("debug", message, meta),
  /** @param {string} message @param {Record<string, unknown>} [meta] */
  info: (message, meta) => write("info", message, meta),
  /** @param {string} message @param {Record<string, unknown>} [meta] */
  warn: (message, meta) => write("warn", message, meta),
  /** @param {string} message @param {Record<string, unknown>} [meta] */
  error: (message, meta) => write("error", message, meta),

  /**
   * Child logger that always attaches the same metadata (e.g. a request id).
   * @param {Record<string, unknown>} base
   */
  child(base) {
    return {
      debug: (/** @type {string} */ m, /** @type {object} */ x) =>
        write("debug", m, { ...base, ...x }),
      info: (/** @type {string} */ m, /** @type {object} */ x) =>
        write("info", m, { ...base, ...x }),
      warn: (/** @type {string} */ m, /** @type {object} */ x) =>
        write("warn", m, { ...base, ...x }),
      error: (/** @type {string} */ m, /** @type {object} */ x) =>
        write("error", m, { ...base, ...x }),
    };
  },
};
/* eslint-enable no-console */
