// Tiered model selection with a fallback chain — fixes the fragility that's already broken
// this app twice when Anthropic retired a hardcoded model ID (see git history: "Fix Ask AI
// 404 — replace retired Claude Sonnet 4 model", "Fix Ask AI model — replace retired
// claude-sonnet-4-20250514"). Each tier tries an env override first, then a hardcoded
// last-known-good model; `run-chat.ts` walks the chain and only advances past a 404
// (retired/unknown model), never past auth/rate-limit errors that would fail identically
// on every model in the chain.

export type ModelTier = "fast" | "deep";

// Last-known-good fallbacks — update these whenever Anthropic announces a retirement.
// Verified current as of this change via the model catalog: Sonnet 5 / Opus 4.8.
const LAST_KNOWN_GOOD: Record<ModelTier, string> = {
  fast: "claude-sonnet-5",
  deep: "claude-opus-4-8",
};

const ENV_OVERRIDE: Record<ModelTier, string | undefined> = {
  fast: process.env.ANTHROPIC_MODEL_FAST ?? process.env.ANTHROPIC_MODEL,
  deep: process.env.ANTHROPIC_MODEL_DEEP,
};

export function getModelChain(tier: ModelTier): string[] {
  const override = ENV_OVERRIDE[tier];
  const chain = [override, LAST_KNOWN_GOOD[tier]].filter(
    (id): id is string => Boolean(id)
  );
  // De-dupe in case the override happens to match the hardcoded fallback.
  return Array.from(new Set(chain));
}
