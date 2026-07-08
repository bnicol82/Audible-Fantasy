"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildLeagueChatContext,
  demoLeagueChatContext,
  type LeagueChatContext,
} from "@/lib/leagues/context";
import { streamChatResponse, type ChatMessage } from "@/lib/chat/stream";
import { getOrCreateProfileId } from "@/lib/session";
import { AppHead, Hash } from "./ui";

const SUGGESTIONS = [
  "Who should I start at flex?",
  "Is my RB1 playing this week?",
  "Rank my starters",
  "Who should I drop?",
];

export function AskScreen({ leagueId }: { leagueId: string | null }) {
  const [context, setContext] = useState<LeagueChatContext>(demoLeagueChatContext());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!leagueId) return;

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
          setContext(buildLeagueChatContext(json.league));
        }
      } catch {
        // Keep demo context
      }
    }

    loadContext();
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
          leagueContext: context,
          profileId,
          leagueId,
        }),
      });

      setLoading(false);
      setStreaming(true);
      setMessages((current) => [...current, { role: "assistant", content: "" }]);

      for await (const chunk of streamChatResponse(res)) {
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

  return (
    <div className="body">
      <AppHead title="Ask Audible" badge={`WK ${context.week}`} />
      <Hash>
        {context.leagueName} · {context.scoringFormat}
      </Hash>

      <div className="chat-area" ref={chatRef}>
        {messages.length === 0 && (
          <div className="bubble ai">
            Ask about your lineup, waivers, or matchups. I know your roster and
            scoring settings.
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
            {message.content ||
              (streaming && index === messages.length - 1 ? "…" : "")}
          </div>
        ))}

        {loading && <div className="bubble ai">Thinking…</div>}
        {error && <p className="connect-error">{error}</p>}
      </div>

      <div className="suggest">
        {SUGGESTIONS.map((suggestion) => (
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
          placeholder="Ask about your team…"
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
