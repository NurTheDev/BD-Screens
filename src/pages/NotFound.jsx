/**
 * @file NotFound.jsx
 * @description 404 with a way out.
 *
 * The old build had a lamp animation and a dead end. This one offers three
 * plausible next actions (home, browse, search) and pre-fills the search with the
 * path the user tried, because a mistyped URL often contains the title they wanted.
 */

import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Home, Search, Compass } from "../components/ui/Icons.jsx";

export default function NotFound() {
  const { pathname } = useLocation();
  const guess = decodeURIComponent(pathname.replace(/^\/+|\/+$/g, "").replace(/[-/]/g, " "));

  return (
    <div className="shell flex min-h-[78svh] flex-col items-center justify-center py-24 text-center">
      <p className="font-mono text-[11px] tracking-[0.4em] text-mist-600">404</p>

      <h1 className="display mt-3 text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.98]">
        This reel is missing.
      </h1>

      <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-mist-400">
        {guess
          ? `Nothing lives at “${guess}”. It may have been renamed, or the link was typed by hand.`
          : "The page you asked for does not exist. Nothing is broken — you just took a wrong turn."}
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link to="/" className="btn btn-primary">
          <Home size={15} /> Go home
        </Link>
        <Link to="/browse" className="btn btn-ghost">
          <Compass size={15} /> Browse titles
        </Link>
        {guess && (
          <Link to={`/search?q=${encodeURIComponent(guess)}`} className="btn btn-ghost">
            <Search size={15} /> Search “{guess.slice(0, 22)}”
            <ArrowRight size={13} />
          </Link>
        )}
      </div>

      <p className="mt-10 text-[11px] text-mist-600">
        If you followed a link from inside BD Screens, that is a bug worth reporting.
      </p>
    </div>
  );
}
