# Decision log

Short records of the decisions that shaped this project, including the ones I
reversed. Each entry says what was chosen, what was rejected, and what it cost.

Format: **context → decision → alternatives → consequences**.

---

## 001 — Add a server instead of calling TMDB from the browser

**Context.** v1 was a static SPA. It worked, and it shipped a TMDB token to every
visitor because `VITE_*` variables are inlined at build time.

**Decision.** Add a small Express service that owns the credential, normalises
upstream responses, caches them, and serves the built client in production.

**Alternatives considered.**

- _Keep it static and accept the exposed token._ Not acceptable once the project
  is presented as professional work.
- _Serverless functions._ Would work, but adds a vendor and a deploy step for a
  four-route API, and WebSockets are awkward on most function platforms.

**Consequences.** Deploy now needs a Node host. The client gets one render path
for demo and live data, and the token never leaves the server.

---

## 002 — A bundled catalogue, not an empty state

**Context.** With no TMDB token (or an unreachable API), a pure TMDB app shows
nothing. It also has no Bangladeshi films, which is the entire premise of the
product.

**Decision.** Ship a curated, fictional catalogue of eight originals with real
editorial metadata (synopsis, tagline, production notes, cast, crew, mood tags)
plus sixteen lighter entries. Every upstream failure falls back to it.

**Alternatives considered.**

- _A "configure your API key" screen._ Honest, but it makes the demo look broken
  to anyone evaluating it.
- _Scrape real Bangladeshi film metadata._ Licensing and accuracy problems for
  fictional demo data.

**Consequences.** The home page always works, including offline. There is a clear
visual note when demo data is being served, so nothing is misrepresented.

---

## 003 — The demo catalogue carries real editorial content

**Context.** Placeholder rows ("Title 1, Title 2") make a portfolio look like a
wireframe.

**Decision.** Write the catalogue as a fictional streaming service would: each
original has a tagline, a 60-word synopsis, three production notes and a cast.
The detail page has an "Inside the making" section built from it.

**Cost.** Several hours of writing that does not appear in the code. It is the
difference between "this person can render a grid" and "this person can build a
product", which is exactly what a reviewer is judging.

---

## 004 — Mood Match instead of a generic "recommended for you"

**Context.** Every streaming clone has a "Recommended" row. It demonstrates
nothing, because it is usually `sort by popularity`.

**Decision.** Build a guided flow: up to three moods, an optional time budget,
four results with a **reason** for each and a **confidence** figure. The scoring
function is 25 lines, deterministic, tested, and explained in the UI.

**Alternatives considered.**

- _A real recommender (embeddings, collaborative filtering)._ Needs behaviour data
  this app does not have, and a model whose output cannot be explained is worse
  for a demo than transparent scoring.
- _Random picks with a "AI-powered" label._ Actively dishonest; reviewers notice.

**Consequences.** The feature is explainable end to end. The percentage is a
relative score and the UI says so, which is more defensible than an invented
"97% match".

---

## 005 — Watch parties synchronise on an anchor timestamp

**Context.** A watch-party feature is the obvious "wow" item. The naive version
broadcasts `currentTime` every second, which drifts, floods the socket, and
copes badly with latency.

**Decision.** Store `{ playing, positionSec, anchoredAt }`. Clients compute
position locally and correct for clock offset measured via ping/pong (four
samples, lowest RTT wins). Display the measured error.

**Alternatives considered.**

- _Broadcast ticks._ Simple, but one message per second per room, and every
  client still drifts by its own latency.
- _NTP-style server offset only._ Necessary but insufficient — you also need an
  anchor for playback state.

**Consequences.** One message per state change instead of one per second. Sync is
a measured number the UI can display honestly. The client carries ~40 lines of
clock logic, which is the real cost.

---

## 006 — Custom player, because the video is synthetic

**Context.** There is no licensed stream. Buttons that do nothing are worse than
no buttons.

**Decision.** Build a player over a synthesised timeline with a real clock, real
controls, keyboard shortcuts, progress persistence and party sync. Add a
dismissible "demo print" note explaining exactly that.

**Alternatives considered.**

- _An `<iframe>` of a trailer._ Shows video, but then none of the app's own
  playback features (progress, resume, party sync) can be demonstrated.
- _A `<video>` with a public sample file._ Random content, and the platform is
  supposed to be Bangladeshi film.
- _A disabled play button._ Users click it, nothing happens, and it reads as
  broken.

**Consequences.** Every downstream feature is genuinely exercised. The honest
notice is a stronger signal than fake playback would be.

---

## 007 — Native scroll-snap rails instead of react-slick

**Context.** v1 used `react-slick`, which duplicates slides for infinite looping
(breaking screen-reader order), needs its own CSS overrides, and behaves poorly
with `prefers-reduced-motion`.

**Decision.** Native overflow scrolling with CSS scroll snap, plus arrow buttons
for mouse users.

**Consequences.** Removed a dependency and its stylesheet. Touch and trackpad
feel native. Keyboard users can tab through a row. Arrow-key navigation between
cards is left to the browser, which is the one place this is slightly less
"custom" than a slider library — an acceptable trade.

---

## 008 — URL as the state store for filters

**Context.** Browse filters, search terms and mood selections could live in
component state.

**Decision.** Put them in the query string and use `useSearchParams`.

**Consequences.** Every view is shareable, bookmarkable and back-button friendly —
including a Mood Match shortlist that can be sent to a group chat. Cost: a
`useEffect` that keeps the input in step with the URL, which needs care to avoid
a write loop.

---

## 009 — localStorage before login

**Context.** Requiring an account before a user can save a title is a conversion
mistake and a demo obstacle.

**Decision.** Watchlist, progress and ratings persist locally with no account.
Auth adds a session; it is not a gate.

**Consequences.** A reviewer can exercise the full product in ten seconds. Local
data is per-device, which the UI states where it matters ("Stored on this
device"). Syncing it to Firebase is deliberately left out — it would need rules,
conflict resolution and a failure mode for no portfolio gain.

---

## 010 — No TypeScript, but JSDoc types

**Context.** TypeScript would be the default choice for a new project of this
size.

**Decision.** Stay on JSX and annotate with JSDoc so types appear in the editor
(`jsconfig.json` has `checkJs` ready) without a build step or a migration.

**Alternatives considered.**

- _Migrate to TS._ Two days of churn for a portfolio whose reviewer will read the
  React and the API much more than the types.
- _No types at all._ JSDoc costs nothing and documents every public function.

**Consequences.** Types are advisory rather than enforced. The comments on tricky
functions (party sync, mood scoring, sanitizers) are arguably more valuable than
the types would have been.

---

## 011 — Node's built-in test runner

**Context.** Jest or Vitest are the usual picks.

**Decision.** `node --test`. No configuration, no transform step, no extra
dependency; it runs the server modules directly.

**Consequences.** No JSX component tests. Given that the risky logic lives on the
server (sanitizers, scoring, HTTP contract), that is where the tests were spent.
UI behaviour was verified in a real browser during development.

---

## 012 — Reversals worth recording

Three things were built, tested, and then removed:

1. **A 1.9 MB emoji webfont.** Added because emoji rendered as tofu boxes in
   headless Chromium. Removed when the cost became obvious; the reaction palette
   now uses emoji that exist in every system font, and the UI stays legible
   without any webfont.
2. **A multi-step wizard for Mood Match.** The step state was decorative — users
   pick a mood and want results immediately. The steps became numbered sections
   with everything visible at once, which is faster and one less state machine.
3. **Coloured radial glows behind the app.** They looked fine on an empty page and
   washed out every photograph. Replaced with a single neutral vignette; the
   artwork is the colour.

---

## 014 — An unverified account is not a signed-in account

**Context.** Firebase creates an authenticated session at signup, because the
user must be signed in to request a verification email. The app mapped "a
Firebase user exists" to "signed in", so skipping the inbox gave full access. The
verification email was the only thing that mentioned verification at all.

**Decision.** Derive a third state, `unverified`, and treat it as the opposite of
signed in. A route guard sends those sessions to `/verify`; the navbar replaces
the account menu with a verification prompt; the sign-up screen no longer offers
"start watching" before the address is proven.

**Alternatives considered.**

- _A dismissible banner over a working app._ This is the common compromise and
  it teaches users to ignore banners. It also leaves every page responsible for
  remembering to check.
- _Blocking signup until verification_ (a custom token flow). Requires backend
  work for the same outcome, and Firebase deliberately does not support it.
- _Trusting `emailVerified` only on sensitive pages._ Fine in principle, but this
  app has exactly one privileged surface — the account — so it would be the same
  rule written five times instead of once.

**Consequences.** One derived function decides access, and the rule is testable
without a browser (28 tests). Unverified users get a screen that explains the one
action left, instead of an app that half-works.

---

## 015 — Reauthentication is a UI step, not an error state

**Context.** Firebase requires a recent sign-in for password, email and account
deletion. The lazy implementation calls the operation and surfaces
`auth/requires-recent-login` as a mystery error.

**Decision.** Ask for the current password _before_ the operation, reauthenticate
explicitly, then perform it. Each destructive action lives in its own card with
its consequence written out, and deletion also requires typing `DELETE`.

**Consequences.** One extra field on three forms, and no dead ends. The trade-off
is that a user with a password manager has to paste one more time — worth it for
an operation that cannot be undone.

---

## 016 — Preferences are applied, or they are labelled

**Context.** Settings pages commonly accumulate switches that store a boolean and
change nothing. The first draft of this one had a notifications section with no
delivery mechanism whatsoever.

**Decision.** Every switch is wired to the thing it claims to control (volume
seeds the player, motion and contrast set `data-*` attributes on `<html>`, poster
density has a CSS rule). The two notification switches are stored — the data is
real and exportable — and labelled `Saved now · sends once email delivery
exists`, rather than showing a fake "saved" toast for an email that will never
arrive.

**Consequences.** The honest label costs a fraction of a feature and buys the
credibility of everything else on the page.

---

## 017 — Documentation as a deliverable

**Context.** READMEs for portfolio projects are usually a stack list and a
screenshot.

**Decision.** Treat the docs as part of the product: architecture, API contract,
security notes and this log. Explain trade-offs and limitations rather than
listing features.

**Why.** A reviewer forms an opinion in about ninety seconds. Being able to say
"here is why the token moved server-side, and here is what is still weak" is worth
more than any badge row. Stating limits — in-memory rate limits, no video,
single-instance rooms — reads as judgement, not as an omission.
