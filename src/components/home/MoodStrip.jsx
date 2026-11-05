/**
 * @file MoodStrip.jsx
 * @description Entry point to Mood Match, sitting between hero and catalogue.
 *
 * The strip exists because the hardest part of streaming is deciding. Instead of
 * asking the user to browse 200 posters, it asks one question ("how do you feel
 * tonight?") that a person can answer in two seconds, then hands off to
 * /discover with the choice pre-selected.
 */

import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "../ui/Icons.jsx";

/** Static copy so the strip renders instantly; /api/moods is the same list. */
const MOODS = [
  { id: "slow-burn", label: "Slow burn", accent: "#7aa2ff" },
  { id: "adrenaline", label: "Adrenaline", accent: "#ff6b57" },
  { id: "crying", label: "Need a good cry", accent: "#e6739f" },
  { id: "laughing", label: "Make me laugh", accent: "#f0a93b" },
  { id: "with-family", label: "With family", accent: "#3ddc97" },
  { id: "late-night", label: "Late night", accent: "#9b7ede" },
  { id: "hopeful", label: "Hopeful", accent: "#4ea8de" },
];

export function MoodStrip() {
  return (
    <section className="shell mt-12 sm:mt-16" aria-labelledby="mood-strip-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <Sparkles size={12} />
            Mood match
          </p>
          <h2
            id="mood-strip-heading"
            className="mt-1 font-display text-[26px] leading-tight sm:text-[30px]"
          >
            How do you feel tonight?
          </h2>
        </div>
        <Link
          to="/discover"
          className="group flex items-center gap-1.5 text-xs font-medium text-mist-400 transition hover:text-mist-100"
        >
          Build a taste profile
          <span className="transition group-hover:translate-x-0.5">
            <ArrowRight size={14} />
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {MOODS.map((mood) => (
          <Link
            key={mood.id}
            to={`/discover?moods=${mood.id}`}
            className="group relative flex h-[74px] flex-col justify-between overflow-hidden rounded-xl border border-white/8 p-3 transition hover:border-white/25 sm:h-[84px]"
            style={{
              background: `linear-gradient(150deg, ${mood.accent}22, #101017 70%)`,
            }}
          >
            <span
              className="absolute -right-6 -top-8 h-20 w-20 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
              style={{ background: mood.accent }}
            />
            <span className="h-1 w-6 rounded-full" style={{ background: mood.accent }} />
            <span className="text-[12.5px] font-medium leading-tight text-mist-100">
              {mood.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
