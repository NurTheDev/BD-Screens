/**
 * @file Icons.jsx
 * @description Hand-drawn icon set (1.5px stroke, 24px grid).
 *
 * Why not an icon package? The whole app needs eighteen icons. A dependency
 * ships thousands of paths plus a runtime; this file is ~4 KB of SVG that is
 * guaranteed to match the type and stroke weights in the design system.
 *
 * Every icon accepts `size` and inherits `currentColor`.
 */

/**
 * @param {{ children: React.ReactNode, size?: number, className?: string, filled?: boolean }} props
 */
function Icon({ children, size = 20, className = "", filled = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const Play = (props) => (
  <Icon {...props} filled>
    <path d="M8 5.6c0-.9 1-1.5 1.8-1l9.1 6.1c.7.5.7 1.5 0 2l-9.1 6.1c-.8.5-1.8-.1-1.8-1V5.6Z" />
  </Icon>
);

export const Pause = (props) => (
  <Icon {...props} filled>
    <rect x="7" y="5" width="3.5" height="14" rx="1.2" />
    <rect x="13.5" y="5" width="3.5" height="14" rx="1.2" />
  </Icon>
);

export const Search = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
);

export const Close = (props) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const Plus = (props) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const Check = (props) => (
  <Icon {...props}>
    <path d="m5 13 4.5 4.5L19 7" />
  </Icon>
);

export const ArrowRight = (props) => (
  <Icon {...props}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Icon>
);

export const ArrowLeft = (props) => (
  <Icon {...props}>
    <path d="M20 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const ChevronLeft = (props) => (
  <Icon {...props}>
    <path d="M14.5 5 8 12l6.5 7" />
  </Icon>
);

export const ChevronRight = (props) => (
  <Icon {...props}>
    <path d="M9.5 5 16 12l-6.5 7" />
  </Icon>
);

export const Home = (props) => (
  <Icon {...props}>
    <path d="M4 10.5 12 4l8 6.5" />
    <path d="M6 9.8V19a1 1 0 0 0 1 1h3.5v-5h3V20H17a1 1 0 0 0 1-1V9.8" />
  </Icon>
);

export const Compass = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m14.8 9.2-1.5 4.1-4.1 1.5 1.5-4.1 4.1-1.5Z" />
  </Icon>
);

export const Bookmark = ({ filled, ...props }) => (
  <Icon {...props} filled={filled}>
    <path d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-4-6.5 4V5.5a1 1 0 0 1 1-1Z" />
  </Icon>
);

export const Users = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19.5c0-2.9 2.5-4.6 5.5-4.6s5.5 1.7 5.5 4.6" />
    <path d="M16.2 6.2a3 3 0 0 1 0 5.7M17.6 15.3c2 .5 3.4 1.9 3.4 4.2" />
  </Icon>
);

export const Sparkles = (props) => (
  <Icon {...props}>
    <path d="M12 4.5 13.4 9 18 10.4 13.4 11.8 12 16.3 10.6 11.8 6 10.4 10.6 9 12 4.5Z" />
    <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
  </Icon>
);

export const Heart = ({ filled, ...props }) => (
  <Icon {...props} filled={filled}>
    <path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.6 12 20 12 20Z" />
  </Icon>
);

export const ThumbsUp = (props) => (
  <Icon {...props}>
    <path d="M7 10.5v8.2H4.6a1 1 0 0 1-1-1v-6.2a1 1 0 0 1 1-1H7Z" />
    <path d="M7 10.5 11 4c1.6 0 2.3 1.2 2 2.6l-.6 2.9h5.2a1.8 1.8 0 0 1 1.7 2.2l-1.2 5.4a2 2 0 0 1-2 1.6H7" />
  </Icon>
);

export const ThumbsDown = (props) => (
  <Icon {...props}>
    <path d="M17 13.5V5.3h2.4a1 1 0 0 1 1 1v6.2a1 1 0 0 1-1 1H17Z" />
    <path d="M17 13.5 13 20c-1.6 0-2.3-1.2-2-2.6l.6-2.9H6.4a1.8 1.8 0 0 1-1.7-2.2l1.2-5.4a2 2 0 0 1 2-1.6H17" />
  </Icon>
);

export const Clock = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Icon>
);

export const Star = ({ filled, ...props }) => (
  <Icon {...props} filled={filled}>
    <path d="m12 4.5 2.3 4.9 5.2.7-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2L4.5 10l5.2-.7L12 4.5Z" />
  </Icon>
);

export const Share = (props) => (
  <Icon {...props}>
    <circle cx="17.5" cy="6" r="2.5" />
    <circle cx="6.5" cy="12" r="2.5" />
    <circle cx="17.5" cy="18" r="2.5" />
    <path d="m8.7 10.8 6.6-3.6M8.7 13.2l6.6 3.6" />
  </Icon>
);

export const Link = (props) => (
  <Icon {...props}>
    <path d="M10 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11 7.5" />
    <path d="M14 10.5a3.5 3.5 0 0 0-5 0L6.5 13a3.5 3.5 0 0 0 5 5L13 16.5" />
  </Icon>
);

export const Copy = (props) => (
  <Icon {...props}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H5.5A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15" />
  </Icon>
);

export const Menu = (props) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const Logout = (props) => (
  <Icon {...props}>
    <path d="M15 5.5h2.5A1.5 1.5 0 0 1 19 7v10a1.5 1.5 0 0 1-1.5 1.5H15" />
    <path d="M11 8.5 7.5 12l3.5 3.5M7.5 12H15" />
  </Icon>
);

export const User = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
  </Icon>
);

export const Verified = (props) => (
  <Icon {...props} filled>
    <path d="m12 2.8 2.3 1.6 2.8-.1 1 2.6 2.4 1.5-.8 2.7.8 2.7-2.4 1.5-1 2.6-2.8-.1L12 21.2l-2.3-1.6-2.8.1-1-2.6-2.4-1.5.8-2.7-.8-2.7L5.9 7l1-2.6 2.8.1L12 2.8Z" />
    <path d="m8.6 12 2.2 2.2 4.6-4.6" stroke="#08080b" strokeWidth="1.9" />
  </Icon>
);

export const Volume = (props) => (
  <Icon {...props}>
    <path d="M5 9.5h3L12.5 6v12L8 14.5H5z" />
    <path d="M15.5 9a4 4 0 0 1 0 6" />
  </Icon>
);

export const Muted = (props) => (
  <Icon {...props}>
    <path d="M5 9.5h3L12.5 6v12L8 14.5H5z" />
    <path d="m16 9.5 5 5M21 9.5l-5 5" />
  </Icon>
);

export const Expand = (props) => (
  <Icon {...props}>
    <path d="M9 4.5H4.5V9M15 4.5h4.5V9M15 19.5h4.5V15M9 19.5H4.5V15" />
  </Icon>
);

export const Info = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.8v.4" />
  </Icon>
);

export const Warning = (props) => (
  <Icon {...props}>
    <path d="M12 4.5 21 19H3l9-14.5Z" />
    <path d="M12 10v4M12 16.6v.4" />
  </Icon>
);

export const Refresh = (props) => (
  <Icon {...props}>
    <path d="M19 12a7 7 0 1 1-2.1-5" />
    <path d="M19.5 4.5V10H14" />
  </Icon>
);

export const Spark = (props) => (
  <Icon {...props} filled>
    <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
  </Icon>
);

export const Send = (props) => (
  <Icon {...props} filled>
    <path d="M3.9 11.2 19.4 4.3c.7-.3 1.4.4 1.1 1.1l-6.9 15.5c-.3.8-1.5.7-1.7-.1l-1.6-5.6a1 1 0 0 0-.7-.7l-5.6-1.6c-.8-.2-.9-1.4-.1-1.7Z" />
  </Icon>
);

export const Trash = (props) => (
  <Icon {...props}>
    <path d="M4.5 7h15M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M6.5 7l.9 11.4a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7" />
    <path d="M10.5 11v5M13.5 11v5" />
  </Icon>
);

export const Film = (props) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M8 5v14M16 5v14M3 9.5h5M3 14.5h5M16 9.5h5M16 14.5h5" />
  </Icon>
);

export const Ticket = (props) => (
  <Icon {...props}>
    <path d="M3.5 9.5V7a1.5 1.5 0 0 1 1.5-1.5h14A1.5 1.5 0 0 1 20.5 7v2.5a2.5 2.5 0 0 0 0 5V17a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17v-2.5a2.5 2.5 0 0 0 0-5Z" />
    <path d="M12 7v2M12 15v2" />
  </Icon>
);

/* ---- Account + settings ------------------------------------------------ */

export const Mail = (props) => (
  <Icon {...props}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
    <path d="m3.8 7.2 7.3 5.2a1.5 1.5 0 0 0 1.8 0l7.3-5.2" />
  </Icon>
);

export const Lock = (props) => (
  <Icon {...props}>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <path d="M12 14v2.5" />
  </Icon>
);

export const Settings = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.4 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </Icon>
);

export const Shield = (props) => (
  <Icon {...props}>
    <path d="M12 3.5 19 6v6c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5V6l7-2.5Z" />
    <path d="m9.2 12.1 2 2 3.6-3.9" />
  </Icon>
);

export const Download = (props) => (
  <Icon {...props}>
    <path d="M12 4v10.5" />
    <path d="m8 11 4 4 4-4" />
    <path d="M4.5 18.5h15" />
  </Icon>
);

export const Eye = (props) => (
  <Icon {...props}>
    <path d="M2.6 12S6 6.5 12 6.5 21.4 12 21.4 12 18 17.5 12 17.5 2.6 12 2.6 12Z" />
    <circle cx="12" cy="12" r="2.7" />
  </Icon>
);

export const EyeOff = (props) => (
  <Icon {...props}>
    <path d="M4 4.5 20 19.5" />
    <path d="M9.6 9.7a2.9 2.9 0 0 0 4 4" />
    <path d="M6.7 7.9C4.2 9.4 2.6 12 2.6 12s3.4 5.5 9.4 5.5a9.6 9.6 0 0 0 4-.9" />
    <path d="M17.2 16.1c2.3-1.5 3.8-4.1 3.8-4.1s-3.4-5.5-9.4-5.5a9.9 9.9 0 0 0-2.3.3" />
  </Icon>
);

export const Edit3 = (props) => (
  <Icon {...props}>
    <path d="M4.5 19.5h3.2L18.6 8.6a2.3 2.3 0 0 0-3.2-3.2L4.5 16.3v3.2Z" />
    <path d="m14.4 6.5 3.1 3.1" />
  </Icon>
);

export const Pencil = Edit3; // alias with the shorter name

export const Compass2 = Compass;
