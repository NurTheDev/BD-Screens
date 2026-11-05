/**
 * @file Footer.jsx
 * @description Site footer.
 *
 * This is where a portfolio project can be honest and useful at the same time:
 * the "About this build" column explains what the demo is, links the source and
 * credits the author — all things a reviewer will look for within ten seconds.
 */

import { Link } from "react-router-dom";
import { Logo } from "./Logo.jsx";
import { GithubMark } from "../ui/Brand.jsx";

const COLUMNS = [
  {
    heading: "Watch",
    links: [
      { label: "Home", to: "/" },
      { label: "Browse all", to: "/browse" },
      { label: "Discover by mood", to: "/discover" },
      { label: "Watchlist", to: "/watchlist" },
    ],
  },
  {
    heading: "Together",
    links: [
      { label: "Watch party", to: "/party" },
      { label: "Search", to: "/search" },
      { label: "Sign in", to: "/signin" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/8 bg-ink-950/60">
      <div className="shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1.3fr] md:gap-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-mist-500">
            A streaming platform for Bangladeshi film, drama and live shows. Built as a
            portfolio project to show real product thinking, not just a working page.
          </p>
          <p className="mt-4 text-[11px] text-mist-600">
            Catalogue artwork and titles on this deployment are sample content created for the
            demo.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h2 className="eyebrow">{column.heading}</h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.to + link.label}>
                  <Link
                    to={link.to}
                    className="text-[13px] text-mist-400 transition hover:text-mist-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="eyebrow">About this build</h2>
          <p className="mt-3 text-[13px] leading-relaxed text-mist-400">
            Designed and built by{" "}
            <span className="font-medium text-mist-100">Md. Nur Islam</span>, a full-stack
            developer in Dhaka.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="https://github.com/nurthedev"
              target="_blank"
              rel="noreferrer noopener"
              className="chip"
            >
              <GithubMark size={13} />
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/nurthedev"
              target="_blank"
              rel="noreferrer noopener"
              className="chip"
            >
              LinkedIn
            </a>
          </div>
          <p className="mt-4 text-[11px] text-mist-600">
            React · Vite · Node/Express · Firebase · WebSocket
          </p>
        </div>
      </div>

      <div className="border-t border-white/6">
        <div className="shell flex flex-col items-center justify-between gap-2 py-5 text-[11px] text-mist-600 sm:flex-row">
          <p>© {new Date().getFullYear()} BD Screens. Demo project, no commercial use.</p>
          <p className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-mint"
              style={{ animation: "pulseDot 2.4s infinite" }}
            />
            All systems operational
          </p>
        </div>
      </div>
    </footer>
  );
}
