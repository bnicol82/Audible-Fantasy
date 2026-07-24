// Proactive insight generation — the "recommendations the user didn't think to ask for"
// engine. Deterministic signal detection (src/lib/insights/signals.ts) finds concrete
// facts; this module filters out already-alerted facts by dedupe key, then makes ONE
// deep-tier model call to decide which remaining signals deserve an alert and write the
// headline/body. The model references signals by id and cannot invent alerts: any output
// pointing at an unknown signal id is dropped.
//
// Cost control: runs once daily per league via cron, and the model is only called when
// at least one genuinely new signal exists — an unchanged roster situation costs zero
// model calls. Deep tier (Opus) is used per the Phase 3 design: this is a low-frequency,
// high-judgment task where quality beats latency.

import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";
import { createWithFallback } from "@/lib/ai/anthropic-fallback";
import { getActiveLeague } from "@/lib/leagues/sync";
import { gatherSignals, type InsightSignal } from "@/lib/insights/signals";
import { existingDedupeKeys } from "@/lib/insights/store";

type InsightModelOutput = {
  alerts: Array<{
    signalId: string;
    severity: "info" | "warning" | "urgent";
    headline: string;
    body: string;
  }>;
};

const insightsTool: Anthropic.Tool = {
  name: "submit_insights",
  description:
    "Submit the alerts worth surfacing to this fantasy manager. Reference signals by their id. Skip signals that are not actionable — an empty list is a valid answer.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      alerts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            signalId: {
              type: "string",
              description: "Must be the id of one of the provided signals.",
            },
            severity: { type: "string", enum: ["info", "warning", "urgent"] },
            headline: {
              type: "string",
              description: "Under 80 characters, punchy, names the player/game.",
            },
            body: {
              type: "string",
              description:
                "1-3 sentences, under 280 characters, citing only numbers present in the signal data, ending with the action to take.",
            },
          },
          required: ["signalId", "severity", "headline", "body"],
          additionalProperties: false,
        },
      },
    },
    required: ["alerts"],
    additionalProperties: false,
  },
};

export type GenerateInsightsResult = {
  signalsFound: number;
  newSignals: number;
  inserted: number;
  modelCalled: boolean;
};

export async function generateInsightsForLeague(input: {
  profileId: string;
  leagueId: string;
  apiKey: string;
}): Promise<GenerateInsightsResult> {
  const empty: GenerateInsightsResult = {
    signalsFound: 0,
    newSignals: 0,
    inserted: 0,
    modelCalled: false,
  };

  if (!process.env.DATABASE_URL) return empty;

  const league = await getActiveLeague(input.profileId, input.leagueId);
  if (!league || league.phase === "draft") return empty;

  const signals = await gatherSignals(league);
  if (!signals.length) return empty;

  // Dedupe gate: drop every signal whose fact was already alerted. If nothing new
  // remains, skip the model call entirely — this is what keeps a daily cron cheap.
  const seen = await existingDedupeKeys(
    input.profileId,
    input.leagueId,
    signals.map((signal) => signal.dedupeKey)
  );
  const fresh = signals.filter((signal) => !seen.has(signal.dedupeKey));
  if (!fresh.length) {
    return { ...empty, signalsFound: signals.length };
  }

  const client = new Anthropic({ apiKey: input.apiKey });
  const response = await createWithFallback(client, "deep", {
    max_tokens: 3000,
    system:
      "You are a fantasy football assistant reviewing a manager's roster situation. From the provided signals, pick the ones genuinely worth an unprompted alert and write each one up. Judge severity honestly: 'urgent' means points are likely being left on the bench or a starter may not play; 'warning' means worth monitoring; 'info' is context. Use ONLY facts and numbers present in the signal data — never invent stats, news, or timelines. Skip weak signals; fewer, sharper alerts beat noise.",
    tools: [insightsTool],
    tool_choice: { type: "tool", name: "submit_insights" },
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          leagueContext: {
            name: league.name,
            scoring: league.scoring,
            week: league.week,
            record: league.record,
            waiverType: league.rules.waiverType,
            faabBudget: league.rules.faabBudget,
            playoffWeekStart: league.rules.playoffWeekStart,
            tradeDeadlineWeek: league.rules.tradeDeadlineWeek,
          },
          signals: fresh,
        }),
      },
    ],
  });

  const block = response.content.find(
    (entry): entry is Anthropic.ToolUseBlock =>
      entry.type === "tool_use" && entry.name === "submit_insights"
  );
  const output = block?.input as InsightModelOutput | undefined;
  const result: GenerateInsightsResult = {
    signalsFound: signals.length,
    newSignals: fresh.length,
    inserted: 0,
    modelCalled: true,
  };
  if (!output || !Array.isArray(output.alerts)) return result;

  const signalById = new Map<string, InsightSignal>(
    fresh.map((signal) => [signal.id, signal])
  );
  const db = getDb();

  for (const alert of output.alerts) {
    const signal = signalById.get(alert.signalId);
    if (!signal || !alert.headline || !alert.body) continue; // unknown signal id → drop
    const severity = ["info", "warning", "urgent"].includes(alert.severity)
      ? alert.severity
      : "info";

    const inserted = (await db`
      insert into insights (
        user_id, league_id, week, kind, severity, headline, body, dedupe_key, payload
      )
      values (
        ${input.profileId}::uuid,
        ${input.leagueId}::uuid,
        ${league.week},
        ${signal.kind},
        ${severity},
        ${alert.headline.slice(0, 120)},
        ${alert.body.slice(0, 400)},
        ${signal.dedupeKey},
        ${JSON.stringify({ signal: signal.data })}::jsonb
      )
      on conflict (user_id, league_id, dedupe_key) do nothing
      returning id
    `) as Array<{ id: string }>;

    if (inserted.length) result.inserted += 1;
  }

  return result;
}

// Cron entry point: generate for every synced league. Sequential on purpose — this runs
// in a background job where bounded load matters more than latency, and each league is
// at most one model call.
export async function generateInsightsForAllLeagues(apiKey: string): Promise<{
  leaguesProcessed: number;
  totalInserted: number;
  failures: number;
}> {
  if (!process.env.DATABASE_URL) {
    return { leaguesProcessed: 0, totalInserted: 0, failures: 0 };
  }

  const db = getDb();
  const leagues = (await db`
    select id, user_id
    from leagues
    where platform = 'sleeper'
      and synced_at is not null
      and synced_at > now() - interval '30 days'
  `) as Array<{ id: string; user_id: string }>;

  let totalInserted = 0;
  let failures = 0;

  for (const league of leagues) {
    try {
      const result = await generateInsightsForLeague({
        profileId: league.user_id,
        leagueId: league.id,
        apiKey,
      });
      totalInserted += result.inserted;
    } catch (error) {
      failures += 1;
      console.error(`Insight generation failed for league ${league.id}:`, error);
    }
  }

  return { leaguesProcessed: leagues.length, totalInserted, failures };
}
