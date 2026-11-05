/**
 * @file SiteLayout.jsx
 * @description The public shell: navbar, routed content, footer.
 *
 * Also handles the one global UX detail that is easy to forget: scrolling to the
 * top on navigation, but *not* when only the query string changes (filtering the
 * browse page should keep your position).
 */

import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar.jsx";
import { Footer } from "./Footer.jsx";

export function SiteLayout() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current !== pathname) {
      // `instant` avoids a smooth-scroll animation racing the page transition.
      window.scrollTo({ top: 0, behavior: "instant" });
      previous.current = pathname;
    }
  }, [pathname]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Keyboard users land here first. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-mist-100 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-950"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
