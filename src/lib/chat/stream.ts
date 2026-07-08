export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function* streamChatResponse(response: Response) {
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
        };

        if (
          eventType === "content_block_delta" ||
          parsed.type === "content_block_delta"
        ) {
          const text = parsed.delta?.text;
          if (text) yield text;
        }
      } catch {
        // Ignore malformed SSE chunks
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
