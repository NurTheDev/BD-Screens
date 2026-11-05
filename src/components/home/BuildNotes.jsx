/**
 * @file BuildNotes.jsx
 * @description The one section on the home page written for a reviewer rather
 * than a viewer.
 *
 * A portfolio project usually proves itself with a wall of logos ("React!
 * Firebase! WebSocket!"). That says nothing about craft. This panel states four
 * engineering decisions that are specific, checkable in the repo, and hard to
 * fake — each one links to the file or document that implements it.
 */

import { Link } from "react-router-dom";
import { GithubMark } from "../ui/Brand.jsx";
import { ArrowRight, Check } from "../ui/Icons.jsx";

const NOTES = [
  {
    title: "The API key is not in the bundle",
    detail:
      "TMDB is called by an Express proxy with an 8s timeout, a 5-minute memory cache and demo fallbacks, so the browser never sees a credential.",
    where: "server/lib/tmdb.js",
  },
  {
    title: "Watch parties measure their own sync",
    detail:
      "Playback is an anchor timestamp, not a tick stream. Clients estimate clock offset with ping/pong and report ±ms in the UI.",
    where: "server/lib/party-hub.js",
  },
  {
    title: "Accessibility is a build step",
    detail:
      "Skip link, visible focus rings, a keyboard-shortcut player, one polite live region for toasts, and reduced-motion honoured everywhere.",
    where: "src/styles/index.css",
  },
  {
    title: "Failure is designed, not discovered",
    detail:
      "Every upstream call degrades to the bundled catalogue, images have skeletons and fallbacks, and errors keep their request id.",
    where: "docs/ARCHITECTURE.md",
  },
];

export function BuildNotes() {
  return (
    <section className="shell mt-16 sm:mt-20" aria-labelledby="build-heading">
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow flex items-center gap-1.5">
              <Check size={11} /> Under the hood
            </p>
            <h2
              id="build-heading"
              className="mt-1.5 font-display text-[26px] leading-tight sm:text-[30px]"
            >
              Four decisions worth a closer look
            </h2>
          </div>
          <a
            href="https://github.com/nurthedev"
            target="_blank"
            rel="noreferrer noopener"
            className="chip"
          >
            <GithubMark size={13} />
            Source
          </a>
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {NOTES.map((note, index) => (
            <li
              key={note.title}
              className="group rounded-xl border border-white/6 bg-ink-900/60 p-4 transition hover:border-white/15"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] text-signal">0{index + 1}</span>
                <h3 className="text-[13.5px] font-semibold text-mist-100">{note.title}</h3>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-mist-400">
                {note.detail}
              </p>
              <code className="mt-2.5 inline-block rounded bg-white/6 px-1.5 py-0.5 text-[10.5px] text-mist-500">
                {note.where}
              </code>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/8 pt-5 text-[12px] text-mist-400">
          <p className="flex-1">
            Architecture, API contract and the security notes are written up in the repository,
            not just in commits.
          </p>
          <Link
            to="/discover"
            className="flex items-center gap-1 text-mist-200 transition hover:text-white"
          >
            Try the recommender
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}
