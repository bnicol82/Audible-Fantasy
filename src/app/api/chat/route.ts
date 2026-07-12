import { NextResponse } from "next/server";
import { buildToolContextFromRequest } from "@/lib/ai/execute-tools";
import { runChatWithToolsStreaming } from "@/lib/ai/run-chat";
import {
  ensureProfile,
  getOrCreateConversation,
  insertChatMessage,
  loadConversationMessages,
} from "@/lib/chat/persistence";
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
  const { messages, message, leagueContext, profileId, leagueId, conversationId } =
    body as {
      messages?: ChatMessage[];
      message?: string;
      leagueContext?: LeagueChatContext;
      profileId?: string;
      leagueId?: string;
      conversationId?: string;
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

  let conversation: ChatMessage[] = Array.isArray(messages)
    ? messages.filter((entry) => entry.content?.trim())
    : message?.trim()
      ? [{ role: "user", content: message.trim() }]
      : [];

  if (!conversation.length) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const latestUserMessage = [...conversation]
    .reverse()
    .find((entry) => entry.role === "user");

  // Persistence (best-effort, never fatal). Ordered for the no-transaction Neon HTTP
  // driver: profile → conversation → user message BEFORE the model call — a crash mid-
  // generation still leaves a truthful record of what the user asked.
  let activeConversationId: string | null = null;
  let conversationPreExisted = false;
  if (profileId && latestUserMessage && process.env.DATABASE_URL) {
    try {
      await ensureProfile(profileId);
      activeConversationId = await getOrCreateConversation({
        profileId,
        leagueId: leagueId ?? null,
        conversationId,
        title: latestUserMessage.content,
      });
      conversationPreExisted =
        Boolean(conversationId) && activeConversationId === conversationId;
      if (activeConversationId) {
        await insertChatMessage({
          conversationId: activeConversationId,
          role: "user",
          content: latestUserMessage.content,
        });
      }
    } catch (error) {
      console.error("Chat persistence (pre-model) failed:", error);
      activeConversationId = null;
    }
  }

  // For an existing conversation, server-stored history is the source of truth — the
  // client-resent array is ignored (it can't be trusted and may have been truncated by
  // a reload anyway). The just-inserted user message is already included.
  if (activeConversationId && conversationPreExisted && profileId) {
    try {
      const stored = await loadConversationMessages(activeConversationId, profileId);
      if (stored.length) {
        conversation = stored;
      }
    } catch (error) {
      console.error("Chat history load failed, using client history:", error);
    }
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
    const stream = runChatWithToolsStreaming({
      apiKey,
      messages: conversation,
      leagueContext: resolvedContext,
      toolContext,
      meta: { conversationId: activeConversationId },
      onComplete: async ({ content, toolsUsed, tokensUsed }) => {
        if (!activeConversationId || !content) return;
        try {
          await insertChatMessage({
            conversationId: activeConversationId,
            role: "assistant",
            content,
            toolCalls: toolsUsed,
            tokensUsed,
          });
        } catch (error) {
          console.error("Chat persistence (assistant message) failed:", error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Audible-Conversation-Id": activeConversationId ?? "",
      },
    });
  } catch (error) {
    const fallback = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: fallback }, { status: 500 });
  }
}
