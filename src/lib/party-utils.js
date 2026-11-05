/**
 * @file party-utils.js
 * @description Constants and helpers shared by the watch-party UI.
 *
 * These live outside the context module for two reasons: React Fast Refresh
 * requires a file to export components only, and the reaction palette is also
 * mirrored on the server (server/lib/party-hub.js) — keeping it a plain data
 * module makes that relationship obvious.
 */

/**
 * Reaction palette. Deliberately plain emoji that exist in every system font,
 * so the panel never depends on a multi-megabyte emoji webfont to stay legible.
 */
export const REACTIONS = Object.freeze(["❤️", "🔥", "😂", "😱", "👏", "😭", "🤯", "🍿"]);

/**
 * Human-friendly invite link for a room.
 * @param {string} code
 */
export function inviteLink(code) {
  return `${window.location.origin}/party/${code}`;
}
