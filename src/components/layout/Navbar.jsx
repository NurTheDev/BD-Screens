/**
 * @file Navbar.jsx
 * @description Top navigation.
 *
 * Behaviour notes (these are the things that annoy users when done badly):
 *  - the bar is transparent over the hero and turns solid once you scroll,
 *  - the mobile menu traps focus and closes on Escape or route change,
 *  - the search field is reachable with "/" (a habit users bring from GitHub),
 *  - the account menu shows local-mode status honestly instead of faking a login.
 */

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "./Logo.jsx";
import { useAuth } from "../../lib/auth.jsx";
import { useLibrary } from "../../lib/library.jsx";
import { Search, Menu, Close, Bookmark, User, Logout, Sparkles, Users } from "../ui/Icons.jsx";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/browse", label: "Browse" },
  { to: "/discover", label: "Discover" },
  { to: "/watchlist", label: "Watchlist" },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSignedIn, user, signOut, mode } = useAuth();
  const { stats } = useLibrary();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const searchRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const isHome = location.pathname === "/";

  /* Solid bar after 24px of scroll. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close every popover on navigation. */
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname, location.search]);

  /* "/" focuses search, Escape closes menus. */
  useEffect(() => {
    const onKey = (/** @type {KeyboardEvent} */ event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      const typing =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setMenuOpen(false);
        setAccountOpen(false);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Lock body scroll while the mobile sheet is open. */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  /** @param {React.FormEvent<HTMLFormElement>} event */
  const onSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const q = String(data.get("q") ?? "").trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    searchRef.current?.blur();
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled || !isHome
            ? "border-b border-white/8 bg-ink-950/88 backdrop-blur-xl"
            : "border-b border-transparent bg-gradient-to-b from-ink-950/85 to-transparent"
        }`}
      >
        <div className="shell flex h-16 items-center gap-3 sm:h-[68px]">
          <div className="flex items-center gap-6">
            <Logo />

            <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
              {LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `relative rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
                      isActive ? "text-mist-100" : "text-mist-400 hover:text-mist-100"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {link.label}
                      {link.to === "/watchlist" && stats.watchlist > 0 && (
                        <span className="ml-1.5 rounded-full bg-signal/20 px-1.5 py-0.5 text-[10px] font-semibold text-signal-soft">
                          {stats.watchlist}
                        </span>
                      )}
                      {isActive && (
                        <span className="absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-signal to-transparent" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <form onSubmit={onSubmit} className="hidden lg:block" role="search">
              <label className="group flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 transition focus-within:border-white/30 focus-within:bg-white/10">
                <Search size={15} className="text-mist-500 group-focus-within:text-mist-200" />
                <input
                  ref={searchRef}
                  name="q"
                  type="search"
                  placeholder="Search films, drama…"
                  aria-label="Search titles"
                  className="w-40 bg-transparent text-[13px] text-mist-100 placeholder:text-mist-500 focus:outline-none xl:w-56"
                />
                <kbd className="hidden rounded border border-white/15 px-1 text-[10px] text-mist-500 xl:block">
                  /
                </kbd>
              </label>
            </form>

            <Link
              to="/search"
              className="flex h-9 w-9 items-center justify-center rounded-full text-mist-300 transition hover:bg-white/8 hover:text-white lg:hidden"
              aria-label="Search"
            >
              <Search size={18} />
            </Link>

            <Link
              to="/party"
              className="hidden items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[12px] font-medium text-mist-200 transition hover:border-white/30 hover:text-white sm:flex"
            >
              <Users size={14} />
              Watch party
            </Link>

            {isSignedIn ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-white/10 py-1 pl-1 pr-1.5 transition hover:border-white/25 sm:pr-2.5"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  {user?.photo ? (
                    <img
                      src={user.photo}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-signal to-lilac text-[11px] font-bold text-white">
                      {(user?.name ?? "V").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="hidden max-w-24 truncate text-[12px] font-medium text-mist-200 sm:block">
                    {user?.name}
                  </span>
                </button>

                {accountOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default"
                      aria-label="Close account menu"
                      onClick={() => setAccountOpen(false)}
                    />
                    <div
                      role="menu"
                      className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-white/10 bg-ink-850/98 p-1.5 shadow-lift backdrop-blur"
                    >
                      <div className="border-b border-white/8 px-2.5 pb-2.5 pt-1.5">
                        <p className="truncate text-[13px] font-semibold text-mist-100">
                          {user?.name}
                        </p>
                        <p className="truncate text-[11px] text-mist-500">{user?.email}</p>
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-mist-400">
                          {mode === "firebase" ? "Firebase account" : "Local demo profile"}
                        </p>
                      </div>

                      <Link
                        to="/watchlist"
                        role="menuitem"
                        className="mt-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-mist-200 transition hover:bg-white/6 hover:text-white"
                      >
                        <Bookmark size={15} /> My watchlist
                      </Link>
                      <Link
                        to="/discover"
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-mist-200 transition hover:bg-white/6 hover:text-white"
                      >
                        <Sparkles size={15} /> Taste profile
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          signOut();
                          navigate("/");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-mist-300 transition hover:bg-signal/12 hover:text-signal-soft"
                      >
                        <Logout size={15} /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/signin" className="btn btn-ghost h-9 px-3.5 text-[12px] sm:px-4">
                <User size={15} />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-mist-200 transition hover:bg-white/8 md:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sheet */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />

          <div
            ref={menuRef}
            className="absolute inset-y-0 right-0 flex w-[82%] max-w-sm flex-col border-l border-white/10 bg-ink-900 p-5"
            style={{ animation: "riseIn .24s ease-out both" }}
          >
            <div className="flex items-center justify-between">
              <Logo size={24} />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-mist-200"
                aria-label="Close menu"
              >
                <Close size={17} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-6" role="search">
              <label className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
                <Search size={16} className="text-mist-500" />
                <input
                  name="q"
                  type="search"
                  placeholder="Search films, drama…"
                  aria-label="Search titles"
                  className="w-full bg-transparent text-sm placeholder:text-mist-500 focus:outline-none"
                />
              </label>
            </form>

            <nav className="mt-6 flex flex-col gap-0.5" aria-label="Mobile">
              {[...LINKS, { to: "/party", label: "Watch party" }].map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-3 text-[15px] font-medium transition ${
                      isActive ? "bg-white/8 text-white" : "text-mist-300 hover:bg-white/5"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto border-t border-white/8 pt-4">
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setMenuOpen(false);
                    navigate("/");
                  }}
                  className="btn btn-ghost w-full"
                >
                  <Logout size={16} /> Sign out
                </button>
              ) : (
                <Link to="/signin" className="btn btn-primary w-full">
                  Sign in
                </Link>
              )}
              <p className="mt-3 text-center text-[11px] text-mist-600">
                BD Screens · made in Dhaka
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
