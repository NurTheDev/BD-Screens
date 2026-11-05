/**
 * @file SpotlightCard.jsx
 * @description Editorial break between rails: one title, told as a story.
 *
 * A wall of posters is scannable but anonymous. This block slows the scroll for
 * a single film and explains *why* it exists (the production notes), which is
 * the job a real streaming service's editorial layer does. It also proves the
 * demo catalogue carries real metadata instead of lorem ipsum.
 */

import { Link } from "react-router-dom";
import { Play, Star, ArrowRight } from "../ui/Icons.jsx";

/**
 * @param {{ title: any }} props
 */
export function SpotlightCard({ title }) {
  if (!title) return null;

  const note = title.notes?.[0];

  return (
    <section className="shell mt-16 sm:mt-24" aria-labelledby="spotlight-heading">
      <div className="relative overflow-hidden rounded-2xl border border-white/8">
        <img
          src={title.backdrop ?? title.poster}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(95deg,#08080b_8%,rgba(8,8,11,0.92)_38%,rgba(8,8,11,0.55)_72%,rgba(8,8,11,0.85)_100%)]" />

        <div className="relative grid gap-6 p-6 sm:p-9 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:p-12">
          <div>
            <p className="eyebrow">Inside the making</p>
            <h2
              id="spotlight-heading"
              className="display mt-2 text-[clamp(1.9rem,4vw,3.1rem)] text-mist-100"
            >
              {title.title}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mist-400">
              <span className="flex items-center gap-1 text-amber">
                <Star size={12} filled /> {title.rating?.toFixed(1)}
              </span>
              <span>{title.year}</span>
              <span className="text-mist-600">·</span>
              <span>{title.genres?.slice(0, 2).join(", ")}</span>
            </div>

            <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-mist-300">
              {title.tagline ? <em className="text-mist-200">{title.tagline} </em> : null}
              {title.overview}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link to={`/title/${title.id}`} className="btn btn-primary h-10 px-5 text-[13px]">
                <Play size={14} />
                Watch
              </Link>
              <Link
                to={`/title/${title.id}#notes`}
                className="btn btn-ghost h-10 px-4 text-[13px]"
              >
                Read the notes
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {note && (
            <figure className="relative rounded-xl border border-white/10 bg-ink-950/55 p-5 backdrop-blur-md">
              <span
                aria-hidden="true"
                className="absolute -left-0.5 top-3 h-[calc(100%-24px)] w-px bg-gradient-to-b from-transparent via-white/25 to-transparent"
              />
              <figcaption className="eyebrow text-amber/90">{note.title}</figcaption>
              <blockquote className="mt-2 font-display text-[19px] leading-snug text-mist-100 sm:text-[21px]">
                “{note.body}”
              </blockquote>
              <p className="mt-3 text-[11px] text-mist-500">Production note · {title.title}</p>
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}
