/**
 * @file config.js
 * @description Single source of truth for runtime configuration.
 *
 * Everything that differs between a laptop and a deployed box is read here, once,
 * and validated at boot. If something required is missing the process exits with a
 * readable error instead of failing later with `undefined` sprinkled through logs.
 *
 * Secrets policy: the TMDB read token lives ONLY on the server. The browser talks to
 * `/api/*` and never sees a credential (see docs/SECURITY.md#tmdb-proxy).
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(here, "..");

const isProduction = process.env.NODE_ENV === "production";

/**
 * Tiny .env reader.
 *
 * We intentionally do not pull in `dotenv` here: the server needs exactly one file
 * and ~20 lines of parsing, and fewer runtime dependencies means fewer things to
 * audit. The client keeps its own (public) settings in the same file.
 *
 * @returns {Record<string, string>}
 */
function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!existsSync(envPath)) return {};

  /** @type {Record<string, string>} */
  const parsed = {};
  const raw = readFileSync(envPath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    // Strip a single layer of matching quotes, if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

const fileEnv = loadEnvFile();

/**
 * Read a variable from the real environment first, then from .env.
 * @param {string} key
 * @param {string} [fallback]
 */
export function env(key, fallback = "") {
  const value = process.env[key] ?? fileEnv[key] ?? fallback;
  return value;
}

/** @param {string} key @param {string} [fallback] */
function intEnv(key, fallback) {
  const raw = env(key, String(fallback));
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const allowedOrigins = env("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = Object.freeze({
  isProduction,
  port: intEnv("PORT", 8787),

  /**
   * TMDB v4 read token. `TMDB_API_TOKEN` is the documented name; the old
   * `VITE_MOVIE_TOKEN` is still accepted so an existing .env keeps working —
   * but it is read server-side only, never injected into the bundle.
   */
  tmdbToken: env("TMDB_API_TOKEN") || env("VITE_MOVIE_TOKEN"),
  tmdbBaseUrl: "https://api.themoviedb.org/3",
  tmdbImageBase: "https://image.tmdb.org/t/p",

  /** Outbound timeout for TMDB calls; keeps a slow upstream from piling up. */
  upstreamTimeoutMs: intEnv("UPSTREAM_TIMEOUT_MS", 8000),

  allowedOrigins,
  trustProxy: env("TRUST_PROXY", isProduction ? "1" : "0") === "1",

  /**
   * In development the API may be served from a different port than the Vite
   * dev server, so CORS is scoped to the dev origins above. In production the
   * server also serves the built client from the same origin, so CORS is off.
   */
  corsEnabled: !isProduction,

  /** Directory containing the built client (`vite build` output). */
  clientDistDir: path.join(ROOT_DIR, "dist"),

  /** Human-readable app metadata, surfaced on /api/health. */
  app: {
    name: "BD Screens",
    version: "2.0.0",
  },
});

/**
 * Fail fast, loudly, and early on missing critical configuration.
 * @returns {string[]} list of human readable warnings
 */
export function validateConfig() {
  /** @type {string[]} */
  const warnings = [];

  if (!config.tmdbToken) {
    warnings.push(
      "TMDB_API_TOKEN is not set — the API will serve the bundled demo catalogue only.\n" +
        "   Copy .env.example to .env and add a TMDB read token to enable live data.",
    );
  }

  if (config.isProduction && config.allowedOrigins.length === 0) {
    warnings.push(
      "ALLOWED_ORIGINS is empty in production. Cross-origin requests will be rejected.",
    );
  }

  return warnings;
}
