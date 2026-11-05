/**
 * @file Rail.jsx
 * @description A horizontally scrolling row of posters.
 *
 * Native scroll + scroll-snap, not a carousel library. That means:
 *  - touch and trackpad feel exactly right on every device,
 *  - keyboard users can tab through the row,
 *  - no 200 KB slider dependency, no duplicated "infinite" slides that break
 *    screen-reader order, and no fight with `prefers-reduced-motion`.
 *
 * The arrow buttons are progressive enhancement for mouse users and are hidden
 * on touch screens where swiping is the obvious gesture.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "./Icons.jsx";

/**
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   href?: string,
 *   children: React.ReactNode,
 *   loading?: boolean,
 *   skeletonCount?: number,
 *   className?: string,
 * }} props
 */
export function Rail({
  title,
  subtitle,
  href,
  children,
  loading = false,
  skeletonCount = 7,
  className = "",
}) {
  const scroller = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const element = scroller.current;
    if (!element) return;
    const atStart = element.scrollLeft <= 8;
    const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 8;
    setEdges({ start: atStart, end: atEnd });
  }, []);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return undefined;

    measure();
    element.addEventListener("scroll", measure, { passive: true });

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure, loading]);

  const nudge = (/** @type {number} */ direction) => {
    const element = scroller.current;
    if (!element) return;
    // Move by roughly a "page" of cards, not a fixed pixel count: works at every
    // breakpoint without magic numbers per width.
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className={`relative ${className}`} aria-labelledby={`rail-${slug(title)}`}>
      <div className="shell flex items-end justify-between gap-4 pb-3">
        <div className="min-w-0">
          <h2
            id={`rail-${slug(title)}`}
            className="text-[17px] font-semibold tracking-tight text-mist-100 sm:text-lg"
          >
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-mist-500">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {href && (
            <Link
              to={href}
              className="group hidden items-center gap-1 text-xs font-medium text-mist-400 transition hover:text-mist-100 sm:flex"
            >
              See all
              <span className="transition group-hover:translate-x-0.5">
                <ArrowRight size={14} />
              </span>
            </Link>
          )}

          <div className="ml-2 hidden items-center gap-1 md:flex">
            <button
              type="button"
              onClick={() => nudge(-1)}
              disabled={edges.start}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-mist-300 transition hover:border-white/30 hover:text-white disabled:opacity-25"
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              disabled={edges.end}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-mist-300 transition hover:border-white/30 hover:text-white disabled:opacity-25"
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        /*
         * The gutter is applied as padding on the scroller itself, not via .shell.
         * That keeps the first card aligned with the headings (same 4rem) while
         * still allowing the row to bleed to the viewport edge, which is what
         * makes a horizontal rail feel like it continues off-screen.
         */
        className="rail no-scrollbar px-[clamp(1rem,4vw,4rem)]"
        // Cards are ~150px on phones and grow to 200px on large screens; this is
        // expressed once here instead of in every consumer.
        style={{ "--card-w": "clamp(126px, 15vw, 196px)" }}
        tabIndex={0}
        role="group"
        aria-label={title}
      >
        {loading
          ? Array.from({ length: skeletonCount }).map((_, index) => (
              <div key={index} className="w-[var(--card-w)]" aria-hidden="true">
                <div className="skeleton aspect-[2/3] w-full" />
                <div className="skeleton mt-2 h-3 w-3/4" />
              </div>
            ))
          : children}
      </div>
    </section>
  );
}

/** Card wrapper so consumers stay one line. */
export function RailItem({ children }) {
  return <div className="w-[var(--card-w)]">{children}</div>;
}

/** @param {string} value */
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
