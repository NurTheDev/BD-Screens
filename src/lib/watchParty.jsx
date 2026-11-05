/**
 * @file watchParty.jsx
 * @description Client half of the Watch Party feature.
 *
 * What it does
 *  ------------
 *  - creates or joins a room over WebSocket (`/ws`),
 *  - syncs the room's clock with the server so every screen shows the same frame,
 *  - lets the host drive play/pause/seek while everyone else follows,
 *  - broadcasts reactions and chat,
 *  - reconnects with backoff and re-joins the same room automatically.
 *
 * How the sync actually works
 * ---------------------------
 * Playback state is `{ playing, positionSec, anchoredAt }`, computed as
 *
 *     position = playing ? positionSec + (now + offset - anchoredAt)/1000 : positionSec
 *
 * `offset` is the estimated difference between this browser's clock and the
 * server's, measured with four ping/pong round trips; the sample with the lowest
 * RTT wins because network jitter only ever *adds* delay. That is the entire
 * trick, and it is why the UI can show a real "±x ms" badge instead of claiming
 * to be in sync.
 *
 * Server-side enforcement lives in server/lib/party-hub.js: only the host may
 * send `party:sync`, reactions are token-bucketed, payloads are size-capped.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** @typedef {{ id: string, name: string, isHost: boolean }} Member */
/** @typedef {{ playing: boolean, positionSec: number, anchoredAt: number }} Playback */
/** @typedef {{ id: string, memberId: string, name: string, text: string, at: number }} ChatEntry */

const CLOCK_SAMPLES = 4;
/* Room membership survives a reload for the life of the tab. sessionStorage (not
 * localStorage) on purpose: closing the tab should not silently put you back in
 * someone else's room. */
const SESSION_KEY = "bds:party-session";
const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 15_000;

/** @type {import("react").Context<any>} */
const PartyContext = createContext(null);

/**
 * @param {WebSocket} socket
 * @param {object} payload
 */
function send(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

export function WatchPartyProvider({ children }) {
  const [status, setStatus] = useState(
    /** @type {"idle"|"connecting"|"joined"|"error"} */ ("idle"),
  );
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [party, setParty] = useState(
    /** @type {null | { code: string, titleId: string, hostId: string, clientId: string }} */ (
      null
    ),
  );
  const [members, setMembers] = useState(/** @type {Member[]} */ ([]));
  const [playback, setPlayback] = useState(/** @type {Playback | null} */ (null));
  const [chat, setChat] = useState(/** @type {ChatEntry[]} */ ([]));
  const [notices, setNotices] = useState(
    /** @type {Array<{id: string, text: string, at: number}>} */ ([]),
  );
  /** @type {[Array<{id: string, emoji: string, name: string, at: number}>, Function]} */
  const [reactions, setReactions] = useState([]);
  const [clockOffset, setClockOffset] = useState(0);

  const socketRef = useRef(/** @type {WebSocket | null} */ (null));
  const intentRef = useRef(
    /** @type {{ mode: "create" | "join", code?: string, name: string, titleId?: string } | null} */ (
      null
    ),
  );
  const attemptsRef = useRef(0);
  const reconnectTimer = useRef(/** @type {any} */ (null));
  const offsetRef = useRef(0);

  /** Push a transient notice (join/leave/handover). */
  const addNotice = useCallback((/** @type {string} */ text) => {
    const entry = { id: crypto.randomUUID(), text, at: Date.now() };
    setNotices((current) => [...current.slice(-4), entry]);
    setTimeout(() => {
      setNotices((current) => current.filter((item) => item.id !== entry.id));
    }, 6000);
  }, []);

  /** Measure clock offset with N round trips; keep the lowest-RTT sample. */
  const measureClock = useCallback((/** @type {WebSocket} */ socket) => {
    let bestRtt = Infinity;
    let bestOffset = 0;
    let received = 0;

    const onPong = (/** @type {MessageEvent} */ event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type !== "pong" || !message.t) return;

        const rtt = Date.now() - message.t;
        // Assume symmetric latency: server time ≈ midpoint of the round trip.
        const offset = message.serverTime + rtt / 2 - Date.now();
        if (rtt < bestRtt) {
          bestRtt = rtt;
          bestOffset = offset;
        }

        received += 1;
        if (received >= CLOCK_SAMPLES) {
          socket.removeEventListener("message", onPong);
          offsetRef.current = bestOffset;
          setClockOffset(bestOffset);
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    socket.addEventListener("message", onPong);
    for (let i = 0; i < CLOCK_SAMPLES; i += 1) {
      setTimeout(() => send(socket, { type: "party:ping", t: Date.now() }), i * 180);
    }
  }, []);

  /** @param {WebSocket} socket */
  const handleMessage = useCallback(
    (socket, /** @type {MessageEvent} */ event) => {
      /** @type {any} */
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (message.type) {
        case "party:joined":
          setParty({
            code: message.code,
            titleId: message.titleId,
            hostId: message.hostId,
            clientId: message.clientId,
          });
          setPlayback(message.playback);
          setMembers(message.members ?? []);
          setChat(message.chat ?? []);
          setStatus("joined");
          setError(null);
          setPlayback(message.playback);
          // Keep the room for this tab so a refresh does not drop the user out.
          try {
            sessionStorage.setItem(
              SESSION_KEY,
              JSON.stringify({
                code: message.code,
                titleId: message.titleId,
                name: intentRef.current?.name ?? "Guest",
              }),
            );
          } catch {
            /* ignore */
          }
          break;

        case "party:members":
          setMembers(message.members ?? []);
          setParty((current) =>
            current
              ? {
                  ...current,
                  hostId:
                    (message.members ?? []).find((/** @type {Member} */ m) => m.isHost)?.id ??
                    current.hostId,
                }
              : current,
          );
          break;

        case "party:state":
          setPlayback(message.playback);
          break;

        case "party:chat":
          setChat((current) => [...current, message.message].slice(-60));
          break;

        case "party:reaction": {
          const entry = {
            id: crypto.randomUUID(),
            emoji: message.emoji,
            name: message.name,
            at: Date.now(),
          };
          setReactions((current) => [...current.slice(-24), entry]);
          setTimeout(() => {
            setReactions((current) => current.filter((item) => item.id !== entry.id));
          }, 4200);
          break;
        }

        case "party:notice":
          addNotice(message.message);
          break;

        case "error":
          setError(message.message);
          break;

        default:
          break;
      }
    },
    [addNotice],
  );

  const connect = useCallback(() => {
    const intent = intentRef.current;
    if (!intent) return;

    setStatus("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      attemptsRef.current = 0;
      measureClock(socket);
      if (intent.mode === "create") {
        send(socket, { type: "party:create", name: intent.name, titleId: intent.titleId });
      } else {
        send(socket, { type: "party:join", code: intent.code, name: intent.name });
      }
    });

    socket.addEventListener("message", (event) => handleMessage(socket, event));

    socket.addEventListener("close", () => {
      if (intentRef.current && status !== "idle") {
        // Exponential backoff with a ceiling: a flaky phone connection re-joins
        // without hammering the server or burning battery.
        attemptsRef.current += 1;
        const delay = Math.min(
          RECONNECT_MAX_MS,
          RECONNECT_BASE_MS * 2 ** (attemptsRef.current - 1),
        );
        reconnectTimer.current = setTimeout(connect, delay);
      }
    });

    socket.addEventListener("error", () => {
      setError("Could not reach the watch party server.");
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleMessage, measureClock]);

  const lastRoom = useCallback(() => {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    } catch {
      return null;
    }
  }, []);

  const createParty = useCallback(
    (/** @type {string} */ name, /** @type {string} */ titleId) => {
      intentRef.current = { mode: "create", name, titleId };
      setChat([]);
      setMembers([]);
      connect();
    },
    [connect],
  );

  const joinParty = useCallback(
    (/** @type {string} */ code, /** @type {string} */ name) => {
      intentRef.current = { mode: "join", code: code.toUpperCase(), name };
      setChat([]);
      setMembers([]);
      connect();
    },
    [connect],
  );

  const leaveParty = useCallback(() => {
    intentRef.current = null;
    clearTimeout(reconnectTimer.current);
    const socket = socketRef.current;
    if (socket) {
      send(socket, { type: "party:leave" });
      socket.close(1000, "left");
    }
    socketRef.current = null;
    setParty(null);
    setPlayback(null);
    setMembers([]);
    setChat([]);
    setStatus("idle");
    setError(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /**
   * Re-enter the room this tab was in, if any. Called by the watch page on mount.
   * Returns true when a rejoin was attempted.
   * @param {string} [titleId] only rejoin when it is the same title
   */
  const resumeParty = useCallback(
    (titleId) => {
      if (intentRef.current || socketRef.current) return false;
      const saved = lastRoom();
      if (!saved?.code || !saved?.name) return false;
      if (titleId && saved.titleId && saved.titleId !== titleId) return false;
      intentRef.current = { mode: "join", code: saved.code, name: saved.name };
      connect();
      return true;
    },
    [connect, lastRoom],
  );

  const syncPlayback = useCallback(
    (/** @type {{ playing: boolean, positionSec: number }} */ state) => {
      const socket = socketRef.current;
      if (!socket) return;
      send(socket, { type: "party:sync", ...state });
    },
    [],
  );

  const sendReaction = useCallback((/** @type {string} */ emoji) => {
    const socket = socketRef.current;
    if (socket) send(socket, { type: "party:reaction", emoji });
  }, []);

  const sendChat = useCallback((/** @type {string} */ text) => {
    const socket = socketRef.current;
    const trimmed = text.trim();
    if (!socket || trimmed.length === 0) return;
    send(socket, { type: "party:chat", text: trimmed });
  }, []);

  const handover = useCallback((/** @type {string} */ memberId) => {
    const socket = socketRef.current;
    if (socket) send(socket, { type: "party:handover", memberId });
  }, []);

  /**
   * Current playback position, corrected for network latency.
   * @returns {number}
   */
  const currentPosition = useCallback(() => {
    if (!playback) return 0;
    if (!playback.playing) return playback.positionSec;
    const serverNow = Date.now() + offsetRef.current;
    return Math.max(0, playback.positionSec + (serverNow - playback.anchoredAt) / 1000);
  }, [playback]);

  useEffect(
    () => () => {
      clearTimeout(reconnectTimer.current);
      intentRef.current = null;
      socketRef.current?.close();
    },
    [],
  );

  const isHost = Boolean(party && party.clientId === party.hostId);

  const value = useMemo(
    () => ({
      status,
      error,
      clearError: () => setError(null),
      party,
      members,
      playback,
      chat,
      notices,
      reactions,
      clockOffset,
      isHost,
      createParty,
      joinParty,
      leaveParty,
      syncPlayback,
      sendReaction,
      sendChat,
      handover,
      currentPosition,
      resumeParty,
    }),
    [
      status,
      error,
      party,
      members,
      playback,
      chat,
      notices,
      reactions,
      clockOffset,
      isHost,
      createParty,
      joinParty,
      leaveParty,
      syncPlayback,
      sendReaction,
      sendChat,
      handover,
      currentPosition,
      resumeParty,
    ],
  );

  return <PartyContext.Provider value={value}>{children}</PartyContext.Provider>;
}

export function useWatchParty() {
  const context = useContext(PartyContext);
  if (!context) throw new Error("useWatchParty must be used inside <WatchPartyProvider>");
  return context;
}
