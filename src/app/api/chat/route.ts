import { NextResponse } from "next/server";
import { buildToolContextFromRequest } from "@/lib/ai/execute-tools";
import { runChatWithTools, streamTextAsAnthropicSse } from "@/lib/ai/run-chat";
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
  const { messages, message, leagueContext, profileId, leagueId } = body as {
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

  const toolContext = await buildToolContextFromRequest({
    profileId,
    leagueId,
    leagueContext: resolvedContext,
  });

  if (resolvedContext.externalLeagueId) {
    toolContext.externalLeagueId = resolvedContext.externalLeagueId;
    toolContext.season = resolvedContext.season ?? toolContext.season;
  }

  try {
    const result = await runChatWithTools({
      apiKey,
      messages: conversation,
      leagueContext: resolvedContext,
      toolContext,
    });

    return new Response(streamTextAsAnthropicSse(result.content), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Audible-Tools": result.toolsUsed.join(","),
      },
    });
  } catch (error) {
    const fallback = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: fallback }, { status: 500 });
  }
}
