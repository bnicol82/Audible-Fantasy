import Anthropic from "@anthropic-ai/sdk";
import { getToolsForPhase, buildSystemPrompt } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/execute-tools";
import { getModelChain, type ModelTier } from "@/lib/ai/models";
import type { ToolContext } from "@/lib/ai/tool-context";
import type { LeagueChatContext } from "@/lib/leagues/context";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AnthropicMessage = {
  role: "user" | "assistant";
  content: Anthropic.MessageParam["content"];
};

function extractText(content: Anthropic.ContentBlock[]) {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

// Walks the tier's model chain, only advancing past a 404 (retired/unknown model ID) — an
// auth or rate-limit error would fail identically on every model in the chain, so those
// propagate immediately instead of masking the real problem behind a confusing final error.
async function createWithFallback(
  client: Anthropic,
  tier: ModelTier,
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, "model">
): Promise<Anthropic.Message> {
  const chain = getModelChain(tier);
  let lastError: unknown;

  for (const model of chain) {
    try {
      return await client.messages.create({ ...params, model });
    } catch (error) {
      lastError = error;
      if (error instanceof Anthropic.NotFoundError) {
        console.warn(`Model "${model}" unavailable (404) — trying next in ${tier} chain`);
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`All models in "${tier}" chain failed`);
}

export async function runChatWithTools(input: {
  apiKey: string;
  messages: ChatMessage[];
  leagueContext: LeagueChatContext;
  toolContext: ToolContext;
  tier?: ModelTier;
}) {
  const client = new Anthropic({ apiKey: input.apiKey });
  const system = buildSystemPrompt(input.leagueContext);
  const tools = getToolsForPhase(input.leagueContext.phase ?? input.toolContext.phase);
  let currentMessages: AnthropicMessage[] = input.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const toolsUsed: string[] = [];

  for (let step = 0; step < 6; step += 1) {
    const response = await createWithFallback(client, input.tier ?? "fast", {
      max_tokens: 1024,
      system,
      tools,
      messages: currentMessages,
    });

    if (response.stop_reason === "end_turn") {
      return {
        content: extractText(response.content),
        toolsUsed,
      };
    }

    if (response.stop_reason !== "tool_use") {
      return {
        content: extractText(response.content) || "I couldn't finish that answer.",
        toolsUsed,
      };
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      toolsUsed.push(block.name);
      const result = await executeTool(
        block.name,
        block.input as Record<string, unknown>,
        input.toolContext
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: response.content },
      { role: "user", content: toolResults },
    ];
  }

  return {
    content: "I hit the tool limit before finishing. Try a simpler question.",
    toolsUsed,
  };
}

export function streamTextAsAnthropicSse(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `event: content_block_delta\ndata: ${JSON.stringify({
            type: "content_block_delta",
            delta: { type: "text_delta", text },
          })}\n\n`
        )
      );
      controller.close();
    },
  });
}
