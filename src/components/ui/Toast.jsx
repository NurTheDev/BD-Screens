/**
 * @file Toast.jsx
 * @description Lightweight toast system (replaces react-toastify).
 *
 * Why replace it: react-toastify pulls in its own CSS, animation library and
 * ARIA live-region management for what is, in this app, three message types.
 * This version is ~90 lines, uses one polite live region (so screen readers are
 * told once, not per toast), and inherits the design tokens.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Check, Info, Warning, Close } from "./Icons.jsx";

const ToastContext = createContext(/** @type {any} */ (null));

let counter = 0;

const TONE = {
  success: { icon: Check, color: "var(--color-mint)" },
  error: { icon: Warning, color: "var(--color-signal)" },
  info: { icon: Info, color: "var(--color-amber)" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState(
    /** @type {Array<{id: number, message: string, tone: keyof typeof TONE}>} */ ([]),
  );

  const dismiss = useCallback((/** @type {number} */ id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (/** @type {string} */ message, /** @type {keyof typeof TONE} */ tone = "info") => {
      counter += 1;
      const id = counter;
      // Cap the stack: five simultaneous toasts is already too many.
      setToasts((current) => [...current.slice(-4), { id, message, tone }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6500 : 4200);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast: {
        success: (/** @type {string} */ message) => push(message, "success"),
        error: (/** @type {string} */ message) => push(message, "error"),
        info: (/** @type {string} */ message) => push(message, "info"),
      },
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const tone = TONE[toast.tone];
          const IconGlyph = tone.icon;
          return (
            <div
              key={toast.id}
              className="flex w-full max-w-sm items-start gap-3 rounded-xl border border-white/10 bg-ink-800/95 px-4 py-3 text-sm shadow-lift backdrop-blur"
              style={{ animation: "riseIn .22s ease-out both" }}
            >
              <span style={{ color: tone.color }} className="mt-0.5 shrink-0">
                <IconGlyph size={17} />
              </span>
              <p className="flex-1 leading-snug text-mist-100">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-mr-1 rounded p-1 text-mist-500 transition hover:text-mist-100"
                aria-label="Dismiss notification"
              >
                <Close size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context.toast;
}
