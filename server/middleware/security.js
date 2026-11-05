/**
 * @file security.js
 * @description HTTP hardening, in one place and in this order.
 *
 *  - `requestContext`  : assigns an id, records timing
 *  - `securityHeaders` : CSP, HSTS, no-sniff, referrer policy, permissions policy
 *  - `cors`            : strict allow-list, credentials off
 *  - `rateLimit`       : fixed-window limiter, per bucket
 *
 * Design notes for reviewers:
 *  - CSP is only sent in production. The Vite dev server injects inline scripts
 *    for HMR, so a strict policy there would break development for no security
 *    gain (dev is localhost-only and not internet reachable).
 *  - `frame-ancestors` defaults to self and can be widened via FRAME_ANCESTORS
 *    for teams that embed the app. There is no `X-Frame-Options: DENY` because
 *    the header cannot express an allow-list and CSP already covers it.
 */

import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";
import { HttpError } from "../lib/http-error.js";

const log = logger.child({ module: "http" });

/* ------------------------------------------------------------------ *
 * Request context
 * ------------------------------------------------------------------ */

/**
 * Adds `req.id`, plus an `X-Request-Id` response header so a user can quote it
 * in a bug report and we can find the matching server log line.
 */
export function requestContext(req, res, next) {
  req.id = req.get("x-request-id")?.slice(0, 64) || randomUUID();
  req.startedAt = process.hrtime.bigint();
  res.setHeader("X-Request-Id", req.id);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - req.startedAt) / 1e6;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    // Log the path only — never the query string (it may contain a search term).
    log[level]("request", {
      id: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
}

/* ------------------------------------------------------------------ *
 * Headers
 * ------------------------------------------------------------------ */

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  if (config.isProduction) {
    const frameAncestors = process.env.FRAME_ANCESTORS || "'self'";
    const csp = [
      "default-src 'self'",
      // Firebase Auth loads a script from gstatic; YouTube embeds need their iframe.
      "script-src 'self' https://apis.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://image.tmdb.org https://*.googleusercontent.com",
      "media-src 'self' blob: https://*.googlevideo.com",
      "frame-src 'self' https://www.youtube-nocookie.com https://accounts.google.com",
      "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      `frame-ancestors ${frameAncestors}`,
      "upgrade-insecure-requests",
    ].join("; ");

    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}

/* ------------------------------------------------------------------ *
 * CORS
 * ------------------------------------------------------------------ */

/**
 * Allow-list CORS. In production the client is served by this same process, so
 * the middleware is skipped entirely (same-origin requests don't need it).
 */
export function cors(req, res, next) {
  if (!config.corsEnabled) return next();

  const origin = req.get("origin");

  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Request-Id");
    res.setHeader("Access-Control-Max-Age", "600");
  }

  if (req.method === "OPTIONS") {
    // Preflight never needs a body; browsers cache the result for 10 minutes.
    return res.status(origin && !config.allowedOrigins.includes(origin) ? 403 : 204).end();
  }

  return next();
}

/* ------------------------------------------------------------------ *
 * Rate limiting
 * ------------------------------------------------------------------ */

/**
 * @typedef {{ count: number, resetAt: number }} Bucket
 */

/** @param {number} windowMs */
function createLimiter(windowMs) {
  /** @type {Map<string, Bucket>} */
  const buckets = new Map();

  // Periodically drop expired buckets so the map cannot grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  /**
   * @param {string} key
   * @param {number} limit
   */
  return function consume(key, limit) {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    bucket.count += 1;
    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      resetAt: bucket.resetAt,
    };
  };
}

/** @param {import("express").Request} req */
function clientKey(req) {
  // `req.ip` respects the trust-proxy setting configured in index.js.
  return `${req.ip}:${req.baseUrl || ""}`;
}

/**
 * Build a limit middleware for a specific budget.
 * @param {{ windowMs: number, limit: number, name: string }} options
 */
export function rateLimit({ windowMs, limit, name }) {
  const consume = createLimiter(windowMs);
  /** @type {Map<string, number>} */
  const lastWarned = new Map();

  return function limiter(req, res, next) {
    const result = consume(clientKey(req), limit);
    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(result.remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil((result.resetAt - Date.now()) / 1000)));

    if (result.allowed) return next();

    const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    res.setHeader("Retry-After", String(retryAfter));

    // One log line per window per client, not one per blocked request.
    const key = clientKey(req);
    const now = Date.now();
    if (now - (lastWarned.get(key) ?? 0) > windowMs) {
      lastWarned.set(key, now);
      log.warn("rate limit hit", { bucket: name, ip: req.ip });
    }

    return next(
      new HttpError(429, "Too many requests. Give it a minute and try again.", {
        details: { retryAfterSeconds: retryAfter },
      }),
    );
  };
}

/* ------------------------------------------------------------------ *
 * Central error handler
 * ------------------------------------------------------------------ */

/**
 * Last middleware. Everything ends here.
 *
 * @param {Error & { status?: number, code?: string, details?: unknown }} error
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */
export function errorHandler(error, req, res, _next) {
  const status = error.status && error.status >= 400 ? error.status : 500;
  const isServerError = status >= 500;

  if (isServerError) {
    log.error("unhandled error", {
      id: req.id,
      message: error.message,
      stack: config.isProduction ? undefined : error.stack,
    });
  }

  if (res.headersSent) return res.end();

  res.status(status).json({
    error: {
      // Never leak internal messages or stack traces to the browser.
      message:
        isServerError && !error.expose
          ? "Something went wrong on our side. We are looking into it."
          : error.message,
      code: error.code ?? "internal_error",
      requestId: req.id,
    },
  });
}

/**
 * 404 for unknown /api routes (must be mounted after the API router).
 */
export function apiNotFound(req, _res, next) {
  next(new HttpError(404, `No API route matches ${req.method} ${req.path}`));
}
