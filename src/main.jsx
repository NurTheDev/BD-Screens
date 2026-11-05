/**
 * @file main.jsx
 * @description Client entry point.
 *
 * Provider order matters:
 *   Toast  → nothing depends on it, everything can use it
 *   Auth   → needs toasts for session errors
 *   Library→ independent, but reads storage on mount
 *   Party  → independent, connects lazily
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "./lib/auth.jsx";
import { LibraryProvider } from "./lib/library.jsx";
import { WatchPartyProvider } from "./lib/watchParty.jsx";
import { ToastProvider } from "./components/ui/Toast.jsx";
import { ErrorBoundary } from "./components/layout/ErrorBoundary.jsx";
import "./styles/index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing from index.html");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <LibraryProvider>
              <WatchPartyProvider>
                <App />
              </WatchPartyProvider>
            </LibraryProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
