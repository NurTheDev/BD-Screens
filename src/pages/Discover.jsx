/**
 * @file Discover.jsx
 * @description "Mood Match": a three-question guided flow that produces a shortlist.
 *
 * The idea
 * --------
 * People do not search for "a 2019 Bangladeshi drama"; they search for *a feeling*
 * and *an amount of time*. Streaming apps usually answer with an infinite grid.
 * This flow answers with a ranked shortlist (up to six), each entry carrying a
 * reason and a confidence figure; the top four are also shown as large posters.
 *
 * How it is honest
 * ----------------
 * There is no machine learning here, and the UI says so. Scoring is a transparent
 * weighted match over mood tags and genre affinity, implemented server-side in
 * server/data/catalogue.js (matchMoods). The "why this" line is the actual reason
 * the title scored, which is more useful than a fake "97% match".
 *
 * State lives in the URL (`?moods=crying,late-night&minutes=120`), so a shortlist
 * can be shared with the group chat before anyone starts watching.
 */

import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useFetch } from "../hooks/useFetch.js";
import { useLibrary } from "../lib/library.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { Poster } from "../components/ui/Poster.jsx";
import {
  ArrowRight,
  Check,
  Clock,
  Refresh,
  Sparkles,
  Star,
  Users,
  Warning,
} from "../components/ui/Icons.jsx";

const MOODS = [
  { id: "slow-burn", label: "Slow burn", blurb: "Let it unfold. No rush.", accent: "#7aa2ff" },
  {
    id: "adrenaline",
    label: "Adrenaline",
    blurb: "Always about to happen.",
    accent: "#ff6b57",
  },
  { id: "crying", label: "Need a good cry", blurb: "Tissues, not answers.", accent: "#e6739f" },
  { id: "laughing", label: "Make me laugh", blurb: "Light, sharp, warm.", accent: "#f0a93b" },
  {
    id: "with-family",
    label: "With family",
    blurb: "Everyone, one screen.",
    accent: "#3ddc97",
  },
  { id: "late-night", label: "Late night", blurb: "2am. Headphones.", accent: "#9b7ede" },
  { id: "hopeful", label: "Hopeful", blurb: "Things can turn out fine.", accent: "#4ea8de" },
];

const TIME_OPTIONS = [
  { minutes: 0, label: "Any length" },
  { minutes: 60, label: "Under 1 hour" },
  { minutes: 100, label: "About 100 min" },
  { minutes: 140, label: "A long one" },
];

const REASON_COPY = {
  "slow-burn": "a slow burn, paced for patience",
  adrenaline: "built for adrenaline",
  crying: "one to cry to",
  laughing: "a comedy that actually lands",
  "with-family": "safe for the whole room",
  "late-night": "made for a late night",
  hopeful: "ends on something hopeful",
};

export default function Discover() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { inWatchlist, toggleWatchlist, stats } = useLibrary();

  const selected = useMemo(
    () => (params.get("moods") ?? "").split(",").filter(Boolean),
    [params],
  );
  const minutes = Number(params.get("minutes") ?? 0);

  const [saving, setSaving] = useState(false);

  const moodKey = selected.join(",");

  const {
    data: results,
    loading,
    error,
    reload,
  } = useFetch(
    useCallback(
      (signal) =>
        selected.length === 0
          ? Promise.resolve({ data: null })
          : api.matchMoods(selected, { minutes, limit: 8 }, signal),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [moodKey, minutes],
    ),
    [moodKey, minutes],
    { enabled: selected.length > 0 },
  );

  /** @param {string} moodId */
  const toggleMood = (moodId) => {
    const next = selected.includes(moodId)
      ? selected.filter((value) => value !== moodId)
      : [...selected, moodId].slice(0, 3);

    const search = new URLSearchParams(params);
    if (next.length) search.set("moods", next.join(","));
    else search.delete("moods");
    setParams(search, { replace: true });
  };

  const setMinutes = (/** @type {number} */ value) => {
    const search = new URLSearchParams(params);
    if (value > 0) search.set("minutes", String(value));
    else search.delete("minutes");
    setParams(search, { replace: true });
  };

  const reset = () => setParams(new URLSearchParams(), { replace: true });

  /* Save the shortlist as a note in the watchlist, so it survives the session. */
  const saveShortlist = () => {
    if (!results?.length) return;
    setSaving(true);
    let added = 0;
    for (const item of results.slice(0, 4)) {
      if (!inWatchlist(item.id)) {
        toggleWatchlist(item);
        added += 1;
      }
    }
    setSaving(false);
    toast.success(
      added === 0
        ? "All four are already in your watchlist"
        : `Saved ${added} to your watchlist`,
    );
  };

  return (
    <div className="pt-24 pb-16 sm:pt-28">
      {/* ------------------------------------------------------------ Intro */}
      <header className="gutter max-w-3xl">
        <p className="eyebrow flex items-center gap-1.5">
          <Sparkles size={12} /> Mood match
        </p>
        <h1 className="display mt-2 text-[clamp(2.3rem,5.4vw,4rem)] leading-[0.98]">
          Tell us how tonight feels.
        </h1>
        <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-mist-400">
          Pick up to three moods and, if it matters, how much time you have. You will get a
          ranked shortlist, a reason for every title, and four picks shown large — not a wall of
          posters.
        </p>
      </header>

      {/* ------------------------------------------------------------- Steps */}
      <div className="shell mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {/* Step 1 */}
          <section aria-labelledby="step-mood">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-signal">01</span>
              <h2 id="step-mood" className="text-[15px] font-semibold">
                Choose your mood
              </h2>
              <span className="text-[11px] text-mist-600">{selected.length}/3 selected</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {MOODS.map((mood) => {
                const active = selected.includes(mood.id);
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => toggleMood(mood.id)}
                    aria-pressed={active}
                    className={`group relative overflow-hidden rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-white/70 bg-white/10"
                        : "border-white/8 hover:border-white/25 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className="absolute -right-5 -top-6 h-14 w-14 rounded-full opacity-20 blur-xl transition group-hover:opacity-35"
                      style={{ background: mood.accent }}
                    />
                    <span className="flex items-center justify-between">
                      <span
                        className="h-1 w-5 rounded-full"
                        style={{ background: mood.accent }}
                      />
                      {active && (
                        <span className="text-mint">
                          <Check size={13} />
                        </span>
                      )}
                    </span>
                    <span className="mt-2 block text-[12.5px] font-medium leading-tight text-mist-100">
                      {mood.label}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] leading-snug text-mist-500">
                      {mood.blurb}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2 */}
          <section className="mt-7" aria-labelledby="step-time">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-signal">02</span>
              <h2 id="step-time" className="text-[15px] font-semibold">
                How much time do you have?
              </h2>
              <span className="text-[11px] text-mist-600">optional</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {TIME_OPTIONS.map((option) => (
                <button
                  key={option.minutes}
                  type="button"
                  onClick={() => setMinutes(option.minutes)}
                  data-active={minutes === option.minutes}
                  className="chip h-9 px-3.5"
                >
                  <Clock size={12} />
                  {option.label}
                </button>
              ))}
            </div>

            <p className="mt-2 text-[11px] text-mist-600">
              Runtime is a hard filter, not a hint — nothing longer than your window will
              appear.
            </p>
          </section>

          {/* How it works — transparency instead of buzzwords */}
          <details className="mt-7 rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <summary className="cursor-pointer text-[12.5px] font-medium text-mist-200">
              How the matching actually works
            </summary>
            <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-mist-400">
              <p>
                Every title carries mood tags and genres. Your selection is scored as
                <span className="text-mist-100"> 10 points per matching mood tag</span>, plus
                <span className="text-mist-100"> 2 points per genre</span> that is normally
                associated with that mood, plus a small quality nudge so the list does not open
                with a 6.9.
              </p>
              <p>
                The percentage on each card is that score normalised against the best result — a
                relative figure, not a promise. The reason line under each title is the tag that
                fired.
              </p>
              <p className="text-mist-500">
                No machine learning, no tracking. The scoring function is ~25 lines in
                <code className="mx-1 rounded bg-white/8 px-1 py-0.5 text-[11px]">
                  server/data/catalogue.js
                </code>
                and it is covered by a unit test.
              </p>
            </div>
          </details>
        </div>

        {/* ---------------------------------------------------------- Results */}
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-live="polite">
          <div className="panel-raised overflow-hidden">
            <div className="border-b border-white/8 p-4">
              <p className="eyebrow flex items-center gap-1.5">
                <Sparkles size={11} /> Your shortlist
              </p>

              {selected.length === 0 ? (
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-mist-400">
                  Pick a mood to see titles appear here.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.map((moodId) => {
                    const mood = MOODS.find((item) => item.id === moodId);
                    return (
                      <button
                        key={moodId}
                        type="button"
                        onClick={() => toggleMood(moodId)}
                        className="chip h-6 px-2 text-[10.5px]"
                        title="Remove"
                      >
                        {mood?.label ?? moodId}
                        <span className="text-mist-500">×</span>
                      </button>
                    );
                  })}
                  {minutes > 0 && (
                    <span className="chip h-6 px-2 text-[10.5px]">
                      <Clock size={10} /> ≤ {minutes} min
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-3">
              {error && (
                <div className="rounded-lg border border-signal/25 bg-signal/5 p-3">
                  <p className="flex items-start gap-1.5 text-[11.5px] text-signal-soft">
                    <Warning size={13} className="mt-0.5 shrink-0" />
                    {error.message}
                  </p>
                  <button
                    type="button"
                    onClick={reload}
                    className="btn btn-quiet mt-1 text-[11px]"
                  >
                    <Refresh size={12} /> Retry
                  </button>
                </div>
              )}

              {loading && selected.length > 0 && (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="skeleton h-[72px] w-12 rounded" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="skeleton h-3 w-2/3" />
                        <div className="skeleton h-2.5 w-1/2" />
                        <div className="skeleton h-2 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && results?.length === 0 && selected.length > 0 && (
                <div className="px-1 py-6 text-center">
                  <p className="text-[12.5px] text-mist-300">
                    Nothing fits that combination and time window.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMinutes(0)}
                    className="btn btn-quiet mt-1 text-[11.5px]"
                  >
                    Remove the time limit
                  </button>
                </div>
              )}

              {!loading && results?.length > 0 && (
                <ol className="space-y-2">
                  {results.map((item, index) => (
                    <li key={item.id}>
                      <Link
                        to={`/title/${item.id}`}
                        className="group flex gap-3 rounded-lg p-1.5 transition hover:bg-white/5"
                      >
                        <span className="relative w-12 shrink-0 overflow-hidden rounded">
                          <img
                            src={item.poster}
                            alt=""
                            loading="lazy"
                            className="aspect-[2/3] w-full object-cover"
                          />
                          <span className="absolute left-0 top-0 rounded-br bg-ink-950/85 px-1 font-mono text-[9px] text-mist-300">
                            {index + 1}
                          </span>
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[12.5px] font-medium text-mist-100 group-hover:text-white">
                              {item.title}
                            </span>
                            <span className="shrink-0 font-mono text-[10.5px] text-mint">
                              {item.match}%
                            </span>
                          </span>

                          <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-mist-500">
                            <Star size={9} filled /> {item.rating?.toFixed(1)}
                            <span className="text-mist-700">·</span>
                            {item.year}
                            {item.runtime && (
                              <>
                                <span className="text-mist-700">·</span>
                                {item.runtime} min
                              </>
                            )}
                          </span>

                          <span className="mt-1 block text-[10.5px] leading-snug text-mist-400">
                            {REASON_COPY[item.matchReason] ?? item.matchReason}
                            {item.genres?.[0] ? ` · ${item.genres[0]}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {results?.length > 0 && (
              <div className="flex gap-2 border-t border-white/8 p-3">
                <button
                  type="button"
                  onClick={saveShortlist}
                  disabled={saving}
                  className="btn btn-ghost h-9 flex-1 text-[11.5px]"
                >
                  <Check size={13} /> Save shortlist
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="btn btn-quiet h-9 text-[11.5px]"
                >
                  Start over
                </button>
              </div>
            )}
          </div>

          <p className="mt-3 px-1 text-[10.5px] leading-relaxed text-mist-600">
            Your picks live in the address bar — copy the URL to send this shortlist to someone
            else.
          </p>
        </aside>
      </div>

      {/* -------------------------------------------------- Results in full */}
      {!loading && results?.length > 0 && (
        <section className="shell mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[26px] leading-tight">Your four, in full</h2>
              <p className="mt-1 text-[12.5px] text-mist-500">
                Same list, bigger artwork — plus a way to watch together.
              </p>
            </div>
            <Link
              to={`/party?title=${encodeURIComponent(results[0].id)}`}
              className="btn btn-ghost h-9 text-[12px]"
            >
              <Users size={14} /> Watch the top pick with friends
            </Link>
          </div>

          <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4">
            {results.slice(0, 4).map((item, index) => (
              <li key={item.id}>
                <Poster
                  title={item}
                  index={index}
                  showMeta
                  match={item.match}
                  onToggleWatchlist={toggleWatchlist}
                  inWatchlist={inWatchlist(item.id)}
                />
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-[12px] text-mist-400">
            <Sparkles size={14} className="text-amber" />
            <p className="flex-1">
              Saved {stats.watchlist} title{stats.watchlist === 1 ? "" : "s"} and rated{" "}
              {stats.rated} so far. Ratings nudge future shortlists.
            </p>
            <Link to="/watchlist" className="text-mist-100 underline-offset-4 hover:underline">
              Open watchlist <ArrowRight size={12} className="inline" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
