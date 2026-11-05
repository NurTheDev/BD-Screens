/**
 * @file http-error.js
 * @description A small Error subclass that carries an HTTP status.
 *
 * The central error handler uses this to decide what the client is allowed to
 * know. Anything thrown that is NOT an HttpError is treated as a bug: logged in
 * full on the server, reported as a generic 500 to the client.
 */

export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message safe to show a user
   * @param {{ code?: string, details?: unknown }} [options]
   */
  constructor(status, message, options = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = options.code ?? defaultCode(status);
    this.details = options.details;
    this.expose = true;
  }
}

/**
 * @param {number} status
 * @returns {string}
 */
function defaultCode(status) {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 413) return "payload_too_large";
  if (status === 429) return "rate_limited";
  if (status === 502) return "upstream_error";
  if (status === 503) return "unavailable";
  if (status === 504) return "upstream_timeout";
  return status >= 500 ? "internal_error" : "request_failed";
}
