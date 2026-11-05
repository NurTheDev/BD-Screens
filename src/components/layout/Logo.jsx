/**
 * @file Logo.jsx
 * @description Wordmark drawn as SVG so it stays crisp, themable and cheap.
 *
 * The mark is a rounded screen containing a play triangle; the "signal" red dot
 * doubles as the live indicator across the app (nav, party badge, hero).
 */

import { Link } from "react-router-dom";

/**
 * @param {{ size?: number, wordmark?: boolean, to?: string, className?: string }} props
 */
export function Logo({ size = 26, wordmark = true, to = "/", className = "" }) {
  const content = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1.5"
          y="3.5"
          width="29"
          height="25"
          rx="7"
          fill="#0c0c11"
          stroke="var(--color-signal)"
          strokeWidth="2"
        />
        <path
          d="M13 11.2c0-.9 1-1.45 1.75-.97l7 4.3c.72.44.72 1.5 0 1.94l-7 4.3c-.75.48-1.75-.07-1.75-.97v-8.6Z"
          fill="var(--color-mist-100)"
        />
        <circle cx="25.5" cy="8" r="2.6" fill="var(--color-signal)" />
      </svg>

      {wordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-mist-100">
            BD Screens
          </span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-mist-500">
            Bangladesh
          </span>
        </span>
      )}
    </span>
  );

  if (!to) return content;

  return (
    <Link to={to} aria-label="BD Screens home" className="rounded-lg">
      {content}
    </Link>
  );
}
