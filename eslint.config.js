/**
 * Flat ESLint config for a project with two runtimes in one repo:
 *   - `src/**`    browser code (JSX, React 19, DOM globals)
 *   - `server/**` Node code  (ESM, Node globals, no JSX)
 *
 * Rules are chosen for signal, not ceremony. The ones enabled below have all
 * caught real bugs in this codebase or prevent a class of them:
 *   react-hooks/exhaustive-deps  → stale closures in effects
 *   no-unused-vars (warn)        → dead imports after refactors
 *   eqeqeq                       → the `==` that turns null into undefined
 *   no-console (server only)     → forces use of the structured logger
 */

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "node_modules", "coverage", "public/**"] },

  /* ---------------------------------------------------------------- client */
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: {
      // Automatic JSX runtime (React 19): no `import React` required.
      react: { version: "19.0", jsxRuntime: "automatic" },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      /*
       * Context modules export `useX()` next to their provider on purpose: it is
       * one import for the consumer and the co-location is the point. Fast
       * Refresh simply does a full reload for those files, which is fine.
       */
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      /*
       * `react/jsx-uses-vars` is what teaches the unused-vars rule that
       * `<Icon />` counts as using `Icon`. Without it, every component imported
       * for JSX is reported as dead code — 270 false warnings in this repo.
       */
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "off",
      "react/jsx-key": "error",
      "react/no-unknown-property": "error",
      "react/prop-types": "off", // JSDoc types are used instead (see jsconfig.json)
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-var": "error",
      "no-undef": "off",
    },
  },

  {
    files: ["src/lib/*.jsx", "src/components/ui/*.jsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },

  /* ---------------------------------------------------------------- server */
  {
    files: ["server/**/*.js"],
    ignores: ["server/**/*.test.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "error", // use server/lib/logger.js instead
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },

  /* ----------------------------------------------------------------- tests */
  {
    files: ["server/**/*.test.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },

  /* -------------------------------------------------------------- configs */
  {
    files: ["*.config.js", "vite.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
];
