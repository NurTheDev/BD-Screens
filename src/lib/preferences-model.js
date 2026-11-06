/**
 * @file preferences-model.js
 * @description The preference schema, its defaults, and the normaliser that
 * turns a stored blob into trustworthy state.
 *
 * Plain JavaScript on purpose: the provider in `preferences.jsx` needs React,
 * but these pure functions are the part with rules in them, so they live
 * somewhere `node --test` can import directly.
 */

/**
 * @typedef {{
 *   autoplayNext: boolean,
 *   defaultVolume: number,
 *   reduceMotion: boolean | null,
 *   highContrast: boolean,
 *   posterQuality: "standard" | "cosy",
 *   spoilerTitles: boolean,
 *   emailDigest: boolean,
 *   partyInvites: boolean,
 *   recommendations: boolean,
 * }} Preferences
 */

/** @type {Preferences} */
export const DEFAULT_PREFERENCES = Object.freeze({
  autoplayNext: true,
  defaultVolume: 0.8,
  reduceMotion: null,
  highContrast: false,
  posterQuality: "standard",
  spoilerTitles: false,
  emailDigest: false,
  partyInvites: true,
  recommendations: true,
});

/**
 * Validate a stored blob field by field.
 *
 * A preferences file can come from an older build, or from a user who edited it
 * by hand. Neither should be able to put `defaultVolume: "loud"` into the player
 * or an unknown key into app state, so every field is checked and coerced here.
 *
 * @param {unknown} raw
 * @returns {Preferences}
 */
export function normalisePreferences(raw) {
  const input = raw && typeof raw === "object" ? /** @type {any} */ (raw) : {};
  const bool = (/** @type {unknown} */ value, /** @type {boolean} */ fallback) =>
    typeof value === "boolean" ? value : fallback;
  const volume = Number(input.defaultVolume);

  return {
    autoplayNext: bool(input.autoplayNext, DEFAULT_PREFERENCES.autoplayNext),
    defaultVolume: Number.isFinite(volume)
      ? Math.min(1, Math.max(0, volume))
      : DEFAULT_PREFERENCES.defaultVolume,
    reduceMotion:
      input.reduceMotion === null || typeof input.reduceMotion === "boolean"
        ? input.reduceMotion
        : DEFAULT_PREFERENCES.reduceMotion,
    highContrast: bool(input.highContrast, DEFAULT_PREFERENCES.highContrast),
    posterQuality: input.posterQuality === "cosy" ? "cosy" : "standard",
    spoilerTitles: bool(input.spoilerTitles, DEFAULT_PREFERENCES.spoilerTitles),
    emailDigest: bool(input.emailDigest, DEFAULT_PREFERENCES.emailDigest),
    partyInvites: bool(input.partyInvites, DEFAULT_PREFERENCES.partyInvites),
    recommendations: bool(input.recommendations, DEFAULT_PREFERENCES.recommendations),
  };
}
