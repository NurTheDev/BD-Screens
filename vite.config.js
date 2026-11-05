import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Dev servers for this project run in two processes:
 *   - Vite (this config) on :5173  → serves the client with HMR
 *   - The API on :8787            → see server/index.js
 *
 * The proxy below keeps the browser talking to a single origin, which means:
 *   - no CORS during development,
 *   - the client can use relative URLs like `/api/feeds` everywhere,
 *   - nothing in the bundle has to know about ports.
 *
 * Assets (posters, plates) are served by Vite from /public in dev and by Express
 * in production, so `/art/*.jpg` works identically in both.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    host: "0.0.0.0",
    port: 5173,
    // The sandbox preview host is a different origin; accept it in dev.
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://127.0.0.1:8787",
        changeOrigin: false,
      },
      "/ws": {
        target: process.env.API_PROXY_TARGET || "http://127.0.0.1:8787",
        ws: true,
        changeOrigin: false,
      },
    },
  },

  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
  },

  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split the two biggest, least-changing chunks so returning visitors
        // re-download less after a deploy.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/database"],
        },
      },
    },
  },
});
