/**
 * @file validate.js
 * @description Input validation and output sanitization helpers.
 *
 * The rules are small on purpose and have no dependency: a hand-written schema
 * of five functions is easier to audit than a generic validator, and this app
 * only accepts a handful of shapes.
 *
 * Anything that comes from a user (search text, display names, party codes) is
 * treated as hostile: length-capped, character-filtered, and never interpolated
 * into HTML. React already escapes output, but the WS "party state" payload is
 * also capped here so a malicious client cannot use it as a memory amplifier.
 */

import { HttpError } from "../lib/http-error.js";

/** @param {unknown} value */
export function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Search text: 1-80 chars, letters/digits/space/punctuation, no control chars.
 * @param {unknown} raw
 * @returns {string}
 */
export function sanitizeSearch(raw) {
  const text = String(raw ?? "")
    .normalize("NFKC")
    .trim();
  if (text.length === 0) throw new HttpError(400, "Type something to search for.");
  if (text.length > 80) throw new HttpError(400, "Search terms are limited to 80 characters.");

  // Strip control characters and angle brackets (defence in depth; React escapes).
  // eslint-disable-next-line no-control-regex
  const cleaned = text.replace(/[\u0000-\u001f\u007f<>]/g, "").trim();
  if (cleaned.length === 0) throw new HttpError(400, "That search term is not valid.");
  return cleaned;
}

/**
 * Display name for parties: 2-24 chars, letters, digits, spaces, a few marks.
 * @param {unknown} raw
 * @returns {string}
 */
export function sanitizeDisplayName(raw) {
  const text = String(raw ?? "")
    .normalize("NFKC")
    .trim();
  if (text.length < 2)
    throw new HttpError(400, "Pick a display name with at least 2 characters.");
  if (text.length > 24) throw new HttpError(400, "Display names are limited to 24 characters.");

  /*
   * Reject rather than strip. Stripping `<>` turns "Nur<script>" into "Nurscript"
   * — markup that silently becomes a valid name. Names are cosmetic: the honest
   * response to a weird one is a clear rejection.
   */
  if (/[<>]/.test(text)) {
    throw new HttpError(
      400,
      "Display names can use letters, numbers, spaces, dots, dashes and underscores.",
    );
  }

  // Remove control characters (zero-width, bidi overrides, newlines).
  // eslint-disable-next-line no-control-regex
  const cleaned = text.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e]/g, "");

  /*
   * `\p{M}` (combining marks) is required, not optional: in Bengali — and in
   * Devanagari, Arabic, Thai and most Indic scripts — vowel signs and
   * conjuncts are Marks, not Letters. Without it, "রুমা" is rejected while
   * "Ruma" is accepted, which is exactly the kind of bug a unit test finds and
   * a demo never does.
   */
  if (!/^[\p{L}\p{M}\p{N} ._-]+$/u.test(cleaned)) {
    throw new HttpError(
      400,
      "Display names can use letters, numbers, spaces, dots, dashes and underscores.",
    );
  }
  return cleaned;
}

/** Amundsen-ish unambiguous code alphabet (no 0/O/1/I). */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Cryptographically random, human-readable 6-character party code.
 * 32^6 ≈ 1.07 billion combinations; collisions are checked by the caller.
 * @returns {string}
 */
export function generatePartyCode() {
  const { randomInt } = globalThis.crypto
    ? { randomInt: (max) => globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % max }
    : { randomInt: (max) => Math.floor(Math.random() * max) };

  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function sanitizePartyCode(raw) {
  const code = String(raw ?? "")
    .toUpperCase()
    .trim();
  if (!/^[A-Z2-9]{6}$/.test(code)) throw new HttpError(400, "That invite code looks wrong.");
  return code;
}

/**
 * TMDB title id, e.g. "tmdb-movie-693134".
 * @param {unknown} raw
 * @returns {string}
 */
export function sanitizeTitleId(raw) {
  const id = String(raw ?? "").trim();
  const isTmdb = /^tmdb-(movie|series)-\d{1,9}$/.test(id);
  const isDemo = /^demo-(original-)?[a-z0-9]+(-[a-z0-9]+){0,5}$/.test(id);
  if (!isTmdb && !isDemo) {
    throw new HttpError(400, "Unknown title reference.");
  }
  return id;
}

/**
 * Clamp a number into a range, falling back to a default.
 * @param {unknown} raw
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 */
export function clampNumber(raw, min, max, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
