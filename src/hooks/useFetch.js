/**
 * @file useFetch.js
 * @description Data fetching for the app, without a data-fetching library.
 *
 * Two hooks, both ~40 lines:
 *   useFetch  — run a request whenever the key changes, expose {data, error, loading, reload}
 *   useAsync  — same for imperative actions (search debounce, "load more")
 *
 * Why not TanStack Query? It would be a fine choice; this app has a handful of
 * requests with simple caching needs that the server already handles (see
 * server/lib/tmdb.js memoization). One fewer dependency, and every line is
 * something the author can explain.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api.js";

/**
 * @template T
 * @param {(signal: AbortSignal) => Promise<{ data: T }>} loader
 * @param {unknown[]} deps
 * @param {{ enabled?: boolean }} [options]
 */
export function useFetch(loader, deps, options = {}) {
  const { enabled = true } = options;

  const [state, setState] = useState({
    /** @type {T | null} */ data: null,
    /** @type {ApiError | null} */ error: null,
    loading: enabled,
  });
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }

    const controller = new AbortController();
    let active = true;

    setState((current) => ({ ...current, loading: true, error: null }));

    loaderRef
      .current(controller.signal)
      .then((payload) => {
        if (!active) return;
        setState({
          data: /** @type {any} */ (payload)?.data ?? null,
          error: null,
          loading: false,
        });
      })
      .catch((error) => {
        if (!active) return;
        // `aborted` is expected when deps change; do not surface it as an error.
        if (error instanceof ApiError && error.code === "aborted") return;
        setState({ data: null, error, loading: false });
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { ...state, reload };
}

/**
 * @template T
 * @param {(...args: any[]) => Promise<T>} action
 * @returns {[T | null, boolean, ApiError | null, (...args: any[]) => Promise<void>]}
 */
export function useAsync(action) {
  const [result, setResult] = useState(/** @type {T | null} */ (null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(/** @type {ApiError | null} */ (null));
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const value = await action(...args);
        if (mounted.current) setResult(value);
      } catch (caught) {
        if (mounted.current) setError(/** @type {ApiError} */ (caught));
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [action],
  );

  return [result, loading, error, run];
}

/**
 * Debounce any changing value.
 * @template T
 * @param {T} value
 * @param {number} delay
 * @returns {T}
 */
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Observe whether an element is in the viewport exactly once.
 * Used by the rails to start loading images only when a row is approached.
 * @param {{ rootMargin?: string, once?: boolean }} [options]
 */
export function useInView(options = {}) {
  const { rootMargin = "200px", once = true } = options;
  const ref = useRef(/** @type {Element | null} */ (null));
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    // Older browsers (and some webviews) have no IntersectionObserver — show content.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, once]);

  return [ref, inView];
}

/**
 * Track a media query.
 * @param {string} query
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (/** @type {MediaQueryListEvent} */ event) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
