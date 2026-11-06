# Architecture

How BD Screens is put together, why the boundaries are where they are, and what
each piece is responsible for. Written to be read before changing something.

---

## The shape of the system

```
┌──────────────────────────── browser ────────────────────────────┐
│  React 19 (Vite)                                                │
│                                                                 │
│  routes ──► pages ──► components                                │
│              │                                                  │
│              ├─ lib/api.js ─────────────┐                       │
│              ├─ lib/auth.jsx ──────┐    │                       │
│              ├─ lib/library.jsx    │    │  WebSocket            │
│              └─ lib/watchParty.jsx ┴────┼────────┐              │
└─────────────────────────────────────────┼────────┼─────────────┘
                                          │        │
                             HTTP /api   │        │ /ws
                                          ▼        ▼
┌──────────────────────────── Node process ──────────────────────┐
│  Express                                                        │
│    security middleware → rate limits → /api router → static     │
│                                                                 │
│  /api router                                                    │
│    ├─ data/catalogue.js   (bundled originals, mood scoring)     │
│    └─ lib/tmdb.js         (upstream adapter: cache + fallback)  │
│                                                                 │
│  lib/party-hub.js         (WebSocket: rooms, sync, chat)        │
└─────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                                     TMDB API  (optional)
```

One process in production. Two in development (`npm run dev`), because Vite's
HMR server is a better client host than Express, and Vite proxies `/api` and
`/ws` so the browser still sees a single origin.

---

## Why there is a server at all

The first version was a pure SPA: React called TMDB directly with a token from
`import.meta.env`. That is the shortest path to a working demo and the wrong one
for a portfolio, for three reasons:

1. **Secrets.** `VITE_*` variables are inlined into the bundle. Anyone who opens
   devtools owns the token. A proxy keeps it on the server.
2. **Control.** Rate limiting, caching, response shaping and fallbacks are all
   impossible from the client. TMDB's payloads are also shaped for their app,
   not ours — normalising them in one place means the UI has one render path.
3. **A place to put real logic.** Watch parties need an authority that holds the
   playback anchor. That is a server.

The server is deliberately dependency-light: Express, `ws`, `compression`. No ORM,
no validation framework, no logging framework. The trade-off is a little more
hand-written code; the benefit is that every dependency in `package.json` is one
the author can defend in an interview.

---

## Layers on the server

### `config.js` — one place for the environment

Reads `.env` once, validates at boot, and exposes a frozen object. If something
is missing the process prints an actionable warning instead of failing later
with `undefined` in a request.

### `lib/tmdb.js` — the upstream adapter

The only module that knows TMDB exists. Responsibilities:

- **Normalisation.** Every response becomes the app's own `Title` shape
  (`docs/API.md#title-shape`), so demo and live data render through identical
  components.
- **Caching.** A 5-minute TTL, 300-entry Map with FIFO eviction.
- **Collapsing.** Concurrent identical requests share one upstream call. A home
  page fires six feeds at once; without this, the same feed can be requested
  three times in the same tick.
- **Timeouts.** 8 seconds, `AbortController`, translated into a `504`.
- **Error translation.** Upstream 401/403 become `502 "provider rejected our
credentials"` — an operator problem, phrased as one, never leaked as a stack.

### `data/catalogue.js` — the bundled catalogue

The app must work with zero configuration, and TMDB has no Bangladeshi
originals, so the project ships eight curated titles with full editorial
metadata (synopsis, tagline, production notes, cast, crew, mood tags) plus
sixteen lighter catalogue entries.

It is also where **Mood Match** lives: `matchMoods()` scores titles against
selected moods and returns the reason each one fired. Keeping the scoring next
to the data makes it auditable and testable in one file.

### `lib/party-hub.js` — the WebSocket authority

A room is an in-memory object:

```js
{
  code: "A7DUYW",
  titleId: "demo-original-monsoon-express",
  hostId: "…",
  playback: { playing: true, positionSec: 742, anchoredAt: 1730000000000 },
  members: Map<id, Member>,
  chat: [ … last 60 messages … ],
}
```

The design decisions worth knowing:

| Decision                                            | Why                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Playback stored as an anchor, not a tick counter    | Any client can compute the position locally; the server sends one message per state change instead of 1/second per room. |
| Clock offset measured by the client                 | The server does not know each client's latency. Four ping/pong samples, lowest RTT wins, because jitter only adds delay. |
| Only the host may `party:sync`                      | Otherwise two people seeking at once fight, and the room thrashes.                                                       |
| Reactions token-bucketed per member                 | A burst from one person should be visible, not deafening.                                                                |
| Payload cap 8 KB, 24 seats, one room per connection | Bounds on memory and abuse, enforced at the transport level.                                                             |
| Host promotion on disconnect                        | A room should not die because one phone lost signal.                                                                     |
| No persistence                                      | Rooms are ephemeral by design; an hour after the last member leaves, the room is collected.                              |

### `middleware/security.js` — the HTTP perimeter

Order matters and is set in `server/index.js`:

1. `requestContext` — request id, timing, one log line per request (path only,
   never the query string, which can contain a search term).
2. `securityHeaders` — `nosniff`, referrer policy, permissions policy, COOP/CORP,
   and in production a CSP plus HSTS.
3. `cors` — allow-list only, credentials off, preflights cached for 10 minutes.
4. `rateLimit` — fixed window, per bucket, per IP.
5. `apiRouter` → `apiNotFound` → `errorHandler`.

---

## Layers on the client

### Data flow

```
page component
   │  useFetch(loader, deps)      ── loading / error / data / reload
   ▼
lib/api.js                       ── abort, timeout, error normalisation
   ▼
/api/*                           ── relative URL: works behind Vite proxy and Express
```

`useFetch` is 40 lines and does four things: runs when deps change, aborts the
previous request, distinguishes "cancelled" from "timed out", and exposes
`reload`. Anything more elaborate would be a data-fetching library, and this app
does not need one — the server already caches.

### State ownership

| State                         | Owner                      | Persistence                               |
| ----------------------------- | -------------------------- | ----------------------------------------- |
| Session / profile             | `lib/auth.jsx`             | Firebase, or a local demo profile         |
| Watchlist, progress, verdicts | `lib/library.jsx`          | `localStorage`, versioned and namespaced  |
| Party room                    | `lib/watchParty.jsx`       | `sessionStorage` for one tab's membership |
| Toasts                        | `components/ui/Toast.jsx`  | none                                      |
| Everything else               | Component state or the URL | —                                         |

Filters, search terms and mood selections live in the **URL**, not in component
state. That makes every view shareable and makes the back button behave.

### Rendering rules

- Routes are code-split; the home page is in the main bundle.
- Firebase is imported dynamically, only when auth is actually needed.
- The player is custom (not `<video controls>`), because playback is synthesised
  and the keyboard model has to match it.
- Posters are memoised leaf nodes; rails re-render, posters do not.

---

## Failure behaviour

| Failure                        | What the user sees                                                            |
| ------------------------------ | ----------------------------------------------------------------------------- |
| TMDB unreachable / no token    | Home page renders the demo catalogue with a dismissible "Demo catalogue" note |
| One feed fails, others succeed | Only that row falls back                                                      |
| API process down               | Home shows a specific error with a retry button, not a blank page             |
| A poster 404s                  | Deterministic gradient card with the title, never a broken image              |
| Firebase unreachable           | App keeps working with a local profile, labelled as such                      |
| WebSocket drops mid-party      | Client reconnects with exponential backoff and rejoins the same room          |
| Client navigates fast          | The in-flight request aborts; no `setState` after unmount                     |
| Render-time crash              | Error boundary shows a calm message and a reload action                       |

---

## Testing strategy

69 tests, run with Node's built-in runner — no Jest, no Vitest, no config.

| File                            | Covers                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `server/lib/validate.test.js`   | Sanitizers: unicode names, markup rejection, code alphabet, traversal, clamping                |
| `server/data/catalogue.test.js` | Catalogue integrity, artwork presence, unique ids, search ranking, mood scoring rules          |
| `server/api.test.js`            | The HTTP contract against a real child process with **no credentials** — proving the demo path |

The suite is written against the product rules (what a user can do), not the
implementation (which function calls which). Two real bugs were found this way:
Bengali names were rejected because vowel signs are Unicode _marks_, not
letters, and `"Nur<script>"` was silently stripped into a "valid" name.

---

## Deliberate omissions

Being explicit about what is missing is part of the design.

- **No video.** There is no licensed stream. The player runs a real timeline over
  generated artwork and says so, rather than pretending.
- **No database.** Catalogue data is a module; user data is local. Adding Postgres
  would mean credentials, migrations and a failure mode for zero portfolio value.
- **No SSR.** A streaming catalogue is authenticated and client-heavy; the SEO
  argument for SSR is weak here. `index.html` still ships a proper title,
  description, Open Graph tags and a `<noscript>` message.
- **No TypeScript.** JSDoc types run in the same files with zero build cost, and
  `checkJs` can be turned on later without a rewrite. See `jsconfig.json`.
