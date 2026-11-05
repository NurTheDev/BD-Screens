/**
 * @file index.js
 * @description HTTP entry point: wires middleware, API, WebSocket hub and the
 * production static file server, then handles graceful shutdown.
 *
 * Boot order matters and is intentional:
 *   1. hardening headers + request context  (every response, including errors)
 *   2. body parsers with small limits       (nothing here needs a big body)
 *   3. rate limits                          (per route family)
 *   4. API routes                           (JSON in, JSON out)
 *   5. static client + SPA fallback         (production only)
 *   6. 404 + central error handler          (always last)
 */

import http from "node:http";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import compression from "compression";

import { config, validateConfig } from "./config.js";
import { logger } from "./lib/logger.js";
import { PartyHub } from "./lib/party-hub.js";
import { apiRouter } from "./routes/api.js";
import {
  apiNotFound,
  cors,
  errorHandler,
  rateLimit,
  requestContext,
  securityHeaders,
} from "./middleware/security.js";

const log = logger.child({ module: "server" });

const app = express();

// Behind a single reverse proxy (Render/Railway/Nginx) in production.
if (config.trustProxy) app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(requestContext);
app.use(securityHeaders);
app.use(cors);
app.use(compression());

// Body limits: the only POST bodies are Firebase token verifications.
app.use(express.json({ limit: "32kb" }));

/* ------------------------------------------------------------------ *
 * Rate limits
 * ------------------------------------------------------------------ */

// Reads are generous: a home page load is ~7 requests, a fast scroller maybe 30.
app.use("/api", rateLimit({ name: "api", windowMs: 60_000, limit: 120 }));

// Search is the expensive one upstream, and the easiest to abuse.
app.use("/api/search", rateLimit({ name: "search", windowMs: 60_000, limit: 30 }));

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */

app.use("/api", apiRouter);
app.use("/api", apiNotFound);

/* ------------------------------------------------------------------ *
 * Static client (production)
 * ------------------------------------------------------------------ */

const indexHtml = path.join(config.clientDistDir, "index.html");
const hasBuiltClient = existsSync(indexHtml);

if (hasBuiltClient) {
  app.use(
    express.static(config.clientDistDir, {
      index: false,
      maxAge: "1y",
      setHeaders(res, filePath) {
        // Hashed assets are immutable; the HTML shell never is.
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  // SPA fallback. Anything that is not an API call and not a file gets the shell.
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/ws")) return next();
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexHtml);
  });
} else {
  // Helpful in development when the API is started without the Vite server.
  app.get("/", (_req, res) => {
    res
      .status(200)
      .type("text/plain")
      .send(
        [
          "BD Screens API is running.",
          "",
          "The client is built with `npm run dev` (Vite) or `npm run build && npm start`.",
          "Health check: /api/health",
        ].join("\n"),
      );
  });
}

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

app.use(errorHandler);

/* ------------------------------------------------------------------ *
 * Server + WebSocket hub
 * ------------------------------------------------------------------ */

const server = http.createServer(app);
const partyHub = new PartyHub(server);

// The API router needs to know which party codes exist without importing the hub
// (that would be circular). express app.locals is the seam.
app.set("partyRegistry", partyHub);

/**
 * Start listening. Exported so tests can boot the app on an ephemeral port.
 * @param {number} [port]
 */
export function start(port = config.port) {
  return new Promise((resolve) => {
    server.listen(port, "0.0.0.0", () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;

      const warnings = validateConfig();

      /*
       * Printed with a direct write, not through the logger: integration tests
       * start this process with LOG_LEVEL=error, and they still need to know
       * which ephemeral port was bound. One line, no secrets.
       */
      if (process.env.NODE_ENV === "test") {
        process.stdout.write(
          `${JSON.stringify({ ready: true, url: `http://localhost:${actualPort}` })}\n`,
        );
      }

      log.info("BD Screens is up", {
        url: `http://localhost:${actualPort}`,
        env: config.isProduction ? "production" : "development",
        catalogue: config.tmdbToken ? "tmdb + demo" : "demo only",
        clientServed: hasBuiltClient,
      });
      for (const warning of warnings) log.warn(warning);

      resolve({ server, app, port: actualPort });
    });
  });
}

/**
 * Close everything cleanly.
 *
 * `server.close()` only stops accepting new connections; it waits for keep-alive
 * sockets to drain, which never happens for an idle WebSocket. Closing the hub
 * first, then forcing the remaining HTTP sockets shut, is what makes shutdown
 * deterministic (and what stopped the integration suite from hanging).
 *
 * @param {string} [signal]
 */
export async function stop(signal = "SIGTERM") {
  log.info("shutting down", { signal });
  await partyHub.close();

  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections?.();
    // Belt and braces for Node versions without closeAllConnections.
    setTimeout(resolve, 3000).unref?.();
  });
}

/*
 * Run only when invoked directly (`node server/index.js`), not when imported by
 * tests. `fileURLToPath` is used instead of string surgery on `import.meta.url`
 * so the check also works on Windows paths and with spaces in the directory.
 */
const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  start();

  for (const signal of /** @type {const} */ (["SIGINT", "SIGTERM"])) {
    process.on(signal, () => {
      stop(signal).finally(() => process.exit(0));
    });
  }

  process.on("unhandledRejection", (reason) => {
    log.error("unhandled promise rejection", { reason: String(reason) });
  });
}

export { app, server, partyHub };
