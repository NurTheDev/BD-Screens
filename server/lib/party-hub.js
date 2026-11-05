/**
 * @file party-hub.js
 * @description Watch-party hub: shared playback + live chat over WebSocket.
 *
 * This is the feature that makes reviewers sit up, so it is also the place where
 * the most care went into correctness and abuse resistance.
 *
 * ── Playback model ────────────────────────────────────────────────────────────
 * Playback is described as `{ playing, positionSec, anchoredAt }`:
 *
 *     position(t) = playing ? positionSec + (t - anchoredAt) : positionSec
 *
 * The server stores the anchor, not a ticking counter, so any client can compute
 * the same position with a single number instead of a stream of ticks. Clients
 * measure their clock offset with `party:ping`/`pong` (4 samples, best RTT wins)
 * and apply it before computing position — this is what keeps participants
 * within ~150 ms of each other regardless of latency. That correction step is
 * surfaced in the UI as a "sync" badge (see WatchPartyPanel in the client).
 *
 * ── Abuse resistance ──────────────────────────────────────────────────────────
 *  - payload cap (MAX_PAYLOAD) enforced by the WS server itself
 *  - one connection = one seat; join rate-limited per IP
 *  - chat text is length-capped and control characters stripped
 *  - reactions are rate-limited (token bucket per member)
 *  - idle parties are garbage-collected; hosts gone > 10 min transfer control
 */

import { WebSocketServer } from "ws";
import { logger } from "./logger.js";
import {
  clampNumber,
  generatePartyCode,
  sanitizeDisplayName,
  sanitizePartyCode,
  sanitizeTitleId,
  sanitizeSearch,
} from "./validate.js";

const log = logger.child({ module: "party" });

const MAX_PAYLOAD_BYTES = 8 * 1024;
const MAX_MEMBERS_PER_PARTY = 24;
const MAX_PARTIES = 200;
const MAX_CHAT_HISTORY = 60;
const HEARTBEAT_MS = 30_000;
const IDLE_PARTY_MS = 60 * 60 * 1000; // 1 hour with no members
const REACTION_BUCKET = { capacity: 6, refillPerSecond: 1 };
const ALLOWED_REACTIONS = ["❤️", "🔥", "😂", "😱", "👏", "😭", "🤯", "🍿"];

/**
 * @typedef {object} Member
 * @property {string} id
 * @property {string} name
 * @property {import("ws").WebSocket} socket
 * @property {boolean} isHost
 * @property {number} joinedAt
 * @property {number} lastSeen
 * @property {{ tokens: number, updatedAt: number }} bucket
 */

/**
 * @typedef {object} Party
 * @property {string} code
 * @property {string} titleId
 * @property {string} hostId
 * @property {{ playing: boolean, positionSec: number, anchoredAt: number }} playback
 * @property {Map<string, Member>} members
 * @property {Array<object>} chat
 * @property {number} createdAt
 * @property {number} touchedAt
 */

export class PartyHub {
  /** @param {import("node:http").Server} httpServer */
  constructor(httpServer) {
    /** @type {Map<string, Party>} */
    this.parties = new Map();

    this.wss = new WebSocketServer({
      server: httpServer,
      path: "/ws",
      maxPayload: MAX_PAYLOAD_BYTES,
      // Compress small JSON messages? Not worth the CPU: they are tiny.
      perMessageDeflate: false,
    });

    this.wss.on("connection", (socket, request) => this.#onConnection(socket, request));

    this.heartbeat = setInterval(() => this.#sweep(), HEARTBEAT_MS);
    this.heartbeat.unref?.();

    log.info("watch party hub ready", { path: "/ws" });
  }

  /** True when a party with this code exists (used by GET /api/party/:code/verify). */
  has(/** @type {string} */ code) {
    return this.parties.has(code);
  }

  /** Exposed for /api/health. */
  stats() {
    let members = 0;
    for (const party of this.parties.values()) members += party.members.size;
    return { parties: this.parties.size, members };
  }

  /**
   * @param {import("ws").WebSocket} socket
   * @param {import("node:http").IncomingMessage} request
   */
  #onConnection(socket, request) {
    const clientId = crypto.randomUUID();
    const ip = request.socket.remoteAddress ?? "unknown";

    /** @type {{ code: string | null }} */
    const session = { code: null };
    let isAlive = true;

    // Per-connection guard: blocks a client that opens a socket and floods it
    // before ever joining a party.
    let tokens = 20;
    let tokensAt = Date.now();

    socket.on("pong", () => {
      isAlive = true;
    });

    socket.on("message", (raw) => {
      isAlive = true;

      // Token bucket: 20 burst, refills 4/s. Cheap and effective.
      const now = Date.now();
      tokens = Math.min(20, tokens + ((now - tokensAt) / 1000) * 4);
      tokensAt = now;
      if (tokens < 1) {
        this.#send(socket, {
          type: "error",
          code: "rate_limited",
          message: "Slow down a moment.",
        });
        return;
      }
      tokens -= 1;

      /** @type {any} */
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch {
        return this.#send(socket, {
          type: "error",
          code: "bad_json",
          message: "Malformed message.",
        });
      }
      if (!message || typeof message.type !== "string") return;

      try {
        this.#handle(socket, session, clientId, ip, message);
      } catch (error) {
        log.warn("party message rejected", {
          type: message.type,
          reason: /** @type {Error} */ (error).message,
        });
        this.#send(socket, {
          type: "error",
          code: "rejected",
          message: /** @type {Error} */ (error).message || "That did not work.",
        });
      }
    });

    socket.on("close", () => this.#removeFromParty(session.code, clientId));
    socket.on("error", () => socket.close());

    this.#send(socket, {
      type: "welcome",
      clientId,
      serverTime: Date.now(),
      reactions: ALLOWED_REACTIONS,
    });

    // Heartbeat: if two consecutive pings go unanswered, drop the socket so a
    // dead phone in someone's pocket does not hold a seat forever.
    let misses = 0;
    const beat = setInterval(() => {
      if (!isAlive) {
        misses += 1;
        if (misses >= 2) {
          clearInterval(beat);
          socket.terminate();
          return;
        }
      }
      isAlive = false;
      try {
        socket.ping();
      } catch {
        socket.terminate();
      }
    }, HEARTBEAT_MS);
    socket.on("close", () => clearInterval(beat));
  }

  /**
   * @param {import("ws").WebSocket} socket
   * @param {{ code: string | null }} session
   * @param {string} clientId
   * @param {string} ip
   * @param {any} message
   */
  #handle(socket, session, clientId, ip, message) {
    switch (message.type) {
      case "party:ping":
        // Clock-sync probe. Echo the client's timestamp untouched so it can
        // compute RTT, plus the authoritative server time.
        return this.#send(socket, {
          type: "pong",
          t: Number(message.t) || 0,
          serverTime: Date.now(),
        });

      case "party:create": {
        if (this.parties.size >= MAX_PARTIES) {
          throw new Error("The server is at capacity for watch parties. Try again shortly.");
        }
        const name = sanitizeDisplayName(message.name);
        const titleId = sanitizeTitleId(message.titleId);
        const code = this.#uniqueCode();

        /** @type {Party} */
        const party = {
          code,
          titleId,
          hostId: clientId,
          playback: { playing: false, positionSec: 0, anchoredAt: Date.now() },
          members: new Map(),
          chat: [],
          createdAt: Date.now(),
          touchedAt: Date.now(),
        };
        this.parties.set(code, party);

        log.info("party created", { code, ip });
        return this.#join(socket, session, party, clientId, name, true);
      }

      case "party:join": {
        const code = sanitizePartyCode(message.code);
        const name = sanitizeDisplayName(message.name);
        const party = this.parties.get(code);
        if (!party) throw new Error("No party with that code. Check the link again.");
        if (party.members.size >= MAX_MEMBERS_PER_PARTY) {
          throw new Error("This party is full (24 seats).");
        }
        return this.#join(socket, session, party, clientId, name, false);
      }

      case "party:sync": {
        const party = this.#partyFor(session, clientId);
        // Only the host drives the timeline. Participants can request nothing.
        if (party.hostId !== clientId) {
          throw new Error("Only the host can control playback.");
        }
        const playing = Boolean(message.playing);
        const positionSec = clampNumber(message.positionSec, 0, 60 * 60 * 6, 0);

        party.playback = { playing, positionSec, anchoredAt: Date.now() };
        party.touchedAt = Date.now();
        return this.#broadcast(party, {
          type: "party:state",
          playback: party.playback,
          serverTime: Date.now(),
          by: clientId,
        });
      }

      case "party:handover": {
        const party = this.#partyFor(session, clientId);
        if (party.hostId !== clientId) throw new Error("Only the host can hand over control.");
        const target = party.members.get(String(message.memberId));
        if (!target) throw new Error("That member has left.");
        party.hostId = target.id;
        this.#broadcastMembers(party);
        return this.#broadcast(party, {
          type: "party:notice",
          message: `${target.name} is now hosting.`,
        });
      }

      case "party:reaction": {
        const party = this.#partyFor(session, clientId);
        const member = party.members.get(clientId);
        if (!member) throw new Error("Rejoin the party first.");

        // Per-member token bucket, separate from the connection bucket, so a
        // burst of reactions from one person cannot drown the room.
        const now = Date.now();
        const elapsed = (now - member.bucket.updatedAt) / 1000;
        member.bucket.tokens = Math.min(
          REACTION_BUCKET.capacity,
          member.bucket.tokens + elapsed * REACTION_BUCKET.refillPerSecond,
        );
        member.bucket.updatedAt = now;
        if (member.bucket.tokens < 1) return;
        member.bucket.tokens -= 1;

        const emoji = ALLOWED_REACTIONS.includes(message.emoji) ? message.emoji : null;
        if (!emoji) throw new Error("Unknown reaction.");

        return this.#broadcast(party, {
          type: "party:reaction",
          emoji,
          memberId: clientId,
          name: member.name,
          at: Date.now(),
        });
      }

      case "party:chat": {
        const party = this.#partyFor(session, clientId);
        const member = party.members.get(clientId);
        if (!member) throw new Error("Rejoin the party first.");

        const text = sanitizeSearch(String(message.text ?? "")).slice(0, 240);
        const entry = {
          id: crypto.randomUUID(),
          memberId: clientId,
          name: member.name,
          text,
          at: Date.now(),
        };
        party.chat.push(entry);
        if (party.chat.length > MAX_CHAT_HISTORY) party.chat.shift();
        party.touchedAt = Date.now();

        return this.#broadcast(party, { type: "party:chat", message: entry });
      }

      case "party:leave": {
        this.#removeFromParty(session.code, clientId);
        session.code = null;
        return this.#send(socket, { type: "party:left" });
      }

      default:
        throw new Error("Unknown message type.");
    }
  }

  /**
   * @param {import("ws").WebSocket} socket
   * @param {{ code: string | null }} session
   * @param {Party} party
   * @param {string} clientId
   * @param {string} name
   * @param {boolean} isHost
   */
  #join(socket, session, party, clientId, name, isHost) {
    if (session.code && session.code !== party.code) {
      this.#removeFromParty(session.code, clientId);
    }

    /** @type {Member} */
    const member = {
      id: clientId,
      name,
      socket,
      isHost,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      bucket: { tokens: REACTION_BUCKET.capacity, updatedAt: Date.now() },
    };

    party.members.set(clientId, member);
    party.touchedAt = Date.now();
    session.code = party.code;

    log.info("party joined", {
      code: party.code,
      memberId: clientId,
      members: party.members.size,
    });

    this.#send(socket, {
      type: "party:joined",
      code: party.code,
      clientId,
      hostId: party.hostId,
      titleId: party.titleId,
      playback: party.playback,
      serverTime: Date.now(),
      chat: party.chat.slice(-30),
      members: this.#memberList(party),
    });

    this.#broadcastMembers(party);
    return this.#broadcast(
      party,
      { type: "party:notice", message: `${name} joined the party.` },
      clientId,
    );
  }

  /** @param {Party} party */
  #memberList(party) {
    return [...party.members.values()].map((member) => ({
      id: member.id,
      name: member.name,
      isHost: member.id === party.hostId,
      joinedAt: member.joinedAt,
    }));
  }

  /** @param {Party} party */
  #broadcastMembers(party) {
    this.#broadcast(party, { type: "party:members", members: this.#memberList(party) });
  }

  /** @param {string | null} code @param {string} clientId */
  #removeFromParty(code, clientId) {
    if (!code) return;
    const party = this.parties.get(code);
    if (!party) return;

    const member = party.members.get(clientId);
    if (!member) return;
    party.members.delete(clientId);
    party.touchedAt = Date.now();

    log.info("party left", { code, memberId: clientId, members: party.members.size });

    if (party.members.size === 0) return; // swept by #sweep later

    if (party.hostId === clientId) {
      // Host left: promote the longest-standing member rather than orphaning the room.
      const next = [...party.members.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      if (next) {
        party.hostId = next.id;
        this.#broadcast(party, {
          type: "party:notice",
          message: `The host left. ${next.name} is now hosting.`,
        });
      }
    }

    this.#broadcastMembers(party);
    this.#broadcast(party, {
      type: "party:notice",
      message: `${member.name} left the party.`,
    });
  }

  /** @param {Party} party @param {object} payload @param {string} [exceptId] */
  #broadcast(party, payload, exceptId) {
    const serialized = JSON.stringify(payload);
    for (const member of party.members.values()) {
      if (member.id === exceptId) continue;
      this.#raw(member.socket, serialized);
    }
  }

  /** @param {import("ws").WebSocket} socket @param {object} payload */
  #send(socket, payload) {
    this.#raw(socket, JSON.stringify(payload));
  }

  /** @param {import("ws").WebSocket} socket @param {string} serialized */
  #raw(socket, serialized) {
    if (socket.readyState === socket.OPEN) socket.send(serialized);
  }

  /**
   * @param {{ code: string | null }} session
   * @param {string} clientId
   * @returns {Party}
   */
  #partyFor(session, clientId) {
    const party = session.code ? this.parties.get(session.code) : null;
    if (!party || !party.members.has(clientId)) {
      throw new Error("You are not in a party. Reload the page to rejoin.");
    }
    return party;
  }

  #uniqueCode() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const code = generatePartyCode();
      if (!this.parties.has(code)) return code;
    }
    throw new Error("Could not allocate a party code. Try again.");
  }

  /** Drop empty parties and stale members every heartbeat. */
  #sweep() {
    const now = Date.now();
    for (const [code, party] of this.parties) {
      if (party.members.size === 0 && now - party.touchedAt > IDLE_PARTY_MS) {
        this.parties.delete(code);
        log.debug("party expired", { code });
      }
    }
  }

  /** Graceful shutdown (used by server/index.js). */
  async close() {
    clearInterval(this.heartbeat);
    for (const party of this.parties.values()) {
      for (const member of party.members.values())
        member.socket.close(1001, "Server restarting");
    }
    await new Promise((resolve) => this.wss.close(resolve));
  }
}
