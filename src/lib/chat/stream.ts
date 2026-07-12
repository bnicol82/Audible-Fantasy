export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatStreamMeta = {
  toolsUsed?: string[];
  conversationId?: string | null;
};

export type ChatStreamHandlers = {
  onMeta?: (meta: ChatStreamMeta) => void;
};

export async function* streamChatResponse(
  response: Response,
  handlers?: ChatStreamHandlers
) {
  if (!response.ok) {
    const errorBody = await response.text();
    let message = "Chat request failed";
    try {
      message = JSON.parse(errorBody).error ?? message;
    } catch {
      if (errorBody) message = errorBody;
    }
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let eventType = "";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }

      if (!data || data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data) as {
          type?: string;
          delta?: { type?: string; text?: string };
          error?: string;
          toolsUsed?: string[];
          conversationId?: string | null;
        };

        if (eventType === "audible_meta") {
          handlers?.onMeta?.({
            toolsUsed: parsed.toolsUsed,
            conversationId: parsed.conversationId,
          });
          continue;
        }

        if (eventType === "audible_error") {
          // Mid-stream failure: partial text already rendered stays; surface the error.
          throw new Error(parsed.error ?? "Chat failed mid-response");
        }

        if (
          eventType === "content_block_delta" ||
          parsed.type === "content_block_delta"
        ) {
          const text = parsed.delta?.text;
          if (text) yield text;
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          // Ignore malformed SSE chunks
          continue;
        }
        throw error;
      }
    }
  }
}

export async function readStreamedChat(response: Response) {
  let content = "";
  for await (const chunk of streamChatResponse(response)) {
    content += chunk;
  }
  return content;
}
