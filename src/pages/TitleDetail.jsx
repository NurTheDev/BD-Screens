/**
 * @file TitleDetail.jsx
 * @description Everything about one title: artwork, facts, cast, production notes,
 * a trailer if the source has one, and similar titles.
 *
 * This page is the answer to "why should I watch this?", so it is built in the
 * order a viewer asks the questions:
 *   what is it → is it any good → who is in it → what is it about → what else is like it
 * The production notes section (`#notes`) is where the demo catalogue shows that
 * it carries real editorial content, not filler.
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useFetch } from "../hooks/useFetch.js";
import { useLibrary } from "../lib/library.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { Rail, RailItem } from "../components/ui/Rail.jsx";
import { Poster } from "../components/ui/Poster.jsx";
import {
  ArrowLeft,
  Check,
  Clock,
  Info,
  Play,
  Plus,
  Share,
  Star,
  ThumbsDown,
  ThumbsUp,
  Users,
  Warning,
} from "../components/ui/Icons.jsx";

export default function TitleDetail() {
  const { id } = useParams();
  const {
    data: title,
    loading,
    error,
  } = useFetch(
    useCallback((signal) => api.title(id, signal), [id]),
    [id],
  );

  const { inWatchlist, toggleWatchlist, rate, ratings } = useLibrary();
  const toast = useToast();
  const [shared, setShared] = useState(false);

  /* Scroll to the notes anchor after content arrives (deep link support). */
  useEffect(() => {
    if (!title || window.location.hash !== "#notes") return;
    document.getElementById("notes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [title]);

  const onShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: title?.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
      toast.success("Link copied");
      setTimeout(() => setShared(false), 2500);
    } catch {
      // The user dismissed the share sheet, or the clipboard is blocked.
      toast.info("Copy the address from your browser to share.");
    }
  };

  if (loading) {
    return (
      <div className="shell pt-24" aria-busy="true">
        <div className="skeleton h-[46svh] w-full rounded-2xl" />
        <div className="skeleton mt-6 h-9 w-2/3 max-w-md" />
        <div className="skeleton mt-3 h-4 w-1/3" />
        <div className="skeleton mt-6 h-24 w-full max-w-2xl" />
      </div>
    );
  }

  if (error || !title) {
    return (
      <div className="shell flex min-h-[70svh] flex-col items-center justify-center text-center">
        <Warning size={28} className="text-signal" />
        <h1 className="mt-4 font-display text-3xl">We could not find that title</h1>
        <p className="mt-2 max-w-sm text-sm text-mist-400">
          {error?.message ?? "The link may be old, or the title was removed."}
        </p>
        <Link to="/browse" className="btn btn-ghost mt-6">
          <ArrowLeft size={16} /> Back to browse
        </Link>
      </div>
    );
  }

  const year = title.year ?? String(title.releaseDate ?? "").slice(0, 4);
  const saved = inWatchlist(title.id);
  const verdict = ratings[title.id];

  return (
    <article className="pb-16">
      {/* ---------------------------------------------------------------- Hero */}
      <header className="relative isolate">
        <div className="absolute inset-0 -z-10 h-[62svh] overflow-hidden">
          <img
            src={title.backdrop ?? title.poster}
            alt=""
            className="h-full w-full scale-105 object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,11,0.55)_0%,rgba(8,8,11,0.75)_55%,#08080b_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,11,0.9),transparent_60%)]" />
        </div>

        <div className="shell grid gap-6 pt-24 pb-8 sm:gap-8 sm:pb-10 sm:pt-28 md:grid-cols-[260px_1fr] md:gap-10 lg:grid-cols-[300px_1fr]">
          <div className="mx-auto w-[148px] shrink-0 sm:w-[210px] md:mx-0 md:w-full">
            <div className="overflow-hidden rounded-xl border border-white/12 shadow-lift">
              <img
                src={title.poster ?? `/api/art/${encodeURIComponent(title.id)}.svg`}
                alt={`${title.title} poster`}
                className="aspect-[2/3] w-full object-cover"
              />
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-mist-400">
              <span>Your verdict</span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    rate(title.id, "up");
                    toast.success("Noted — more like this in your recommendations.");
                  }}
                  className={`rounded p-1.5 transition ${verdict === "up" ? "bg-mint/20 text-mint" : "hover:bg-white/8 hover:text-white"}`}
                  aria-label="I liked this"
                  aria-pressed={verdict === "up"}
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => rate(title.id, "down")}
                  className={`rounded p-1.5 transition ${verdict === "down" ? "bg-signal/20 text-signal-soft" : "hover:bg-white/8 hover:text-white"}`}
                  aria-label="Not for me"
                  aria-pressed={verdict === "down"}
                >
                  <ThumbsDown size={14} />
                </button>
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {title.genres?.slice(0, 3).map((/** @type {string} */ genre) => (
                <Link
                  key={genre}
                  to={`/browse?genre=${encodeURIComponent(genre)}`}
                  className="chip"
                >
                  {genre}
                </Link>
              ))}
            </div>

            <h1 className="display mt-4 text-[clamp(2.2rem,5.6vw,4.2rem)] leading-[0.98]">
              {title.title}
            </h1>

            {title.tagline && (
              <p className="mt-2 font-display text-[19px] italic text-mist-400">
                {title.tagline}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-mist-300">
              {title.rating > 0 && (
                <span className="flex items-center gap-1.5 font-semibold text-amber">
                  <Star size={13} filled /> {title.rating.toFixed(1)}
                  <span className="font-normal text-mist-500">
                    ({title.votes?.toLocaleString()} ratings)
                  </span>
                </span>
              )}
              {year && <span>{year}</span>}
              {title.runtime && (
                <span className="flex items-center gap-1">
                  <Clock size={13} />
                  {title.kind === "series" ? `${title.runtime} min/ep` : `${title.runtime} min`}
                </span>
              )}
              {title.seasons && (
                <span>
                  {title.seasons} season{title.seasons > 1 ? "s" : ""}
                </span>
              )}
              {title.maturity && (
                <span className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                  {title.maturity}
                </span>
              )}
              <span className="text-mist-500">{title.language}</span>
            </div>

            <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-mist-300">
              {title.overview}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Link to={`/watch/${title.id}`} className="btn btn-primary h-11 px-6">
                <Play size={16} />
                {title.kind === "series" ? "Play episode 1" : "Play"}
              </Link>

              <button
                type="button"
                onClick={() => {
                  toggleWatchlist(title);
                  toast.success(saved ? "Removed from watchlist" : "Added to watchlist");
                }}
                className="btn btn-ghost h-11"
                aria-pressed={saved}
              >
                {saved ? <Check size={16} /> : <Plus size={16} />}
                {saved ? "In watchlist" : "Watchlist"}
              </button>

              <Link
                to={`/party?title=${encodeURIComponent(title.id)}`}
                className="btn btn-ghost h-11"
              >
                <Users size={16} />
                Watch party
              </Link>

              <button type="button" onClick={onShare} className="btn btn-quiet h-11">
                {shared ? <Check size={16} /> : <Share size={16} />}
                {shared ? "Copied" : "Share"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------- Body */}
      <div className="shell grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-12">
          {/* Trailer */}
          {title.trailerKey && (
            <section aria-labelledby="trailer-heading">
              <h2 id="trailer-heading" className="text-[15px] font-semibold">
                Trailer
              </h2>
              <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                <iframe
                  title={`${title.title} trailer`}
                  src={`https://www.youtube-nocookie.com/embed/${title.trailerKey}?rel=0`}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full"
                />
              </div>
            </section>
          )}

          {/* Production notes — the editorial core of the demo catalogue */}
          {title.notes?.length > 0 && (
            <section id="notes" aria-labelledby="notes-heading" className="scroll-mt-24">
              <h2 id="notes-heading" className="font-display text-[26px]">
                Inside the making
              </h2>
              <p className="mt-1 text-[12.5px] text-mist-500">
                Three production notes that tell you what kind of film this is.
              </p>

              <ol className="mt-5 space-y-4">
                {title.notes.map((/** @type {any} */ note, /** @type {number} */ index) => (
                  <li
                    key={note.title}
                    className="relative rounded-xl border border-white/8 bg-white/[0.025] p-4 pl-12 sm:p-5 sm:pl-14"
                  >
                    <span className="absolute left-4 top-4 font-display text-[22px] leading-none text-white/20 sm:left-5 sm:top-5">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-[13.5px] font-semibold text-mist-100">{note.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-mist-400">
                      {note.body}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Cast */}
          {title.cast?.length > 0 && (
            <section aria-labelledby="cast-heading">
              <h2 id="cast-heading" className="font-display text-[26px]">
                Cast
              </h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {title.cast.map((/** @type {any} */ person) => (
                  <li
                    key={person.name}
                    className="flex items-center gap-3 rounded-lg border border-white/6 bg-white/[0.02] p-2.5"
                  >
                    {person.photo ? (
                      <img
                        src={person.photo}
                        alt=""
                        loading="lazy"
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-700 text-[13px] font-semibold text-mist-400">
                        {person.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium text-mist-100">
                        {person.name}
                      </span>
                      <span className="block truncate text-[11px] text-mist-500">
                        {person.role}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Facts rail */}
        <aside className="space-y-5 lg:pt-1">
          <div className="panel p-4">
            <h2 className="eyebrow">Details</h2>
            <dl className="mt-3 space-y-2.5 text-[12.5px]">
              {[
                ["Released", title.releaseDate ?? "—"],
                ["Runtime", title.runtime ? `${title.runtime} min` : "—"],
                ["Language", title.language ?? "—"],
                ["Genres", title.genres?.join(", ") || "—"],
                ["Age rating", title.maturity ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-mist-500">{label}</dt>
                  <dd className="text-right text-mist-200">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {title.crew?.length > 0 && (
            <div className="panel p-4">
              <h2 className="eyebrow">Crew</h2>
              <ul className="mt-3 space-y-2 text-[12.5px]">
                {title.crew.map((/** @type {any} */ person) => (
                  <li
                    key={`${person.name}-${person.job}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="text-mist-100">{person.name}</span>
                    <span className="text-mist-500">{person.job}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="panel p-4">
            <h2 className="eyebrow flex items-center gap-1.5">
              <Info size={11} /> Why this is here
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-mist-400">
              {title.source === "demo"
                ? "This is a BD Screens Original written for the demo catalogue, with artwork generated for the project. The metadata shape is identical to live TMDB results, so the UI never special-cases it."
                : "Live metadata from TMDB, normalised by our server so the UI has one render path for every source."}
            </p>
          </div>
        </aside>
      </div>

      {/* Similar */}
      {title.similar?.length > 0 && (
        <Rail className="mt-14" title="More like this" subtitle="Same mood, different story">
          {title.similar.map((/** @type {any} */ item, /** @type {number} */ index) => (
            <RailItem key={item.id}>
              <Poster
                title={item}
                index={index}
                onToggleWatchlist={toggleWatchlist}
                inWatchlist={inWatchlist(item.id)}
              />
            </RailItem>
          ))}
        </Rail>
      )}
    </article>
  );
}
