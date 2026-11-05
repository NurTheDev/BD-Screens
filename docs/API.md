# API reference

Base URL: `/api` in development (proxied by Vite) and in production (same origin).

Every JSON response uses the same envelope:

```json
{
  "data": {},
  "meta": { "source": "demo", "degraded": true }
}
```

Errors are always:

```json
{
  "error": {
    "message": "Human readable, safe to display",
    "code": "bad_request",
    "requestId": "3f9a1c2e-…"
  }
}
```

`requestId` matches the server log line for that request — quote it in a bug
report and the log can be found immediately.

---

## `GET /api/health`

Liveness plus which catalogue source is active. Used by the client to decide
whether to show the "demo catalogue" note.

```json
{
  "data": {
    "status": "ok",
    "app": { "name": "BD Screens", "version": "2.0.0" },
    "uptimeSeconds": 412,
    "catalogue": "live",
    "counts": { "demoTitles": 24, "originals": 8 },
    "cache": { "entries": 12, "inFlight": 0 }
  },
  "meta": { "source": "tmdb" }
}
```

`catalogue` is `"live"` when a TMDB token is configured, otherwise `"demo"`.
The app is fully usable either way.

---

## `GET /api/feeds`

Everything the home page needs, in one request. The spotlight plus seven
editorial rows. This exists so the landing page does not fan out to six
endpoints over a mobile connection.

```json
{
  "data": {
    "spotlight": [Title, Title, Title],
    "rows": [
      {
        "id": "bd-originals",
        "title": "BD Screens Originals",
        "subtitle": "Made here. Streaming here first.",
        "layout": "poster",
        "href": "/browse?row=originals",
        "items": [Title, …]
      }
    ]
  },
  "meta": { "source": "demo", "degraded": false, "cachedAt": "2025-11-05T07:00:00.000Z" }
}
```

Row ids, in order: `bd-originals`, `trending`, `late-night`, `top-rated`,
`now-playing`, `bangla`, `series`.

`degraded: true` means at least one row fell back to the bundled catalogue.

---

## `GET /api/feed/:name?page=1`

A single row, for pagination. Valid names: `trending`, `top-rated`,
`now-playing`, `series`, `bangla`, `late-night`.

---

## `Title shape`

The normalised object every endpoint returns. The client has exactly one render
path for demo and live data because both produce this.

| Field         | Type                    | Notes                                                                                        |
| ------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `id`          | string                  | `tmdb-movie-693134`, `tmdb-series-1234`, `demo-original-monsoon-express`, `demo-title-bhola` |
| `source`      | `"tmdb"` \| `"demo"`    | Drives the "why this is here" note on the detail page                                        |
| `kind`        | `"movie"` \| `"series"` |                                                                                              |
| `title`       | string                  |                                                                                              |
| `overview`    | string                  | May be empty for a TMDB title with no synopsis                                               |
| `year`        | number \| null          |                                                                                              |
| `releaseDate` | string \| null          | `YYYY-MM-DD`                                                                                 |
| `genres`      | string[]                | Resolved from TMDB genre ids                                                                 |
| `rating`      | number                  | 0–10, one decimal                                                                            |
| `votes`       | number                  |                                                                                              |
| `poster`      | string \| null          | Absolute URL or `/art/...`                                                                   |
| `backdrop`    | string \| null          | Wide still, used behind scrims                                                               |
| `hero`        | string \| null          | Wide still sized for the landing hero                                                        |
| `accent`      | string                  | Hex colour used for cards and gradients                                                      |
| `runtime`     | number \| null          | Minutes; per-episode for series                                                              |
| `moods`       | string[]                | Demo titles only; drives Mood Match                                                          |

Detail responses add `tagline`, `maturity`, `language`, `seasons`, `cast`
(`{ name, role, photo }`), `crew` (`{ name, job }`), `notes`
(`{ title, body }[]`), `trailerKey` and `similar` (`Title[]`).

---

## `GET /api/title/:id`

Full detail. `similar` is always populated for demo titles, so a detail page is
never a dead end.

```json
{
  "data": {
    "id": "demo-original-monsoon-express",
    "title": "Monsoon Express",
    "tagline": "Every train leaves someone behind.",
    "runtime": 118,
    "maturity": "U/A 13+",
    "cast": [{ "name": "Rafiqul Hasan", "role": "Kuddus, the collector", "photo": "/art/cast-1.jpg" }],
    "crew": [{ "name": "Nusrat Ara", "job": "Director" }],
    "notes": [{ "title": "Shot on real platforms", "body": "…" }],
    "similar": [Title, …]
  }
}
```

| Status | When                                                  |
| ------ | ----------------------------------------------------- |
| `400`  | The id does not match the expected pattern            |
| `404`  | Unknown demo title, or TMDB has no such title         |
| `503`  | A TMDB id was requested and no provider is configured |

---

## `GET /api/search?q=&page=1`

Searches the bundled catalogue and (when configured) TMDB, merging results with
local hits first and de-duplicating by `title|year`.

| Query                    | Result                                           |
| ------------------------ | ------------------------------------------------ |
| `q` missing or blank     | `400 Type something to search for.`              |
| `q` longer than 80 chars | `400 Search terms are limited to 80 characters.` |
| no matches               | `200` with `[]` and `meta.took: "no-match"`      |

Search text is NFKC-normalised, trimmed, and stripped of control characters
and angle brackets before it reaches either source.

---

## `GET /api/moods`

The seven mood definitions, used by the discover page and the home strip.

```json
{
  "data": [
    {
      "id": "crying",
      "label": "Need a good cry",
      "blurb": "Tissues, not answers.",
      "accent": "#e6739f"
    }
  ]
}
```

---

## `GET /api/moods/match?moods=&minutes=&limit=&exclude=`

The recommender.

| Parameter | Rules                                                                                        |
| --------- | -------------------------------------------------------------------------------------------- |
| `moods`   | Comma-separated ids. **Required**, at least one, **at most three**. Unknown ids are ignored. |
| `minutes` | 0–240. `0` means no limit. Runtime is a hard filter, never a sort.                           |
| `limit`   | 1–24, default 12.                                                                            |
| `exclude` | Comma-separated title ids to drop (used by "show me something else").                        |

Response items are `Title` plus:

| Field         | Meaning                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `match`       | 60–100. The score normalised against the best result in the set — a relative figure, described as such in the UI. |
| `matchReason` | The mood tag that fired, used for the "one to cry to" line.                                                       |

| Status | When                         |
| ------ | ---------------------------- |
| `400`  | No moods, or more than three |

---

## `GET /api/art/:seed.svg?w=500&h=750&label=Monsoon+Express`

Deterministic placeholder artwork generated as SVG from the seed string. Same
seed, same image, on every device. Served with
`Cache-Control: public, max-age=31536000, immutable`.

The `label` is **escaped**, not reflected: `<script>` becomes `&lt;script&gt;`.
There is a test for this.

---

## Watch party (WebSocket)

Endpoint: `ws://<host>/ws` (or `wss://` in production). Max frame size 8 KB.
One connection holds one seat.

### Message flow

```
client → party:create { name, titleId }   ← party:joined { code, hostId, playback, members, chat }
client → party:join   { code, name }      ← party:joined { … }
client → party:ping   { t }               ← pong { t, serverTime }
client → party:sync   { playing, positionSec }   (host only) ← party:state to everyone
client → party:chat   { text }            ← party:chat { message }
client → party:reaction { emoji }         ← party:reaction { emoji, name }
client → party:handover { memberId }      (host only) ← party:members + party:notice
client → party:leave                      ← party:left
```

Server-initiated: `party:members`, `party:notice`, `error { code, message }`,
`welcome { clientId, serverTime, reactions }`.

### Playback state

```js
{ playing: true, positionSec: 742, anchoredAt: 1730000000000 }
```

`position(t) = playing ? positionSec + (t + clockOffset - anchoredAt) / 1000 : positionSec`

The client derives `clockOffset` from `party:ping`/`pong` samples and displays
the measured error as `synced ±N ms`.

### Limits and rejections

| Rule                                                   | Behaviour                                              |
| ------------------------------------------------------ | ------------------------------------------------------ |
| Non-host sends `party:sync`                            | `error`: "Only the host can control playback."         |
| More than 24 members                                   | `error`: "This party is full (24 seats)."              |
| Reaction beyond the token bucket (6 burst, 1/s refill) | Silently dropped                                       |
| Chat longer than 240 chars                             | Truncated                                              |
| Unknown or malformed message                           | `error` with a safe message; the connection stays open |
| More than 20 messages in a burst on one socket         | `error: rate_limited`                                  |
| No pong for two heartbeats (60 s)                      | Socket terminated, seat released                       |

### `GET /api/party/:code/verify`

Returns `200 { data: { code, active: true } }` when the room exists, `404`
otherwise, and `400` for a malformed code. Used by the join form so a typo gets
a helpful message instead of a socket that connects and then fails.

---

## Status codes used

| Code  | Meaning in this API                                 |
| ----- | --------------------------------------------------- |
| `400` | Validation failed — the message says what to fix    |
| `404` | Unknown route, unknown demo title, or missing party |
| `413` | Body over 32 KB                                     |
| `429` | Rate limited; includes `Retry-After`                |
| `502` | Upstream rejected us or returned garbage            |
| `503` | No provider configured for the requested resource   |
| `504` | Upstream timed out                                  |

Every response carries `X-Request-Id`, `RateLimit-*` headers and the standard
security headers documented in [SECURITY.md](SECURITY.md).
