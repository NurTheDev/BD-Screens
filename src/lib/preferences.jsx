/**
 * @file preferences.jsx
 * @description Viewer preferences: how the app behaves, not who is using it.
 *
 * Kept separate from `library.jsx` (what you watched) and `auth.jsx` (who you
 * are) because the lifetime is different: preferences should survive sign-out,
 * a cleared watchlist, and a different account on the same browser.
 *
 * Two rules that keep this honest:
 *  - every preference is applied where it is *used*; nothing is stored and then
 *    ignored, because a toggle that does nothing is a lie,
 *  - the OS preference wins when the user has not chosen. `reducedMotion: null`
 *    means "follow the system", which is different from `false`.
 *
 * Preferences that must affect CSS *before* React mounts (reduced motion,
 * contrast) are also mirrored onto `<html data-*>` attributes by `applyToDocument`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { KEYS, readJSON, writeJSON } from "./storage.js";
// Re-exported so consumers (and the settings UI) keep one obvious import path.
export { DEFAULT_PREFERENCES, normalisePreferences } from "./preferences-model.js";
import { DEFAULT_PREFERENCES, normalisePreferences } from "./preferences-model.js";

/** @type {import("react").Context<any>} */
const PreferencesContext = createContext(null);

/**
 * Mirror the preferences that CSS needs onto the document element.
 *
 * These cannot be applied with a class on a React root, because two of them
 * (`motion`, `contrast`) must affect elements outside any component tree and be
 * readable by plain CSS. `data-*` on `<html>` is the smallest mechanism that
 * works for both.
 * @param {import("./preferences-model.js").Preferences} preferences
 */
function applyToDocument(
  /** @type {import("./preferences-model.js").Preferences} */ preferences,
) {
  const root = document.documentElement;
  const systemReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // `null` = follow the system, so the attribute is only set when the user has
  // expressed an opinion. This keeps the CSS media query as the default path.
  if (preferences.reduceMotion === null) delete root.dataset.reduceMotion;
  else root.dataset.reduceMotion = String(preferences.reduceMotion);

  if (preferences.highContrast) root.dataset.contrast = "high";
  else delete root.dataset.contrast;

  if (preferences.posterQuality === "cosy") root.dataset.posters = "cosy";
  else delete root.dataset.posters;

  root.dataset.systemReducedMotion = String(Boolean(systemReduced));
}

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() =>
    normalisePreferences(readJSON(KEYS.preferences, DEFAULT_PREFERENCES)),
  );

  useEffect(() => {
    writeJSON(KEYS.preferences, preferences);
    applyToDocument(preferences);
  }, [preferences]);

  /* Keep following the OS if the user has not chosen, even if the OS changes. */
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const onChange = () => applyToDocument(preferences);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preferences]);

  const setPreference = useCallback((/** @type {keyof Preferences} */ key, value) => {
    setPreferences((current) => normalisePreferences({ ...current, [key]: value }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences({ ...DEFAULT_PREFERENCES });
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      setPreference,
      resetPreferences,
      /** Is motion currently reduced, by choice or by system? */
      motionReduced:
        preferences.reduceMotion === null
          ? Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
          : preferences.reduceMotion,
    }),
    [preferences, setPreference, resetPreferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return context;
}
