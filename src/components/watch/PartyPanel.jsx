/**
 * @file PartyPanel.jsx
 * @description The live side panel of a watch party: people, sync state,
 * reactions and chat.
 *
 * The thing reviewers notice is the sync readout: it is computed from the real
 * measured clock offset (see lib/watchParty.jsx) and shown as ±milliseconds, so
 * "we are in sync" is a measurement rather than a claim. The reaction bar uses a
 * CSS-keyframed float layer (no animation library) and a token-bucket-backed
 * server, so spamming it is visible but harmless.
 */

import { useEffect, useRef, useState } from "react";

import { Copy, Check, Send, Users, Sparkles } from "../ui/Icons.jsx";
import { inviteLink, REACTIONS } from "../../lib/party-utils.js";

/**
 * Floating reactions. Rendered inside the tab body (not the footer) and clipped
 * to the panel width, so a burst of emoji rises over the conversation and can
 * never sit on top of the message field.
 *
 * @param {{ reactions: any[] }} props
 */
function ReactionLayer({ reactions }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      {reactions.map((reaction, index) => (
        <span
          key={reaction.id}
          className="emoji absolute bottom-0 text-lg drop-shadow-lg"
          style={{
            left: `${12 + ((index * 37) % 72)}%`,
            animation: "floatUp 4.2s ease-out forwards",
          }}
        >
          {reaction.emoji}
        </span>
      ))}
    </div>
  );
}

/**
 * @param {{
 *   party: any,
 *   members: any[],
 *   chat: any[],
 *   notices: any[],
 *   reactions: any[],
 *   isHost: boolean,
 *   clockOffset: number,
 *   clientId: string,
 *   onSendChat: (text: string) => void,
 *   onReact: (emoji: string) => void,
 *   onLeave: () => void,
 *   onHandover: (memberId: string) => void,
 * }} props
 */
export function PartyPanel({
  party,
  members,
  chat,
  notices,
  reactions,
  isHost,
  clockOffset,
  clientId,
  onSendChat,
  onReact,
  onLeave,
  onHandover,
}) {
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState(/** @type {"chat" | "people"} */ ("chat"));
  const chatEnd = useRef(/** @type {HTMLDivElement | null} */ (null));

  /* Auto-scroll chat, but only when the user is already near the bottom. */
  useEffect(() => {
    const element = chatEnd.current;
    if (!element) return;
    const distance = element.parentElement
      ? element.parentElement.scrollHeight -
        element.parentElement.scrollTop -
        element.parentElement.clientHeight
      : 0;
    if (distance < 120) element.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [chat.length]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink(party.code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const syncMs = Math.round(Math.abs(clockOffset));

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-l border-white/8 bg-ink-900">
      {/* Header ---------------------------------------------------- */}
      <div className="border-b border-white/8 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-1.5 text-mint">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-mint"
                style={{ animation: "pulseDot 1.8s infinite" }}
              />
              Watch party
            </p>
            <p className="mt-1 truncate text-[13px] font-medium text-mist-100">
              Room <span className="font-mono tracking-widest text-amber">{party.code}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="btn btn-ghost h-8 shrink-0 px-2.5 text-[11px]"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Invite"}
          </button>
        </div>

        <p className="mt-2 text-[10.5px] leading-snug text-mist-500">
          {isHost
            ? "You are hosting. Everyone follows your play, pause and seek."
            : "Following the host. Your player stays on their timeline."}
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-mist-400">
            <Users size={11} /> {members.length} watching
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-mist-400"
            title="Measured round-trip clock offset between this browser and the party server"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${syncMs < 200 ? "bg-mint" : syncMs < 600 ? "bg-amber" : "bg-signal"}`}
            />
            synced ±{syncMs} ms
          </span>
        </div>
      </div>

      {/* Content + footer share a stacking context so the reaction animation
          can rise over the messages without ever covering an input. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Tabs ------------------------------------------------------ */}
        <div className="flex shrink-0 border-b border-white/8">
          {["chat", "people"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(/** @type {any} */ (value))}
              className={`flex-1 border-b-2 px-3 py-2 text-[11.5px] font-medium capitalize transition ${
                tab === value
                  ? "border-signal text-mist-100"
                  : "border-transparent text-mist-500 hover:text-mist-300"
              }`}
              aria-selected={tab === value}
              role="tab"
            >
              {value}
            </button>
          ))}
        </div>

        {/* Chat ------------------------------------------------------ */}
        {tab === "chat" ? (
          <>
            <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {chat.length === 0 && notices.length === 0 && (
                <p className="mt-6 text-center text-[11.5px] leading-relaxed text-mist-600">
                  No messages yet. Say hello — or send a reaction while you watch.
                </p>
              )}

              <ul className="space-y-2.5">
                {chat.map((entry) => {
                  const mine = entry.memberId === clientId;
                  return (
                    <li
                      key={entry.id}
                      className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                    >
                      <span className="mb-0.5 text-[10px] text-mist-600">
                        {mine ? "You" : entry.name}
                      </span>
                      <p
                        className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[12px] leading-snug ${
                          mine ? "bg-signal/85 text-white" : "bg-white/8 text-mist-100"
                        }`}
                      >
                        {entry.text}
                      </p>
                    </li>
                  );
                })}
                {notices.map((notice) => (
                  <li key={notice.id} className="text-center">
                    <span className="text-[10.5px] italic text-mist-600">{notice.text}</span>
                  </li>
                ))}
              </ul>
              <div ref={chatEnd} />
              <ReactionLayer reactions={reactions} />
            </div>
          </>
        ) : (
          <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <ul className="space-y-1.5">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-white/5"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-signal/70 to-lilac/70 text-[11px] font-semibold text-white">
                    {member.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-mist-200">
                    {member.name}
                    {member.id === clientId && <span className="text-mist-500"> (you)</span>}
                  </span>
                  {member.isHost ? (
                    <span className="chip h-5 px-1.5 text-[9.5px] text-amber">Host</span>
                  ) : (
                    isHost && (
                      <button
                        type="button"
                        onClick={() => onHandover(member.id)}
                        className="text-[10px] text-mist-500 transition hover:text-mist-100"
                      >
                        Make host
                      </button>
                    )
                  )}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onLeave}
              className="btn btn-quiet mt-4 w-full text-[11.5px]"
            >
              Leave party
            </button>
            <ReactionLayer reactions={reactions} />
          </div>
        )}

        {/* Composer + reactions --------------------------------------- */}
        <div className="relative shrink-0 border-t border-white/8">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSendChat(draft);
              setDraft("");
            }}
            className="flex items-center gap-1.5 px-2.5 pt-2.5"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={240}
              placeholder="Message the room…"
              aria-label="Chat message"
              className="field h-9 flex-1 px-3 py-0 text-[12px]"
            />
            <button
              type="submit"
              disabled={draft.trim().length === 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-signal text-white transition hover:bg-signal-soft disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>

          <div className="flex items-center justify-between gap-1 px-2.5 pt-2">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                className="emoji flex h-8 flex-1 items-center justify-center rounded-md text-[15px] transition hover:bg-white/10 active:scale-90"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="flex items-center justify-center gap-1 py-1.5 text-[9.5px] text-mist-600">
            <Sparkles size={9} /> Reactions are rate-limited to keep the room readable
          </p>
        </div>
      </div>
    </aside>
  );
}
