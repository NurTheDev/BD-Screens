/**
 * @file Player.jsx
 * @description The theatre player.
 *
 * Reality: BD Screens has no licensed stream, so there is no <video> source.
 * Rather than fake a black rectangle with a spinner (which every reviewer has
 * seen before), this player synthesises a **timeline** for the title — a real
 * clock, real controls, real keyboard shortcuts, and a "this is a demo print"
 * notice. Everything else in the app that depends on playback (progress saving,
 * Continue Watching, watch-party sync) works against that timeline, so those
 * features are genuinely demonstrated rather than mocked.
 *
 * Keyboard support (the reason the controls are custom rather than native):
 *   Space / K  play-pause        ← / →   ±10s
 *   J / L      ±10s              M       mute
 *   F          fullscreen        Esc     exit fullscreen
 *   ↑ / ↓      volume
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePreferences } from "../../lib/preferences.jsx";
import { Link } from "react-router-dom";
import { ArrowLeft, Expand, Muted, Pause, Play, Volume, Warning } from "../ui/Icons.jsx";

/** @param {number} totalSeconds */
function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * @param {{
 *   title: any,
 *   onProgress?: (state: { seconds: number, duration: number }) => void,
 *   externalPosition?: number | null,
 *   onLocalSeek?: (seconds: number) => void,
 *   onLocalPlayStateChange?: (playing: boolean, seconds: number) => void,
 *   locked?: boolean,
 * }} props
 */
export function Player({
  title,
  onProgress,
  externalPosition = null,
  onLocalSeek,
  onLocalPlayStateChange,
  locked = false,
}) {
  const duration = (title?.runtime ?? 110) * 60;
  const { preferences } = usePreferences();

  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  // Seeded from the viewer's saved preference rather than a hard-coded 0.8, so
  // the Settings slider changes something the next time a title opens.
  const [volume, setVolume] = useState(preferences.defaultVolume);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [notice, setNotice] = useState(true);

  const shellRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const hideTimer = useRef(/** @type {any} */ (null));
  const lastReport = useRef(0);

  /* ------------------------------------------------- Timeline clock */
  useEffect(() => {
    if (!playing) return undefined;

    const started = performance.now();
    const base = seconds;
    let frame = 0;

    const tick = () => {
      const elapsed = (performance.now() - started) / 1000;
      const next = base + elapsed;

      if (next >= duration) {
        setSeconds(duration);
        setPlaying(false);
        return;
      }
      setSeconds(next);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration]);

  /* Report progress at most every 5s (and let the caller persist on unmount). */
  useEffect(() => {
    if (!onProgress || duration <= 0) return;
    const now = Date.now();
    if (now - lastReport.current < 5000) return;
    lastReport.current = now;
    onProgress({ seconds, duration });
  }, [seconds, duration, onProgress]);

  /* Follow the host in a watch party. */
  useEffect(() => {
    if (externalPosition === null) return;
    setSeconds((current) =>
      Math.abs(current - externalPosition) > 1.2 ? externalPosition : current,
    );
  }, [externalPosition]);

  /* ------------------------------------------------- Controls */
  const toggle = useCallback(() => {
    if (locked) return;
    setPlaying((current) => {
      const next = !current;
      onLocalPlayStateChange?.(next, seconds);
      return next;
    });
  }, [locked, onLocalPlayStateChange, seconds]);

  const seekTo = useCallback(
    (/** @type {number} */ value) => {
      if (locked) return;
      const clamped = Math.min(duration, Math.max(0, value));
      setSeconds(clamped);
      onLocalSeek?.(clamped);
    },
    [duration, locked, onLocalSeek],
  );

  const seekBy = useCallback(
    (/** @type {number} */ delta) => seekTo(seconds + delta),
    [seconds, seekTo],
  );

  const toggleFullscreen = useCallback(() => {
    const element = shellRef.current;
    if (!element) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else element.requestFullscreen?.().catch(() => {});
  }, []);

  /* Keyboard shortcuts (ignored while typing in a field). */
  useEffect(() => {
    const onKey = (/** @type {KeyboardEvent} */ event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      if (["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable) return;

      switch (event.key.toLowerCase()) {
        case " ":
        case "k":
          event.preventDefault();
          toggle();
          break;
        case "arrowright":
        case "l":
          event.preventDefault();
          seekBy(10);
          break;
        case "arrowleft":
        case "j":
          event.preventDefault();
          seekBy(-10);
          break;
        case "arrowup":
          event.preventDefault();
          setVolume((value) => Math.min(1, value + 0.1));
          setMuted(false);
          break;
        case "arrowdown":
          event.preventDefault();
          setVolume((value) => Math.max(0, value - 0.1));
          break;
        case "m":
          setMuted((value) => !value);
          break;
        case "f":
          toggleFullscreen();
          break;
        default:
          break;
      }
      setChromeVisible(true);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, seekBy, toggleFullscreen]);

  /* Auto-hide the chrome while playing. */
  const bumpChrome = () => {
    setChromeVisible(true);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setChromeVisible(false), 2600);
    }
  };

  useEffect(() => {
    if (!playing) {
      clearTimeout(hideTimer.current);
      setChromeVisible(true);
    }
  }, [playing]);

  const progressPercent = duration > 0 ? (seconds / duration) * 100 : 0;

  return (
    <div
      ref={shellRef}
      className="relative w-full overflow-hidden bg-black"
      onMouseMove={bumpChrome}
      onTouchStart={bumpChrome}
    >
      <div className="relative aspect-video w-full">
        <img
          src={title?.backdrop ?? title?.poster}
          alt=""
          className={`h-full w-full object-cover transition duration-700 ${playing ? "scale-105 opacity-70" : "opacity-95"}`}
        />
        {/* Edges only: the still has to survive being looked at for 90 minutes. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.5)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />

        {/* Centre play affordance */}
        {!playing && (
          <button
            type="button"
            onClick={toggle}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center"
            aria-label={locked ? "Playback is controlled by the host" : "Play"}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition hover:scale-105 hover:bg-white/20 sm:h-20 sm:w-20">
              <Play size={26} />
            </span>
            {locked && (
              <span className="rounded-full bg-ink-950/70 px-3 py-1 text-[11px] text-mist-300 backdrop-blur">
                The host controls playback
              </span>
            )}
          </button>
        )}

        {/* Demo print notice */}
        {notice && (
          <div className="absolute bottom-24 left-3 flex max-w-[min(92%,380px)] items-start gap-2 rounded-lg border border-amber/25 bg-ink-950/85 px-3 py-2 text-[11px] leading-snug text-mist-200 backdrop-blur sm:bottom-28">
            <span className="mt-0.5 shrink-0 text-amber">
              <Warning size={13} />
            </span>
            <p>
              Demo print: this title has no licensed stream, so playback is a synthesised
              timeline. Controls, progress and watch-party sync are real.
            </p>
            <button
              type="button"
              onClick={() => setNotice(false)}
              className="ml-1 shrink-0 text-mist-500 hover:text-white"
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        {/* Top bar */}
        <div
          className={`absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/75 to-transparent p-3 transition-opacity duration-300 sm:p-4 ${
            chromeVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <Link
            to={`/title/${title?.id ?? ""}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-mist-200 backdrop-blur transition hover:text-white"
            aria-label="Back to title"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-mist-100">{title?.title}</p>
            <p className="truncate text-[10.5px] text-mist-400">
              {title?.genres?.[0]} · {title?.year}
            </p>
          </div>
        </div>

        {/* Bottom controls */}
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300 sm:px-5 sm:pb-4 ${
            chromeVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Seek bar */}
          <label className="group flex items-center gap-3">
            <span className="sr-only">Seek</span>
            <input
              type="range"
              min={0}
              max={duration}
              step={1}
              value={Math.floor(seconds)}
              onChange={(event) => seekTo(Number(event.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-signal outline-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-signal"
              style={{
                background: `linear-gradient(90deg, var(--color-signal) ${progressPercent}%, rgba(255,255,255,0.22) ${progressPercent}%)`,
              }}
              aria-valuetext={`${formatTime(seconds)} of ${formatTime(duration)}`}
              disabled={locked}
            />
          </label>

          <div className="mt-2 flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-full text-mist-100 transition hover:bg-white/10"
              aria-label={playing ? "Pause" : "Play"}
              disabled={locked}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button
              type="button"
              onClick={() => seekBy(-10)}
              className="hidden h-9 items-center rounded-full px-2 text-[11px] text-mist-300 transition hover:bg-white/10 hover:text-white sm:flex"
              aria-label="Back 10 seconds"
              disabled={locked}
            >
              −10s
            </button>
            <button
              type="button"
              onClick={() => seekBy(10)}
              className="hidden h-9 items-center rounded-full px-2 text-[11px] text-mist-300 transition hover:bg-white/10 hover:text-white sm:flex"
              aria-label="Forward 10 seconds"
              disabled={locked}
            >
              +10s
            </button>

            <span className="ml-1 text-[11.5px] tabular-nums text-mist-300">
              {formatTime(seconds)}
              <span className="text-mist-600"> / {formatTime(duration)}</span>
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              <div className="hidden items-center gap-1.5 sm:flex">
                <button
                  type="button"
                  onClick={() => setMuted((value) => !value)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-mist-300 transition hover:bg-white/10 hover:text-white"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <Muted size={16} /> : <Volume size={16} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(event) => {
                    setVolume(Number(event.target.value));
                    setMuted(false);
                  }}
                  aria-label="Volume"
                  className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/25 accent-signal [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-mist-100"
                />
                <span className="w-7 text-right text-[10px] tabular-nums text-mist-500">
                  {Math.round((muted ? 0 : volume) * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex h-8 w-8 items-center justify-center rounded-full text-mist-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Toggle fullscreen"
              >
                <Expand size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Shortcut legend — visible only where there is room, never in the way. */}
      <div className="hidden items-center justify-between gap-4 border-t border-white/6 bg-ink-950 px-4 py-2 text-[10.5px] text-mist-600 lg:flex">
        <span>Space play/pause · J/L ±10s · M mute · F fullscreen</span>
        <span>Timeline synthesised from a {title?.runtime ?? 110}-minute runtime</span>
      </div>
    </div>
  );
}
