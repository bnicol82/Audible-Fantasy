import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/tools";
import {
  buildLeagueChatContext,
  demoLeagueChatContext,
  type LeagueChatContext,
} from "@/lib/leagues/context";
import { getActiveLeague } from "@/lib/leagues/sync";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const {
    messages,
    message,
    leagueContext,
    profileId,
    leagueId,
  } = body as {
    messages?: ChatMessage[];
    message?: string;
    leagueContext?: LeagueChatContext;
    profileId?: string;
    leagueId?: string;
  };

  let resolvedContext = leagueContext as LeagueChatContext | undefined;

  if (!resolvedContext && profileId && leagueId && process.env.DATABASE_URL) {
    try {
      const league = await getActiveLeague(profileId, leagueId);
      if (league) {
        resolvedContext = buildLeagueChatContext(league);
      }
    } catch {
      // Fall back to demo context below
    }
  }

  if (!resolvedContext) {
    resolvedContext = demoLeagueChatContext();
  }

  const conversation: ChatMessage[] = Array.isArray(messages)
    ? messages.filter((entry) => entry.content?.trim())
    : message?.trim()
      ? [{ role: "user", content: message.trim() }]
      : [];

  if (!conversation.length) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const system = buildSystemPrompt(resolvedContext);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      messages: conversation.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
