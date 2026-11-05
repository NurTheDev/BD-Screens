# BD Screens

**A streaming platform for Bangladeshi film, drama and live shows.**

Built and maintained by **[Md. Nur Islam](https://github.com/nurthedev)** — full-stack developer, Dhaka.

<p>
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white">
  <img alt="Node" src="https://img.shields.io/badge/Node-20%2B-5FA04E?logo=node.js&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white">
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black">
  <img alt="Tests" src="https://img.shields.io/badge/tests-34%20passing-3DDC97">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

---

## What this is

BD Screens started in March 2025 as a client-side React exercise: a TMDB-powered
browse page with Firebase login. Version 2 is a rebuild of that idea into
something closer to a product — a real API layer, a recommendation flow, a
synchronised watch-party feature, tests and written documentation.

It is a portfolio project. There is no licensed video, so the player runs on a
**synthesised timeline**: every control, progress bar, resume point and
watch-party sync is real, the frames are not.

|                |                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Live demo**  | [`bd-screens-hfrw.vercel.app`](https://bd-screens-hfrw.vercel.app)                                                        |
| **Stack**      | React 19 · Vite 6 · Tailwind 4 · Node/Express · Firebase Auth · WebSocket (`ws`)                                          |
| **Test suite** | 34 tests — `npm test`                                                                                                     |
| **Docs**       | [Architecture](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Security](docs/SECURITY.md) · [Decisions](docs/DECISIONS.md) |

---

## The five things worth your time

If you only look at five things in this repository, look at these.

### 1. Mood Match — a recommender that explains itself

Most streaming apps answer "what should I watch?" with an infinite grid.
[`/discover`](src/pages/Discover.jsx) asks for up to three moods and an optional
time budget, then returns a **ranked shortlist with a reason and a confidence
figure for every title**.

The scoring is deliberately transparent — mood tags weigh 10, genre affinity
weighs 2, quality provides a tie-break — and the UI says so in a collapsible
"how this works" panel. The shortlist lives in the URL, so it can be sent to a
group chat before anyone presses play.

`server/data/catalogue.js` · `src/pages/Discover.jsx` · tests in `server/data/catalogue.test.js`

### 2. Watch Party — everyone on the same frame

Create a room, share a six-character code, and every participant's player locks
to the host's timeline.

The interesting part is that **sync is measured, not claimed**:

```
position(t) = playing ? positionSec + (t - anchoredAt) : positionSec
```

Playback is stored as an anchor timestamp instead of a stream of ticks. Each
client measures its clock offset against the server with four ping/pong round
trips and keeps the lowest-RTT sample — network jitter only ever adds delay, so
the fastest sample is the most accurate. The panel then displays the real figure:
`synced ±3 ms`.

Server-side: only the host may drive playback, reactions are token-bucketed per
member, frames are capped at 8 KB, seats at 24, and an idle room is collected
after an hour. Host leaving promotes the longest-standing member instead of
orphaning the room.

`server/lib/party-hub.js` · `src/lib/watchParty.jsx` · `src/components/watch/PartyPanel.jsx`

### 3. The API key is not in the bundle

The original build called TMDB straight from the browser with a
`VITE_MOVIE_TOKEN`, which means the token shipped to every visitor.

Now a small Express proxy owns the credential, with an 8-second upstream
timeout, a five-minute in-memory cache, in-flight request collapsing (six
carousels asking for the same feed produce one upstream call), and a per-feed
fallback to the bundled catalogue. `GET /api/health` reports which source is
live so the UI can be honest about it.

`server/lib/tmdb.js` · `server/routes/api.js`

### 4. Failure is designed, not discovered

- Every upstream failure degrades to the **bundled BD Screens Originals
  catalogue** — the home page is never empty, even with no API key and no network.
- Every poster has a skeleton, a fade-in and a deterministic gradient fallback.
- Every error carries a `requestId` that matches the server log line.
- A React error boundary keeps one bad payload from white-screening the app.

### 5. Accessibility and keyboard support are build steps, not afterthoughts

Skip link, visible focus rings, one polite live region for toasts, a
keyboard-driven player (`Space`, `J`/`L`, `M`, `F`, arrows), `prefers-reduced-motion`
honoured by every animation — including the hero, which also stops advancing
when the tab is hidden.

---

## Screens

| Home                                                                            | Title detail                                                             |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Rotating hero, mood strip, Continue Watching, editorial rails, production notes | Poster, verdict, cast, "Inside the making", details rail, similar titles |

| Discover                                            | Watch party                                               |
| --------------------------------------------------- | --------------------------------------------------------- |
| Mood selection with live shortlist and explanations | Player, sync badge, members, chat, rate-limited reactions |

| Browse                                         | Theatre                                            |
| ---------------------------------------------- | -------------------------------------------------- |
| Genre filters and sorting that live in the URL | Full-bleed player, up-next row, keyboard shortcuts |

---

## Run it locally

```bash
git clone https://github.com/nurthedev/BD-Screens.git
cd BD-Screens
npm install
cp .env.example .env      # optional: add a TMDB token for live data
npm run dev               # api :8787 · web :5173 (open http://localhost:5173)
```

Production:

```bash
npm run build && npm start   # Express serves the built client and the API
```

### Configuration

Everything is optional — the app is fully functional with an empty `.env`.

| Variable          | Required | Purpose                                                                                                             |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `TMDB_API_TOKEN`  | no       | TMDB v4 read token. Read **server-side only**; enables the live catalogue. Without it the demo catalogue is served. |
| `PORT`            | no       | API port (default `8787`).                                                                                          |
| `ALLOWED_ORIGINS` | no       | Comma-separated CORS allow-list for development.                                                                    |
| `VITE_FIREBASE_*` | no       | Firebase web config. Without it the app runs with a local demo profile.                                             |
| `LOG_LEVEL`       | no       | `debug` \| `info` \| `warn` \| `error`.                                                                             |
| `TRUST_PROXY`     | no       | Set to `1` in production behind a reverse proxy.                                                                    |

> The Firebase web config is public by design — it identifies the project, it does
> not grant access. This app uses Firebase **Auth only**, so there is no rule set to
> deploy; the settings that matter (providers, authorised domains, enumeration
> protection) are listed in [docs/SECURITY.md](docs/SECURITY.md).

---

## Project structure

```
BD-Screens/
├── server/                  Express API + WebSocket hub (no build step, plain ESM)
│   ├── index.js             boot order, static client, graceful shutdown
│   ├── config.js            one place for env, validated at startup
│   ├── lib/
│   │   ├── tmdb.js          upstream adapter: normalise, cache, collapse, fall back
│   │   ├── party-hub.js     watch-party state machine over WebSocket
│   │   ├── validate.js      input sanitizers (tested)
│   │   └── logger.js        structured logs with secret redaction
│   ├── middleware/          headers, CORS, rate limits, central error handler
│   ├── routes/api.js        the public JSON contract
│   └── data/catalogue.js    the curated demo catalogue + mood matcher
├── src/                     React client
│   ├── pages/               one file per route, all code-split
│   ├── components/          layout · home · watch · ui (design system)
│   ├── lib/                 api client, auth, library, watch party, storage
│   ├── hooks/               useFetch, useAsync, useDebounced, useInView
│   ├── styles/index.css     the design system (Tailwind v4 @theme)
│   └── data/                menu copy and other static UI data
└── docs/                    architecture · API · security · decisions
```

---

## Scripts

| Command          | What it does                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| `npm run dev`    | API and Vite dev server together, with the browser proxying `/api` and `/ws` |
| `npm run build`  | Production client build                                                      |
| `npm start`      | Serve the built client + API from one Express process                        |
| `npm test`       | 34 unit and HTTP tests via Node's built-in runner                            |
| `npm run lint`   | ESLint (flat config, separate client/server environments)                    |
| `npm run format` | Prettier                                                                     |

---

## What changed in v2

The first version worked, but it had problems worth naming:

| v1                                                                               | v2                                                                           |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| TMDB token shipped in the bundle                                                 | Server-side proxy; no credential in the client                               |
| Auth check on `emailVerified` in the client only, `console.log(user)` in sign-in | No credentials logged; generic failure copy; verification handled explicitly |
| Firebase config hard-coded                                                       | Environment configuration, documented and optional                           |
| `console.log` on every render                                                    | Removed; structured logging on the server                                    |
| `react-slick` carousels duplicating slides                                       | Native scroll-snap rails — keyboard and touch work, no slider dependency     |
| Pages with no error, empty or loading states                                     | Designed states for all three, everywhere                                    |
| One 700-line stylesheet, classes per element                                     | Token-based design system, component classes only                            |
| No tests, no docs, CRA-style README                                              | 34 tests, four docs, documented decisions                                    |

---

## Author

<img src="src/assets/portrait-nur.jpg" width="148" align="right" hspace="16" alt="Md. Nur Islam" />

**Md. Nur Islam** — full-stack developer, Dhaka, Bangladesh.

[nur756.islam@gmail.com](mailto:nur756.islam@gmail.com) · +880 1957 282954
[GitHub @nurthedev](https://github.com/nurthedev) · [LinkedIn in/nurthedev](https://linkedin.com/in/nurthedev)

I build product-style web apps end to end: React on the front, Node and Express
behind it, and enough care about states, errors and accessibility that the result
still holds up when someone else opens devtools.

<br clear="right" />

### Projects

| Project                               | When           | Stack                                                              | Notes                                                                                                                                                   |
| ------------------------------------- | -------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BD Screens** (this repo)            | 2025           | React, Vite, Tailwind, Node/Express, Firebase Auth, WebSocket      | Rebuilt from a client-only demo into a full-stack app: server-side TMDB proxy, mood-based recommender, synchronised watch parties, 34 tests, four docs. |
| **Exclusive** — e-commerce storefront | Jun – Jul 2025 | React, Vite, RTK Query, Firebase Auth, Tailwind, Flowbite, DaisyUI | Product catalogue, cart and checkout, auth-gated routes. [exclusive-store.vercel.app](https://exclusive-store.vercel.app)                               |

### Education

|                            |                                                       |
| -------------------------- | ----------------------------------------------------- |
| **BBA (Hons), Management** | Mirpur University, Dhaka · expected 2027              |
| **HSC**                    | Vashantek Government College · 2021 · GPA 4.75 / 5.00 |

### Training and recognition

- **MERN Stack Development** — Creative IT Institute · Jun 2024 – present
- **"Best View Website"** — first place, web design showcase

### Skills

|               |                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Front-end** | JavaScript (ES6+), React, React Router, Redux Toolkit / RTK Query, HTML5, CSS3, Tailwind CSS, Bootstrap, Flowbite, DaisyUI |
| **Back-end**  | Node.js, Express, REST API design, WebSocket, MongoDB, Firebase Auth, session and token flows                              |
| **Tooling**   | Git, GitHub, Vite, ESLint, Prettier, Postman, VS Code, Vercel, Linux                                                       |
| **Practices** | Accessibility (WCAG basics), performance budgets, security-first defaults, technical writing                               |

### About this build, in one paragraph

BD Screens is where I practise the parts of the job that do not fit in a tutorial:
keeping a secret on the server, designing a state machine that survives a dropped
socket, writing the tests that catch a bug before a reviewer does, and writing the
document that explains why the code looks the way it does. The parts I would do
differently next time are in [docs/DECISIONS.md](docs/DECISIONS.md) rather than
hidden.

---

## Licence

MIT for the code — see [LICENSE](LICENSE). The demo catalogue — titles,
synopses, production notes and the generated artwork in `public/art` — was
created for this project and is not licensed for commercial reuse. Live metadata and imagery come from
[TMDB](https://www.themoviedb.org/) and remain the property of their owners.

This product uses the TMDB API but is not endorsed or certified by TMDB.
