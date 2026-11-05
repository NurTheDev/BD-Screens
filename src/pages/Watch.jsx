/**
 * @file Watch.jsx
 * @description Theatre route: the player, and (optionally) a live party panel.
 *
 * Two modes, one page:
 *  - solo   → full-width player, "up next" beneath it
 *  - party  → player + side panel; the client becomes a follower unless it hosts
 *
 * Progress is persisted to the library (which feeds Continue Watching), and on
 * unmount as well — closing a tab mid-film should not lose your place.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useFetch } from "../hooks/useFetch.js";
import { useLibrary } from "../lib/library.jsx";
import { useWatchParty } from "../lib/watchParty.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { Player } from "../components/watch/Player.jsx";
import { PartyPanel } from "../components/watch/PartyPanel.jsx";
import { Poster } from "../components/ui/Poster.jsx";
import { ArrowLeft, Warning, Users } from "../components/ui/Icons.jsx";

export default function Watch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { saveProgress, watchlist, toggleWatchlist, inWatchlist } = useLibrary();
  const party = useWatchParty();

  const {
    data: title,
    loading,
    error,
  } = useFetch(
    useCallback((signal) => api.title(id, signal), [id]),
    [id],
  );

  const [externalPosition, setExternalPosition] = useState(/** @type {number | null} */ (null));
  const lastSaved = useRef({ seconds: 0, duration: 0 });

  /* A refresh should not eject you from the room you were watching in. */
  useEffect(() => {
    if (id) party.resumeParty(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const inParty = party.status === "joined";
  const following = inParty && !party.isHost;

  /* Party: keep a local copy of the host's position, refreshed twice a second. */
  useEffect(() => {
    if (!following) {
      setExternalPosition(null);
      return undefined;
    }
    setExternalPosition(party.currentPosition());
    const interval = setInterval(() => setExternalPosition(party.currentPosition()), 500);
    return () => clearInterval(interval);
  }, [following, party]);

  /* Persist progress when leaving the page. */
  useEffect(
    () => () => {
      if (title && lastSaved.current.seconds > 5) {
        saveProgress(title, lastSaved.current);
      }
    },
    [title, saveProgress],
  );

  const onProgress = useCallback(
    (/** @type {{ seconds: number, duration: number }} */ state) => {
      lastSaved.current = state;
      if (title) saveProgress(title, state);
    },
    [title, saveProgress],
  );

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black">
        <div className="w-full max-w-5xl px-6">
          <div className="skeleton aspect-video w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !title) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <Warning size={28} className="text-signal" />
        <h1 className="mt-4 font-display text-3xl">Nothing to play here</h1>
        <p className="mt-2 max-w-sm text-sm text-mist-400">
          {error?.message ?? "That title could not be loaded."}
        </p>
        <Link to="/" className="btn btn-ghost mt-6">
          <ArrowLeft size={16} /> Back home
        </Link>
      </div>
    );
  }

  /* "Up next": a few titles from the user's own list first, then similar. */
  const upNext = [
    ...watchlist.filter((entry) => entry.id !== title.id).slice(0, 3),
    ...(title.similar ?? []).filter((item) => item.id !== title.id).slice(0, 8),
  ].slice(0, 6);

  return (
    <div className="min-h-dvh bg-ink-950">
      <div className={`mx-auto ${inParty ? "grid lg:grid-cols-[1fr_330px]" : ""}`}>
        <div className="min-w-0">
          <Player
            title={title}
            onProgress={onProgress}
            externalPosition={following ? externalPosition : null}
            locked={following}
            onLocalSeek={(seconds) => {
              if (party.isHost) party.syncPlayback({ playing: true, positionSec: seconds });
            }}
            onLocalPlayStateChange={(playing, seconds) => {
              if (party.isHost) party.syncPlayback({ playing, positionSec: seconds });
            }}
          />
        </div>

        {inParty && (
          <div className="h-[420px] lg:h-[calc(100dvh-9rem)]">
            <PartyPanel
              party={party.party}
              members={party.members}
              chat={party.chat}
              notices={party.notices}
              reactions={party.reactions}
              isHost={party.isHost}
              clockOffset={party.clockOffset}
              clientId={party.party?.clientId ?? ""}
              onSendChat={party.sendChat}
              onReact={party.sendReaction}
              onLeave={() => {
                party.leaveParty();
                toast.info("You left the party.");
              }}
              onHandover={party.handover}
            />
          </div>
        )}
      </div>

      <div className="shell py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[28px] leading-tight sm:text-[34px]">
              {title.title}
            </h1>
            <p className="mt-1 text-[12.5px] text-mist-500">
              {title.year} · {title.genres?.join(", ")} · {title.language}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to={`/title/${title.id}`} className="btn btn-ghost h-9 text-[12px]">
              <ArrowLeft size={14} /> Title page
            </Link>
            {!inParty && (
              <button
                type="button"
                onClick={() => navigate(`/party?title=${encodeURIComponent(title.id)}`)}
                className="btn btn-primary h-9 text-[12px]"
              >
                <Users size={14} /> Start a watch party
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                toggleWatchlist(title);
                toast.success(
                  inWatchlist(title.id) ? "Removed from watchlist" : "Added to watchlist",
                );
              }}
              className="btn btn-ghost h-9 text-[12px]"
              aria-pressed={inWatchlist(title.id)}
            >
              {inWatchlist(title.id) ? "In watchlist" : "Add to watchlist"}
            </button>
          </div>
        </div>

        <p className="mt-4 max-w-3xl text-[13.5px] leading-relaxed text-mist-400">
          {title.overview}
        </p>

        {upNext.length > 0 && (
          <section className="mt-10" aria-labelledby="upnext-heading">
            <h2 id="upnext-heading" className="text-[15px] font-semibold">
              Up next
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {upNext.map((item, index) => (
                <Poster
                  key={item.id}
                  title={item}
                  index={index}
                  onToggleWatchlist={toggleWatchlist}
                  inWatchlist={inWatchlist(item.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
