import Anthropic from "@anthropic-ai/sdk";
import { getModelChain, type ModelTier } from "@/lib/ai/models";

// Walks the tier's model chain, only advancing past a 404 (retired/unknown model ID) — an
// auth or rate-limit error would fail identically on every model in the chain, so those
// propagate immediately instead of masking the real problem behind a confusing final error.
export async function createWithFallback(
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

  throw lastError instanceof Error
    ? lastError
    : new Error(`All models in "${tier}" chain failed`);
}

// Streaming variant of the same chain walk. A retired-model 404 arrives on the HTTP
// response before any SSE event, so advancing the chain is only safe while nothing has
// been forwarded yet — once events have flowed, errors propagate to the caller.
export async function streamWithFallback(
  client: Anthropic,
  tier: ModelTier,
  params: Omit<Anthropic.MessageCreateParamsNonStreaming, "model">,
  handlers: { onEvent: (event: Anthropic.MessageStreamEvent) => void }
): Promise<Anthropic.Message> {
  const chain = getModelChain(tier);
  let lastError: unknown;

  for (const model of chain) {
    let forwardedAny = false;
    try {
      const stream = client.messages.stream({ ...params, model });
      for await (const event of stream) {
        forwardedAny = true;
        handlers.onEvent(event);
      }
      return await stream.finalMessage();
    } catch (error) {
      lastError = error;
      if (error instanceof Anthropic.NotFoundError && !forwardedAny) {
        console.warn(`Model "${model}" unavailable (404) — trying next in ${tier} chain`);
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`All models in "${tier}" chain failed`);
}
