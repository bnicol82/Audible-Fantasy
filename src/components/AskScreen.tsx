"use client";

import { useEffect, useRef, useState } from "react";
import type { AppPhase } from "@/lib/app-phase";
import {
  buildLeagueChatContext,
  demoLeagueChatContext,
  type LeagueChatContext,
} from "@/lib/leagues/context";
import { streamChatResponse, type ChatMessage } from "@/lib/chat/stream";
import {
  clearStoredConversationId,
  getOrCreateProfileId,
  getStoredConversationId,
  setStoredConversationId,
} from "@/lib/session";
import { Markdown } from "./Markdown";
import { AppHead, Hash } from "./ui";

const IN_SEASON_SUGGESTIONS = [
  "Who should I start at flex?",
  "Is my RB1 playing this week?",
  "Rank my starters",
  "Who should I drop?",
];

const DRAFT_SUGGESTIONS = [
  "Who should I pick at 1.04?",
  "RB or WR in round 2?",
  "Compare Bijan vs Gibbs for me",
  "What positions should I target next?",
];

export function AskScreen({
  leagueId,
  appPhase = "in_season",
  initialMessage,
}: {
  leagueId: string | null;
  appPhase?: AppPhase;
  initialMessage?: string;
}) {
  const isDraftMode = appPhase === "draft";
  const [context, setContext] = useState<LeagueChatContext>(
    demoLeagueChatContext(appPhase)
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const initialMessageSent = useRef(false);
  const suggestions = isDraftMode ? DRAFT_SUGGESTIONS : IN_SEASON_SUGGESTIONS;

  useEffect(() => {
    if (!leagueId) {
      setContext(demoLeagueChatContext(appPhase));
      return;
    }

    const activeLeagueId = leagueId;
    let cancelled = false;

    async function loadContext() {
      try {
        const profileId = getOrCreateProfileId();
        const res = await fetch(
          `/api/leagues/active?profileId=${encodeURIComponent(profileId)}&leagueId=${encodeURIComponent(activeLeagueId)}`
        );
        const json = await res.json();
        if (!cancelled && res.ok && json.league) {
          const nextContext = buildLeagueChatContext(json.league);
          setContext(
            appPhase === "draft" ? { ...nextContext, phase: "draft" } : nextContext
          );
        }
      } catch {
        // Keep demo context
      }
    }

    loadContext();
    return () => {
      cancelled = true;
    };
  }, [leagueId, appPhase]);

  // Restore the stored conversation for this league (if any) so a reload doesn't wipe
  // history — the server is the source of truth for messages now.
  useEffect(() => {
    let cancelled = false;
    const storedId = getStoredConversationId(leagueId);
    setConversationId(storedId);
    setMessages([]);

    if (!storedId) return;

    async function loadHistory() {
      try {
        const profileId = getOrCreateProfileId();
        const res = await fetch(
          `/api/chat/history?conversationId=${encodeURIComponent(storedId!)}&profileId=${encodeURIComponent(profileId)}`
        );
        const json = await res.json();
        if (!cancelled && res.ok && Array.isArray(json.messages) && json.messages.length) {
          setMessages(json.messages);
        }
      } catch {
        // History is a nice-to-have; keep the empty state on failure.
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || streaming) return;

    setError(null);
    setInput("");

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const profileId = getOrCreateProfileId();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          leagueContext: { ...context, phase: appPhase },
          profileId,
          leagueId,
          conversationId,
        }),
      });

      const returnedId = res.headers.get("X-Audible-Conversation-Id");
      if (returnedId) {
        setConversationId(returnedId);
        setStoredConversationId(leagueId, returnedId);
      }

      setLoading(false);
      setStreaming(true);
      setMessages((current) => [...current, { role: "assistant", content: "" }]);

      for await (const chunk of streamChatResponse(res, {
        onMeta: (meta) => {
          if (meta.conversationId) {
            setConversationId(meta.conversationId);
            setStoredConversationId(leagueId, meta.conversationId);
          }
        },
      })) {
        setMessages((current) => {
          const updated = [...current];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              role: "assistant",
              content: last.content + chunk,
            };
          }
          return updated;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setMessages((current) =>
        current.filter(
          (entry, index) =>
            !(index === current.length - 1 && entry.role === "assistant" && !entry.content)
        )
      );
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  // Auto-send a prefilled question (e.g. from the Start/Sit "ASK AUDIBLE WHY" button),
  // once, after league context has had a chance to load.
  useEffect(() => {
    if (!initialMessage || initialMessageSent.current || loading || streaming) return;
    initialMessageSent.current = true;
    sendMessage(initialMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, context]);

  function startNewConversation() {
    if (loading || streaming) return;
    clearStoredConversationId(leagueId);
    setConversationId(null);
    setMessages([]);
    setError(null);
  }

  return (
    <div className="body">
      <AppHead
        title="Ask Audible"
        badge={isDraftMode ? "DRAFT MODE" : `WK ${context.week}`}
      />
      <Hash>
        {context.leagueName} · {context.scoringFormat}
        {isDraftMode ? " · DRAFT" : ""}
        {messages.length > 0 && (
          <>
            {" · "}
            <button
              type="button"
              className="linklike"
              onClick={startNewConversation}
              disabled={loading || streaming}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                color: "inherit",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              NEW CHAT
            </button>
          </>
        )}
      </Hash>

      <div className="chat-area" ref={chatRef}>
        {messages.length === 0 && (
          <div className="bubble ai">
            {isDraftMode
              ? "Ask about draft strategy, pick order, tiers, and roster construction. I know your carryover roster and league settings."
              : "Ask about your lineup, waivers, or matchups. I know your roster and scoring settings."}
            <div className="sources">
              <i />
              ROSTER: {context.rosterSummary}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`bubble ${message.role === "user" ? "user" : "ai"}`}
          >
            {message.content ? (
              message.role === "assistant" ? (
                <Markdown text={message.content} />
              ) : (
                message.content
              )
            ) : streaming && index === messages.length - 1 ? (
              "…"
            ) : (
              ""
            )}
          </div>
        ))}

        {loading && <div className="bubble ai">Thinking…</div>}
        {error && <p className="connect-error">{error}</p>}
      </div>

      <div className="suggest">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="pill"
            onClick={() => sendMessage(suggestion)}
            disabled={loading || streaming}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="inputbar"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            isDraftMode ? "Ask about your draft…" : "Ask about your team…"
          }
          disabled={loading || streaming}
        />
        <button
          type="submit"
          className="send"
          disabled={loading || streaming || !input.trim()}
          aria-label="Send message"
        >
          →
        </button>
      </form>
    </div>
  );
}
