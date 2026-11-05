/**
 * @file Party.jsx
 * @description Lobby for creating or joining a watch party.
 *
 * `/party?title=<id>` arrives from a title page (create flow),
 * `/party/ABCDEF` arrives from an invite link (join flow).
 *
 * The join flow is intentionally tolerant: the code from the URL is validated
 * against the live server first, so a typo produces a helpful message instead of
 * a socket that connects and then fails silently.
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, verifyParty } from "../lib/api.js";
import { useFetch } from "../hooks/useFetch.js";
import { useWatchParty } from "../lib/watchParty.jsx";
import { inviteLink } from "../lib/party-utils.js";
import { useToast } from "../components/ui/Toast.jsx";
import { useAuth } from "../lib/auth.jsx";
import { Poster } from "../components/ui/Poster.jsx";
import { Copy, Check, Ticket, Users, Warning, ArrowRight } from "../components/ui/Icons.jsx";

export default function Party() {
  const { code: routeCode } = useParams();
  const [params] = useSearchParams();
  const titleId = params.get("title");
  const toast = useToast();
  const { user } = useAuth();
  const party = useWatchParty();

  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("bds:party-name") ?? "";
    } catch {
      return "";
    }
  });
  const [code, setCode] = useState(routeCode?.toUpperCase() ?? "");
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState(/** @type {string | null} */ (null));
  const [copied, setCopied] = useState(false);

  const { data: title } = useFetch(
    useCallback(
      (signal) => (titleId ? api.title(titleId, signal) : Promise.resolve({ data: null })),
      [titleId],
    ),
    [titleId],
    { enabled: Boolean(titleId) },
  );

  /* Remember the display name so returning users do not retype it. */
  useEffect(() => {
    try {
      if (name.trim()) localStorage.setItem("bds:party-name", name.trim());
    } catch {
      /* storage may be blocked; harmless */
    }
  }, [name]);

  /* Already in a party: go straight to the player. */
  if (party.status === "joined" && party.party) {
    return (
      <div className="shell flex min-h-[80svh] flex-col items-center justify-center py-24 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-mint/40 text-mint">
          <Ticket size={24} />
        </span>
        <h1 className="mt-5 font-display text-[34px] leading-tight">
          You are in room{" "}
          <span className="font-mono tracking-widest text-amber">{party.party.code}</span>
        </h1>
        <p className="mt-2 max-w-md text-sm text-mist-400">
          {party.members.length} {party.members.length === 1 ? "person" : "people"} connected.
          {party.isHost
            ? " You are hosting — start playback when everyone is ready."
            : " The host controls playback."}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to={`/watch/${party.party.titleId}`} className="btn btn-primary">
            Enter the room <ArrowRight size={16} />
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(inviteLink(party.party.code));
                setCopied(true);
                toast.success("Invite link copied");
                setTimeout(() => setCopied(false), 2200);
              } catch {
                toast.info(`Invite code: ${party.party.code}`);
              }
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            Copy invite link
          </button>
          <button type="button" className="btn btn-quiet" onClick={party.leaveParty}>
            Leave
          </button>
        </div>
      </div>
    );
  }

  const onSubmitJoin = async (/** @type {React.FormEvent} */ event) => {
    event.preventDefault();
    setCodeError(null);

    if (name.trim().length < 2) {
      setCodeError("Add a display name (at least 2 characters).");
      return;
    }
    const cleaned = code.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(cleaned)) {
      setCodeError("Codes are six characters, letters and numbers.");
      return;
    }

    setChecking(true);
    try {
      await verifyParty(cleaned);
      party.joinParty(cleaned, name.trim());
    } catch (error) {
      setCodeError(
        /** @type {any} */ (error)?.status === 404
          ? "No live party with that code. Ask the host for a fresh invite."
          : "Could not reach the party server. Is the API running?",
      );
    } finally {
      setChecking(false);
    }
  };

  const partyError = party.error;

  return (
    <div className="shell pt-24 pb-16 sm:pt-28">
      <header className="max-w-2xl">
        <p className="eyebrow flex items-center gap-1.5">
          <Users size={12} /> Watch party
        </p>
        <h1 className="display mt-2 text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02]">
          The same film,
          <br />
          the same second.
        </h1>
        <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-mist-400">
          Start a room, send the link, and everyone's player locks to the host's timeline. Clock
          offset is measured against the server, so the sync badge shows a real millisecond
          figure instead of "in sync" hand-waving. Reactions and chat run beside the film.
        </p>
      </header>

      {/* The name belongs to the person, not to either card: hoisting it here is
          what lets someone who followed an invite link join without hunting for
          a field that only exists when they arrived with a title. */}
      <section className="panel mt-8 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="min-w-0 sm:w-[240px] sm:shrink-0">
          <label className="block text-[12px] font-medium text-mist-200" htmlFor="party-name">
            Your display name
          </label>
          <p className="mt-0.5 text-[11px] text-mist-600">Shown next to your messages.</p>
        </div>
        <input
          id="party-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={24}
          placeholder={user?.name ?? "e.g. Nur"}
          className="field flex-1"
          autoComplete="nickname"
          aria-describedby="party-name-hint"
        />
        <p
          id="party-name-hint"
          className={`text-[11px] sm:w-[170px] sm:shrink-0 ${name.trim().length >= 2 ? "text-mist-600" : "text-amber"}`}
        >
          {name.trim().length >= 2
            ? "You are ready to join."
            : "Two characters minimum to join."}
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ------------------------------------------------------ Create */}
        <section className="panel-raised p-5 sm:p-7" aria-labelledby="create-heading">
          <h2 id="create-heading" className="text-[16px] font-semibold">
            {title ? "Start a party for this title" : "How to start a party"}
          </h2>

          {title ? (
            <div className="mt-5 flex flex-col gap-5 sm:flex-row">
              <div className="w-[120px] shrink-0">
                <Poster title={title} eager />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-relaxed text-mist-400">
                  {title.title} · {title.year ?? "—"} · {title.runtime ?? "–"} min
                </p>
                <p className="mt-1.5 text-[11px] text-mist-600">
                  The room opens on this title. Everything you play, pause or seek is followed
                  by everyone else.
                </p>

                <button
                  type="button"
                  disabled={name.trim().length < 2 || party.status === "connecting"}
                  onClick={() => party.createParty(name.trim(), title.id)}
                  className="btn btn-primary mt-4 w-full sm:w-auto"
                  title={name.trim().length < 2 ? "Add a display name first" : undefined}
                >
                  {party.status === "connecting" ? "Opening room…" : "Create room"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-mist-400">
              <p>
                Open any title, press <span className="text-mist-100">Watch party</span>, and
                you become the host. Or join with a six-character code on the right.
              </p>
              <Link to="/browse" className="btn btn-ghost h-9 text-[12px]">
                Pick something to watch
              </Link>
            </div>
          )}

          {partyError && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-signal/30 bg-signal/8 px-3 py-2 text-[12px] text-signal-soft">
              <Warning size={14} className="mt-0.5 shrink-0" />
              {partyError}
            </p>
          )}
        </section>

        {/* -------------------------------------------------------- Join */}
        <section className="panel p-5 sm:p-7" aria-labelledby="join-heading">
          <h2 id="join-heading" className="text-[16px] font-semibold">
            Join with a code
          </h2>
          <p className="mt-1 text-[12px] text-mist-500">
            Ask the host for the six characters in their room header.
          </p>

          <form onSubmit={onSubmitJoin} className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="party-code"
                className="block text-[12px] font-medium text-mist-300"
              >
                Room code
              </label>
              <input
                id="party-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase().slice(0, 6));
                  setCodeError(null);
                }}
                placeholder="4K7M2Q"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck="false"
                aria-invalid={Boolean(codeError)}
                className="field mt-1.5 font-mono text-[17px] tracking-[0.35em] uppercase"
              />
            </div>

            {codeError && (
              <p className="flex items-start gap-1.5 text-[11.5px] text-signal-soft">
                <Warning size={12} className="mt-0.5 shrink-0" />
                {codeError}
              </p>
            )}

            <button type="submit" className="btn btn-ghost w-full" disabled={checking}>
              {checking ? "Checking…" : "Join room"}
            </button>
          </form>

          <p className="mt-4 border-t border-white/8 pt-4 text-[11px] leading-relaxed text-mist-600">
            Rooms live in the API process memory, cap at 24 people, and close an hour after the
            last person leaves. No account is required.
          </p>
        </section>
      </div>
    </div>
  );
}
