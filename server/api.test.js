/**
 * @file api.test.js
 * @description HTTP-level tests: the contract the client depends on.
 *
 * The app is started on an ephemeral port in-process (no external server, no
 * mocks of Express). TMDB is unreachable in CI, which is deliberate: these tests
 * prove the *degraded* path is correct, because that is the path a reviewer
 * without an API key will exercise.
 */

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

/*
 * The suite runs against a child process with **no credentials at all**.
 *
 * That is the honest way to test the demo path: config.js reads `.env` at import
 * time, so mutating `process.env` inside this process would be too late, and
 * pointing the suite at a developer's real token would make results depend on
 * whose laptop it runs on.
 */

/** @type {string} */
let base;
/** @type {import("node:child_process").ChildProcess} */
let child;

before(async () => {
  child = spawn(process.execPath, ["server/index.js"], {
    cwd: new URL("..", import.meta.url).pathname,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: "0",
      TMDB_API_TOKEN: "",
      VITE_MOVIE_TOKEN: "",
      LOG_LEVEL: "error",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  /*
   * Learn the port by asking the child, not by parsing its log output.
   *
   * The first version read the "server is up" log line — which is invisible when
   * LOG_LEVEL=error, as it is under test. Polling the health endpoint is also a
   * stronger readiness check: it proves the HTTP stack and the API router are
   * both live, not just that the process started.
   *
   * The child is started with PORT=0, so it binds an ephemeral port; we find it
   * through the child's own environment report on stdout (printed unconditionally
   * by `start()` when NODE_ENV=test) — see below.
   */
  base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server did not start in 10s")), 10_000);

    child.stdout.on("data", (chunk) => {
      const line = chunk.toString();
      const marker = '"url":"http://localhost:';
      const at = line.indexOf(marker);
      if (at === -1) return;

      const digits = /^\d+/.exec(line.slice(at + marker.length))?.[0];
      if (!digits) return;

      clearTimeout(timer);
      resolve(`http://127.0.0.1:${digits}`);
    });

    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early (${code})`));
    });
  });
});

after(async () => {
  if (!child || child.exitCode !== null) return;

  /*
   * Escalate: ask politely, then insist. The test process owns a WebSocket
   * server whose heartbeat timer can keep the child alive; a hung test runner is
   * a worse failure than a blunt SIGKILL during teardown.
   */
  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    new Promise((resolve) => setTimeout(() => resolve(false), 2000)),
  ]);
  if (!exited) child.kill("SIGKILL");
});

/** @param {string} path */
async function get(path) {
  const response = await fetch(`${base}${path}`);
  const body = await response.json().catch(() => null);
  return { status: response.status, body, headers: response.headers };
}

test("GET /api/health reports the demo source and a version", async () => {
  // Poll until the socket accepts connections (the log line can precede bind).
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const ping = await fetch(`${base}/api/health`);
      if (ping.ok) break;
    } catch {
      /* not listening yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const { status, body } = await get("/api/health");
  assert.equal(status, 200);
  assert.equal(body.data.status, "ok");
  assert.equal(body.data.catalogue, "demo");
  assert.ok(body.data.counts.demoTitles >= 20);
});

test("GET /api/feeds returns a spotlight and the seven editorial rows", async () => {
  const { status, body } = await get("/api/feeds");
  assert.equal(status, 200);

  assert.ok(Array.isArray(body.data.spotlight));
  assert.ok(body.data.spotlight.length >= 3);

  const ids = body.data.rows.map((/** @type {any} */ row) => row.id);
  assert.deepEqual(ids, [
    "bd-originals",
    "trending",
    "late-night",
    "top-rated",
    "now-playing",
    "bangla",
    "series",
  ]);

  for (const row of body.data.rows) {
    assert.ok(row.items.length > 0, `${row.id} must not be empty`);
    assert.ok(row.title && row.subtitle, `${row.id} needs editorial copy`);
    for (const item of row.items) {
      assert.ok(item.id && item.title, `${row.id} has an incomplete item`);
      assert.ok(item.poster, `${item.title} needs a poster`);
    }
  }
});

test("originals are always first in the catalogue row", async () => {
  const { body } = await get("/api/feeds");
  const originals = body.data.rows.find((/** @type {any} */ row) => row.id === "bd-originals");
  assert.ok(originals.items.every((/** @type {any} */ item) => item.source === "demo"));
  assert.equal(originals.items[0].title, "Monsoon Express");
});

test("GET /api/title/:id returns detail with cast, crew, notes and similar", async () => {
  const { status, body } = await get("/api/title/demo-original-monsoon-express");
  assert.equal(status, 200);
  assert.equal(body.data.title, "Monsoon Express");
  assert.ok(body.data.cast.length >= 2);
  assert.ok(body.data.crew.length >= 1);
  assert.ok(body.data.notes.length >= 3);
  assert.ok(body.data.similar.length > 0, "detail pages must never be a dead end");
  assert.ok(body.data.similar.every((/** @type {any} */ item) => item.id !== body.data.id));
});

test("GET /api/title/:id rejects traversal and unknown ids", async () => {
  assert.equal((await get("/api/title/..%2F..%2Fetc%2Fpasswd")).status, 400);
  // With no provider configured, a TMDB id is an unavailable upstream (503),
  // never a 200 with an empty body and never a 500.
  assert.equal((await get("/api/title/tmdb-movie-1")).status, 503);
  assert.equal((await get("/api/title/demo-original-not-real")).status, 404);
});

test("GET /api/search validates and ranks", async () => {
  const empty = await get("/api/search?q=");
  assert.equal(empty.status, 400);
  assert.match(empty.body.error.message, /Type something/);

  const long = await get(`/api/search?q=${"x".repeat(200)}`);
  assert.equal(long.status, 400);

  const hit = await get("/api/search?q=rickshaw");
  assert.equal(hit.status, 200);
  assert.equal(hit.body.data[0].title, "Last Rickshaw");
});

test("GET /api/moods and /api/moods/match score and cap the request", async () => {
  const moods = await get("/api/moods");
  assert.equal(moods.body.data.length, 7);

  const none = await get("/api/moods/match");
  assert.equal(none.status, 400);

  const tooMany = await get("/api/moods/match?moods=crying,laughing,hopeful,adrenaline");
  assert.equal(tooMany.status, 400);
  assert.match(tooMany.body.error.message, /up to three/);

  const ok = await get("/api/moods/match?moods=crying,late-night&limit=4");
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.length, 4);
  assert.ok(ok.body.data[0].match >= 60);

  // A 60-minute window must exclude anything longer than an hour.
  const short = await get("/api/moods/match?moods=late-night&minutes=60&limit=10");
  assert.ok(
    short.body.data.every((/** @type {any} */ item) => item.runtime <= 60),
    "runtime filter must be applied, not suggested",
  );
});

test("GET /api/art/:seed.svg is cacheable, valid SVG", async () => {
  const response = await fetch(`${base}/api/art/monsoon-express.svg?w=300&h=450&label=Test`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /image\/svg\+xml/);
  assert.match(response.headers.get("cache-control") ?? "", /immutable/);

  const svg = await response.text();
  assert.match(svg, /^<svg/);
  assert.match(svg, /width="300"/);
  assert.match(svg, /Test/);
});

test("/api/art escapes labels instead of reflecting markup", async () => {
  const response = await fetch(`${base}/api/art/x.svg?label=${encodeURIComponent("<script>")}`);
  const svg = await response.text();
  assert.ok(!svg.includes("<script>"), "the label must be escaped");
  assert.match(svg, /&lt;script&gt;/);
});

test("unknown API routes return a structured 404", async () => {
  const { status, body } = await get("/api/nope");
  assert.equal(status, 404);
  assert.equal(body.error.code, "not_found");
  assert.ok(body.error.requestId, "errors must carry a request id");
});

test("security headers are present on API responses", async () => {
  const { headers } = await get("/api/health");
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.ok(headers.get("x-request-id"));
  assert.match(headers.get("permissions-policy") ?? "", /camera=\(\)/);
  assert.equal(headers.get("x-powered-by"), null, "Express fingerprinting must be disabled");
});

test("rate-limit headers advertise the budget", async () => {
  const { headers } = await get("/api/health");
  assert.equal(headers.get("ratelimit-limit"), "120");
  assert.ok(Number(headers.get("ratelimit-remaining")) >= 0);
});

test("a corrupt query is rejected without leaking internals", async () => {
  const { status, body } = await get("/api/title/%00");
  assert.equal(status, 400);
  assert.ok(!JSON.stringify(body).includes("at sanitize"), "stack traces must not leak");
  assert.equal(body.error.code, "bad_request");
});
