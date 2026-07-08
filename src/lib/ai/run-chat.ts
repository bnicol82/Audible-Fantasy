import Anthropic from "@anthropic-ai/sdk";
import { aiTools, buildSystemPrompt } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/execute-tools";
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

export async function runChatWithTools(input: {
  apiKey: string;
  messages: ChatMessage[];
  leagueContext: LeagueChatContext;
  toolContext: ToolContext;
}) {
  const client = new Anthropic({ apiKey: input.apiKey });
  const system = buildSystemPrompt(input.leagueContext);
  let currentMessages: AnthropicMessage[] = input.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const toolsUsed: string[] = [];

  for (let step = 0; step < 6; step += 1) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      tools: aiTools,
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
