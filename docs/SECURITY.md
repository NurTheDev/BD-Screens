# Security notes

What this app defends against, what it deliberately does not, and the reasoning
behind each choice. Written plainly: a portfolio project invites a closer look at
its security, and claiming more than is true is the worst possible answer.

---

## Threat model

Realistic threats for a public demo deployment:

| #   | Threat                                                  | Impact                                                              |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Scraping the TMDB token from the client bundle          | Token abuse, quota exhaustion                                       |
| 2   | Credential stuffing / brute force on sign-in            | Account takeover                                                    |
| 3   | Stored XSS through a display name or chat message       | Session theft in another viewer's browser                           |
| 4   | Content injection into generated SVG (label reflection) | XSS via `/api/art`                                                  |
| 5   | Path traversal through a title id                       | File disclosure (not possible: ids are validated against a pattern) |
| 6   | Clickjacking / embedding                                | UI redressing                                                       |
| 7   | Denial of service: request floods, huge payloads        | Availability                                                        |
| 8   | Amplifying upstream calls (cache-busting search terms)  | TMDB rate-limit exhaustion                                          |

Not in scope: video piracy (there is no video), payments (there are none), and
multi-tenant authorisation (there are no tenants).

---

## 1. Secrets are server-side only

**The v1 problem.** The original build called TMDB from the browser:

```js
// v1 — the token is inlined into the JS bundle and visible to anyone
headers: {
  Authorization: `Bearer ${import.meta.env.VITE_MOVIE_TOKEN}`;
}
```

Any `VITE_*` variable is a build-time constant. That token was public.

**v2.** The browser calls `/api/*`. `server/lib/tmdb.js` owns the credential:

- read from `TMDB_API_TOKEN` at boot, never returned by any endpoint,
- the logger redacts `token`, `authorization`, `password`, `cookie`, `secret`,
  `api_key` at any depth (see `server/lib/logger.js`),
- upstream URLs are never logged with their query string,
- `/api/health` reports `"live"` or `"demo"`, never the token or a fragment of it.

The Firebase web config **is** in the client, and that is correct: it identifies
the project, it does not authorise access. See §4.

---

## 2. Authentication

Firebase Authentication handles credentials. This app never sees, stores or
transmits a password itself.

| Control                                        | Implementation                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Password hashing, breach checks, rate limiting | Firebase Auth                                                                                              |
| Session storage                                | Firebase SDK default (IndexedDB + refresh)                                                                 |
| Email verification                             | `sendEmailVerification` at signup; surfaced in the UI, not silently ignored                                |
| OAuth                                          | `signInWithPopup` with `GoogleAuthProvider`, `prompt: select_account` — no offline access, no extra scopes |
| Sign-out                                       | Clears the Firebase session **and** the local demo profile                                                 |

**No account enumeration.** Sign-in failures always read "Email or password is
incorrect", regardless of which was wrong. The Firebase code is mapped to copy in
`src/lib/auth-utils.js`; `auth/user-not-found` is only ever shown for the
"create one instead?" hint inside a signed-in flow, never as a sign-in error.

**No credential logging.** The v1 sign-in handler had `console.log(input.email,
input.password)`. Every `console.log` in the auth path was removed; nothing in
`src/lib/auth.jsx` logs user input.

**Client-side checks are UX, not security.** `emailVerified` decides whether to
show a "verify your email" banner. Anything that matters — tmdb access, party
hosting — is enforced on the server, never by the client. The app also does not
read `emailVerified` to decide whether someone may use a feature.

### Testing without Firebase

If the Firebase config is absent or the SDK cannot load (blocked network,
adblocker), the app falls back to a **local demo profile** in `localStorage`. The
account menu labels it "Local demo profile" and the sign-in footer says
"Demo mode: local profile only". This exists so a reviewer can click through the
product. It grants nothing beyond local state, and it says so.

---

## 3. Input handling

All user input passes through `server/lib/validate.js` before use.

| Input        | Rule                                                                                 |
| ------------ | ------------------------------------------------------------------------------------ |
| Search text  | NFKC, trim, ≤80 chars, control chars and `<>` stripped                               |
| Display name | NFKC, trim, 2–24 chars, `\p{L}\p{M}\p{N} ._-` only, `<>` **rejected** (not stripped) |
| Chat message | Same pipeline as search, truncated to 240 chars                                      |
| Party code   | `^[A-Z2-9]{6}$` — no `0/O/1/I`, so codes survive being read aloud                    |
| Title id     | `^tmdb-(movie\|series)-\d{1,9}$` or `^demo-(original-)?[a-z0-9-]+$`                  |
| Numbers      | Clamped to a range with a fallback                                                   |
| JSON body    | 32 KB limit                                                                          |

Two findings from writing the tests for this:

1. **Bengali names were rejected.** `\p{L}` does not match vowel signs — in
   Bengali, Devanagari and most Indic scripts those are Unicode _marks_.
   `"রুমা"` failed while `"Ruma"` passed. Fixed by allowing `\p{M}`.
   This is a good example of why the app targets a Bangladeshi audience and
   should be tested with Bangladeshi text.
2. **Stripping markup silently rewarded it.** `"Nur<script>"` became
   `"Nurscript"` — a "valid" name derived from an attack string. The sanitizer
   now rejects `<>` outright. Names are cosmetic; rejecting a weird one is
   honest.

**Output escaping** is React's job (it escapes text nodes by default). The one
place the app writes raw markup is the generated artwork SVG, where the `label`
query parameter is escaped explicitly and covered by a test:

```js
assert.ok(!svg.includes("<script>"));
```

---

## 4. Authorisation, and what the Firebase config exposes

Firebase web config (`apiKey`, `authDomain`, `projectId`, …) is public by design.
Google documents this. Access control is enforced by Firebase, not by this client.

This app uses **Firebase Authentication only**. It writes nothing to Realtime
Database or Firestore — the profile lives in the Firebase user record
(`displayName`, `photoURL`) and everything else is local state. That is a
deliberate reduction of attack surface: no collection, no document, no rule that
can be misconfigured.

The consequence is that the only rules that matter are the Firebase Auth
settings, which are configuration rather than code:

| Setting                      | Required value                                | Why                                                                                                  |
| ---------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Email/Password provider      | Enabled                                       | Primary sign-in                                                                                      |
| Google provider              | Enabled                                       | Second sign-in path                                                                                  |
| Authorised domains           | `localhost`, the production host              | Prevents `auth/unauthorized-domain` and keeps OAuth on known origins                                 |
| Password policy              | 8 characters minimum                          | Enforced again in the UI, with a strength hint                                                       |
| Email enumeration protection | On                                            | Firebase returns generic errors; the client never distinguishes "no such user" from "wrong password" |
| Abuse protection             | App Check (reCAPTCHA v3) before public launch | See below                                                                                            |

> If you deploy this, check those six settings in the console. An enabled
> provider with a weak policy is the common mistake; this app cannot fix it from
> the client.

**Still to add before a public launch:** Firebase App Check. It would attest that
auth requests come from the real build rather than a script. It is not enabled
here because it needs a reCAPTCHA site key, and the demo is designed to run with
zero configuration. Recording it as an outstanding item is more useful than
claiming a control that is not switched on.

## 5. HTTP hardening

Set in `server/middleware/security.js` on every response:

| Header                         | Value                                                          | Why                                           |
| ------------------------------ | -------------------------------------------------------------- | --------------------------------------------- |
| `X-Content-Type-Options`       | `nosniff`                                                      | No MIME sniffing of user-influenced responses |
| `Referrer-Policy`              | `strict-origin-when-cross-origin`                              | No full URLs leaked to third parties          |
| `Permissions-Policy`           | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Nothing here needs them                       |
| `Cross-Origin-Opener-Policy`   | `same-origin-allow-popups`                                     | Isolation without breaking the Google popup   |
| `Cross-Origin-Resource-Policy` | `same-origin`                                                  | No cross-origin embedding of API responses    |
| `X-Powered-By`                 | removed                                                        | No free fingerprinting                        |
| `Content-Security-Policy`      | production only, see below                                     | Blocks injected script                        |
| `Strict-Transport-Security`    | production only, 1 year                                        | No downgrade                                  |
| `X-Request-Id`                 | per request                                                    | Correlate a user report with a log line       |

Production CSP:

```
default-src 'self';
script-src 'self' https://apis.google.com https://www.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob: https://image.tmdb.org https://*.googleusercontent.com;
media-src 'self' blob: https://*.googlevideo.com;
frame-src 'self' https://www.youtube-nocookie.com https://accounts.google.com;
connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com
            https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com;
object-src 'none'; base-uri 'self'; form-action 'self';
frame-ancestors 'self'; upgrade-insecure-requests
```

Three honest notes:

- `style-src 'unsafe-inline'` is present because Tailwind and Google's auth widget
  both emit inline styles. Removing it needs nonces threaded through the build.
- The CSP is **not sent in development**, because Vite injects inline scripts for
  HMR. Dev is localhost-only and not internet-reachable.
- `frame-ancestors` defaults to `'self'` and is configurable via
  `FRAME_ANCESTORS`; there is no `X-Frame-Options` header because it cannot
  express an allow-list and CSP already covers it.

`Cross-Origin-Embedder-Policy` is intentionally **absent**: `require-corp` would
break the TMDB image CDN and the YouTube trailer embed, and nothing here needs
`SharedArrayBuffer`.

---

## 6. Rate limiting

Fixed-window limiter, in memory, per IP (`req.ip`, which respects `TRUST_PROXY`).

| Bucket                | Window      | Limit                                    |
| --------------------- | ----------- | ---------------------------------------- |
| `/api/*`              | 60 s        | 120 requests                             |
| `/api/search`         | 60 s        | 30 requests                              |
| WebSocket connections | 60 s window | 20-message burst, then 4/s refill        |
| Reactions per member  | continuous  | 6 burst, 1/s refill                      |
| Party joins           | —           | 24 seats per room, 200 rooms per process |

Responses carry `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and
`Retry-After` on `429`. Blocked requests are logged **once per window per client**,
so a flood cannot itself become a log flood.

Search has a tighter budget because it is the only endpoint that can generate
arbitrary upstream work.

**Limitation, stated plainly:** this is per-process memory. Behind multiple
instances it is per-instance, so effective limits multiply. The honest production
answer is a shared store (Redis) or an edge limiter. For a single-instance demo,
this is the right amount of engineering — and it is the first thing to change if
this ever ran on more than one box.

---

## 7. Caching and the upstream

- Responses are normalised, never passed through. Upstream error bodies and
  headers do not reach the client.
- Upstream 401/403 become `502 "Catalogue provider rejected our credentials"`.
  The operator gets the detail in the server log; the browser gets a safe message.
- An 8-second timeout with `AbortController` prevents a slow upstream from piling
  up sockets.
- Search is cached for 60s per normalised query string, and rate-limited to 30/min
  per IP, which limits the damage of cache-busting.
- Cache keys are built from validated, normalised values — not raw query strings.

---

## 8. WebSocket specifics

| Risk                            | Control                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| Oversized frames                | `maxPayload: 8 * 1024` at the transport                                 |
| Memory growth from dead sockets | 30 s heartbeat; two missed pongs terminate the socket                   |
| Idle rooms                      | Collected an hour after the last member leaves                          |
| Message flooding                | Token bucket per socket; reactions have their own per-member bucket     |
| Unauthorised playback control   | `party:sync` and `party:handover` check `party.hostId === clientId`     |
| Payload injection into UI       | Text is length-capped and sanitised; React escapes on render            |
| Room code guessing              | 32^6 ≈ 1.07 billion codes, `crypto`-random, collision-checked on create |

Message handlers throw on invalid input; the exception is caught per message and
turned into a safe `error` frame. A bad message never closes the socket and never
crashes the process.

---

## 9. Client-side storage

| Key                                    | Contents                   | Lifetime      |
| -------------------------------------- | -------------------------- | ------------- |
| `bds:v1:watchlist`                     | Title ids, names, posters  | Until cleared |
| `bds:v1:progress`                      | Resume positions           | Until cleared |
| `bds:v1:taste-ratings`                 | Thumbs up/down             | Until cleared |
| `bds:v1:recent-searches`               | Last five search terms     | Until cleared |
| `bds:party-session` (`sessionStorage`) | Room code and display name | One tab       |

No credentials, tokens or email addresses are stored by this app. All access goes
through `src/lib/storage.js`, which is namespaced, versioned, and degrades to
memory when storage throws (private windows, embedded webviews, full quota).

---

## 9a. Known exposure in the existing Git history

The v1 repository **committed a TMDB token** in `.env` (commit `51cb4e8`). That
file is now untracked and `.gitignore` covers it, so nothing new can leak — but a
tracked file's contents stay in history, and anyone with a clone can read them.

Two steps are needed, and the first one is urgent regardless of this codebase:

1. **Revoke that token** in the TMDB dashboard and issue a new one. A secret that
   has been pushed should be treated as public, even if the repository is private
   and short-lived.
2. Optionally purge it from history. `git filter-repo --path .env --invert-paths`
   rewrites every commit and requires a force-push, so it should be a deliberate
   decision rather than something a refactor does quietly. If the repository has
   been cloned or forked, the old commits may still exist elsewhere; step 1 is
   what actually protects the account.

This document records the exposure rather than omitting it: a security note that
only lists controls, and never incidents, is not a security note.

## 10. Dependency and build hygiene

- Six runtime dependencies; each one is used and can be explained.
- The old client-side TMDB and carousel dependencies are gone, which removes
  several transitive packages.
- `npm audit` is clean at the time of writing.
- No postinstall scripts are required.
- `dist/` is never committed.

---

## Reporting

This is a portfolio project, but security reports are welcome and taken
seriously. Email **nur756.islam@gmail.com** with steps to reproduce. Please do not
open a public issue for anything exploitable.
