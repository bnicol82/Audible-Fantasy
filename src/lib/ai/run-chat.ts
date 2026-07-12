import Anthropic from "@anthropic-ai/sdk";
import { getToolsForPhase, buildSystemPrompt } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/execute-tools";
import { createWithFallback, streamWithFallback } from "@/lib/ai/anthropic-fallback";
import type { ModelTier } from "@/lib/ai/models";
import type { ToolContext } from "@/lib/ai/tool-context";
import type { LeagueChatContext } from "@/lib/leagues/context";

const MAX_TOOL_STEPS = 6;

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

async function executeToolBlocks(
  content: Anthropic.ContentBlock[],
  toolContext: ToolContext,
  toolsUsed: string[]
): Promise<Anthropic.ToolResultBlockParam[]> {
  const toolResults: Anthropic.ToolResultBlockParam[] = [];

  for (const block of content) {
    if (block.type !== "tool_use") continue;
    toolsUsed.push(block.name);
    const result = await executeTool(
      block.name,
      block.input as Record<string, unknown>,
      toolContext
    );
    toolResults.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify(result),
    });
  }

  return toolResults;
}

// Non-streaming variant, kept as the rollback path and for callers that need the full
// response as a value (nothing in the app calls it after the chat route moved to
// streaming, but it shares all the same plumbing).
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

  for (let step = 0; step < MAX_TOOL_STEPS; step += 1) {
    const response = await createWithFallback(client, input.tier ?? "fast", {
      max_tokens: 2048,
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

    const toolResults = await executeToolBlocks(
      response.content,
      input.toolContext,
      toolsUsed
    );

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

function sseFrame(eventType: string, data: unknown) {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

function textDeltaFrame(text: string) {
  return sseFrame("content_block_delta", {
    type: "content_block_delta",
    delta: { type: "text_delta", text },
  });
}

// Real token streaming: every model step streams its events straight through to the
// client as Anthropic-shaped SSE frames. The client's existing parser only reads text
// from content_block_delta events and ignores everything else, so interim commentary
// between tool rounds ("Let me check the projections…") streams live, and the custom
// audible_* frames are invisible to it until the UI opts in.
export function runChatWithToolsStreaming(input: {
  apiKey: string;
  messages: ChatMessage[];
  leagueContext: LeagueChatContext;
  toolContext: ToolContext;
  tier?: ModelTier;
  meta?: Record<string, unknown>;
  onComplete?: (result: {
    content: string;
    toolsUsed: string[];
    tokensUsed: number;
  }) => Promise<void>;
}): ReadableStream<Uint8Array> {
  const client = new Anthropic({ apiKey: input.apiKey });
  const system = buildSystemPrompt(input.leagueContext);
  const tools = getToolsForPhase(input.leagueContext.phase ?? input.toolContext.phase);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const enqueue = (frame: string) => controller.enqueue(encoder.encode(frame));

      let currentMessages: AnthropicMessage[] = input.messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));
      const toolsUsed: string[] = [];
      const textParts: string[] = [];
      let tokensUsed = 0;
      let emittedAnyFrame = false;

      const finish = async (finalText: string | null) => {
        if (finalText) {
          enqueue(textDeltaFrame(finalText));
          textParts.push(finalText);
        }
        // Persistence must complete before close — on serverless, nothing is
        // guaranteed to run after the response stream finishes.
        try {
          await input.onComplete?.({
            content: textParts.join(""),
            toolsUsed,
            tokensUsed,
          });
        } catch (error) {
          console.error("Chat onComplete failed:", error);
        }
        enqueue(sseFrame("audible_meta", { toolsUsed, ...input.meta }));
        controller.close();
      };

      try {
        for (let step = 0; step < MAX_TOOL_STEPS; step += 1) {
          let stepText = "";

          const response = await streamWithFallback(
            client,
            input.tier ?? "fast",
            {
              max_tokens: 2048,
              system,
              tools,
              messages: currentMessages,
            },
            {
              onEvent: (event) => {
                if (
                  event.type === "content_block_delta" &&
                  event.delta.type === "text_delta"
                ) {
                  stepText += event.delta.text;
                }
                enqueue(sseFrame(event.type, event));
                emittedAnyFrame = true;
              },
            }
          );

          tokensUsed +=
            (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
          if (stepText) textParts.push(stepText);

          if (response.stop_reason !== "tool_use") {
            const hasAnyText = textParts.some((part) => part.trim().length > 0);
            await finish(hasAnyText ? null : "I couldn't finish that answer.");
            return;
          }

          // Separate interim commentary from the next step's text, and give the UI a
          // hook to show which tools are being consulted.
          if (stepText) {
            enqueue(textDeltaFrame("\n\n"));
            textParts.push("\n\n");
          }
          const stepToolNames = response.content
            .filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use")
            .map((block) => block.name);
          enqueue(sseFrame("audible_tool_status", { tools: stepToolNames }));

          const toolResults = await executeToolBlocks(
            response.content,
            input.toolContext,
            toolsUsed
          );

          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: response.content },
            { role: "user", content: toolResults },
          ];
        }

        await finish("I hit the tool limit before finishing. Try a simpler question.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Chat failed";
        if (!emittedAnyFrame) {
          // Nothing sent yet — let the route's error handling produce a JSON 500.
          controller.error(error);
          return;
        }
        // Mid-stream failure: surface it as an SSE event so the client can show the
        // error next to whatever partial text already rendered.
        enqueue(sseFrame("audible_error", { error: message }));
        controller.close();
      }
    },
  });
}
