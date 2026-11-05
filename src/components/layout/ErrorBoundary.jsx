/**
 * @file ErrorBoundary.jsx
 * @description Catches render-time crashes so a single bad title payload cannot
 * turn the whole app into a blank page.
 *
 * In development it shows the stack (that is useful). In production it shows a
 * calm message plus a reload action, and logs to the console with a stable code so
 * a bug report can be matched to a build.
 */

import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { error: null, info: null };

  /** @param {Error} error @param {React.ErrorInfo} info */
  static getDerivedStateFromError(error, info) {
    return { error, info };
  }

  /** @param {Error} error @param {React.ErrorInfo} info */
  componentDidCatch(error, info) {
    // A real app would POST this to an error tracker. A console line with the
    // component stack is enough for a demo, and it never sends data anywhere.
    console.error("[bd-screens] render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="eyebrow text-signal">Something broke</p>
        <h1 className="mt-2 font-display text-[34px] leading-tight">
          This screen hit an error
        </h1>
        <p className="mt-3 max-w-md text-sm text-mist-400">
          The rest of the app is fine — reload to get back to where you were.
        </p>

        {isDev && (
          <pre className="mt-6 max-h-56 w-full max-w-lg overflow-auto rounded-lg border border-white/10 bg-ink-900 p-4 text-left text-[11px] leading-relaxed text-signal-soft">
            {String(this.state.error?.stack ?? this.state.error)}
          </pre>
        )}

        <div className="mt-7 flex gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <a href="/" className="btn btn-ghost">
            Go home
          </a>
        </div>
      </div>
    );
  }
}
