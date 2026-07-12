// AI-generated Start/Sit and Waiver recommendations — the replacement for the template-
// string heuristics those screens used to present as "AI". Each generation is a single
// model call with all grounding data assembled upfront (the inputs are fully enumerable
// server-side, so an agentic tool loop would only add latency), forced through a strict
// tool schema so the output is guaranteed-parseable JSON.
//
// Design rule: numbers come from data, prose comes from the model. The deterministic
// layer (buildStartSitFacts / buildWaiverFacts) computes candidates and stat lines under
// the league's real scoring rules; the model only decides, ranks, and explains. Model
// output is validated against the provided candidates before it reaches a screen, and
// any failure falls back to the heuristic path — never to hallucinated content.
//
// Results are cached one-per-(user, league, type, week) in the `recommendations` table
// (unique index from migration 004) so the model runs once per week per surface unless
// the user explicitly refreshes.

import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";
import { createWithFallback } from "@/lib/ai/anthropic-fallback";
import type { SyncedLeagueSummary } from "@/lib/leagues/sync";
import {
  buildStartSitFacts,
  buildStartSitPayload,
  type StartSitPayload,
} from "@/lib/fantasy/start-sit";
import { buildWaiverFacts, type WaiversPayload } from "@/lib/fantasy/waivers";
import type { WaiverTarget } from "@/lib/data";
import {
  getAdvancedStatsBySleeperIds,
  getExpertRankingsBySleeperIds,
  getGameConditionsForTeams,
  getRecentInjuryNewsBySleeperIds,
} from "@/lib/data-sources/query";

type RecommendationType = "lineup" | "waiver";

type CacheEnvelope<T> = {
  payload: T;
  generatedAt: string;
  model: string;
};

async function readRecommendation<T>(input: {
  profileId: string;
  leagueId: string;
  type: RecommendationType;
  week: number;
}): Promise<CacheEnvelope<T> | null> {
  if (!process.env.DATABASE_URL) return null;
  const db = getDb();
  const rows = (await db`
    select payload
    from recommendations
    where user_id = ${input.profileId}::uuid
      and league_id = ${input.leagueId}::uuid
      and type = ${input.type}
      and week = ${input.week}
    limit 1
  `) as Array<{ payload: CacheEnvelope<T> }>;
  return rows[0]?.payload ?? null;
}

async function writeRecommendation<T>(input: {
  profileId: string;
  leagueId: string;
  type: RecommendationType;
  week: number;
  envelope: CacheEnvelope<T>;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const db = getDb();
  await db`
    insert into recommendations (user_id, league_id, type, week, payload)
    values (
      ${input.profileId}::uuid,
      ${input.leagueId}::uuid,
      ${input.type},
      ${input.week},
      ${JSON.stringify(input.envelope)}::jsonb
    )
    on conflict (user_id, league_id, type, week) do update set
      payload = excluded.payload,
      updated_at = now()
  `;
}

function extractForcedToolInput<T>(response: Anthropic.Message, toolName: string): T | null {
  const block = response.content.find(
    (entry): entry is Anthropic.ToolUseBlock =>
      entry.type === "tool_use" && entry.name === toolName
  );
  if (!block) return null;
  // A max_tokens truncation yields stop_reason "max_tokens" with incomplete input —
  // the SDK still parses what arrived, so validate shape downstream and treat any
  // missing required field as a generation failure.
  return block.input as T;
}

function describeLeagueRules(league: SyncedLeagueSummary): string {
  const rules = league.rules;
  return [
    `Scoring: ${league.scoring} (real per-stat rules applied to all point values below)`,
    `Waivers: ${rules.waiverType}${rules.waiverType === "faab" ? ` ($${rules.faabBudget ?? 100} season budget)` : ""}`,
    rules.playoffWeekStart ? `Playoffs start week ${rules.playoffWeekStart}` : null,
    rules.tradeDeadlineWeek ? `Trade deadline week ${rules.tradeDeadlineWeek}` : null,
    `Record: ${league.record}, week ${league.week}`,
  ]
    .filter(Boolean)
    .join(". ");
}

// ---------------------------------------------------------------------------
// Start / Sit
// ---------------------------------------------------------------------------

type StartSitModelOutput = {
  winner: "a" | "b";
  verdict: string;
  confidence: "high" | "medium" | "low";
  reasoning: string[];
  extraStats?: Array<{ label: string; a: string; b: string; winner: "a" | "b" | null }>;
};

const startSitTool: Anthropic.Tool = {
  name: "submit_start_sit",
  description: "Submit the start/sit decision with reasoning grounded in the provided data.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      winner: { type: "string", enum: ["a", "b"] },
      verdict: {
        type: "string",
        description:
          "One or two sentences, under 200 characters, citing specific numbers from the provided data.",
      },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      reasoning: {
        type: "array",
        items: { type: "string" },
        description: "2-4 short bullets, each citing data that was provided.",
      },
      extraStats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            a: { type: "string" },
            b: { type: "string" },
            winner: { type: ["string", "null"], enum: ["a", "b", null] },
          },
          required: ["label", "a", "b", "winner"],
          additionalProperties: false,
        },
        description:
          "Up to 3 additional comparison rows using ONLY values from the provided data (e.g. target share, opponent implied total). Pre-formatted strings.",
      },
    },
    required: ["winner", "verdict", "confidence", "reasoning", "extraStats"],
    additionalProperties: false,
  },
};

export async function getOrGenerateStartSit(input: {
  profileId: string;
  leagueId: string;
  league: SyncedLeagueSummary;
  refresh: boolean;
  apiKey: string;
}): Promise<StartSitPayload | null> {
  const { league } = input;

  if (!input.refresh) {
    const cached = await readRecommendation<StartSitPayload>({
      profileId: input.profileId,
      leagueId: input.leagueId,
      type: "lineup",
      week: league.week,
    }).catch(() => null);
    if (cached) {
      return { ...cached.payload, source: "ai-cached", generatedAt: cached.generatedAt };
    }
  }

  const facts = await buildStartSitFacts(league);
  if (!facts) return null;

  const sleeperIds = [facts.playerA.playerExternalId, facts.playerB.playerExternalId];
  const teams = [facts.playerA.nflTeam, facts.playerB.nflTeam].filter(
    (team): team is string => Boolean(team)
  );

  // Grounding is best-effort: a missing source shrinks the prompt, never blocks it.
  const [injuries, conditions, expertRanks, advanced] = await Promise.all([
    getRecentInjuryNewsBySleeperIds(sleeperIds).catch(() => new Map()),
    getGameConditionsForTeams(league.season, league.week, teams).catch(() => []),
    getExpertRankingsBySleeperIds(sleeperIds, league.season, league.week).catch(
      () => new Map()
    ),
    getAdvancedStatsBySleeperIds(sleeperIds, league.season, league.week).catch(
      () => new Map()
    ),
  ]);

  const playerBlock = (which: "a" | "b") => {
    const player = which === "a" ? facts.playerA : facts.playerB;
    const proj = which === "a" ? facts.aProj : facts.bProj;
    const lastWeek = which === "a" ? facts.aPoints : facts.bPoints;
    return {
      id: which,
      name: player.playerName,
      position: player.position,
      nflTeam: player.nflTeam,
      currentSlot: player.slot,
      projectedPoints: proj,
      lastWeekPoints: lastWeek,
      injuryReports: injuries.get(player.playerExternalId) ?? [],
      expertConsensus: expertRanks.get(player.playerExternalId) ?? null,
      advancedStats: advanced.get(player.playerExternalId) ?? null,
    };
  };

  const client = new Anthropic({ apiKey: input.apiKey });
  const response = await createWithFallback(client, "fast", {
    max_tokens: 2000,
    system:
      "You are a fantasy football analyst. Decide which player to start using ONLY the data provided in the user message. Cite specific numbers from that data in your verdict and reasoning. Never invent statistics, injury details, or weather that is not in the data. If data is missing for a category, do not mention that category.",
    tools: [startSitTool],
    tool_choice: { type: "tool", name: "submit_start_sit" },
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          league: describeLeagueRules(league),
          playerA: playerBlock("a"),
          playerB: playerBlock("b"),
          gameConditions: conditions,
        }),
      },
    ],
  });

  const output = extractForcedToolInput<StartSitModelOutput>(response, "submit_start_sit");
  if (
    !output ||
    (output.winner !== "a" && output.winner !== "b") ||
    !output.verdict ||
    !Array.isArray(output.reasoning)
  ) {
    return null;
  }

  const generatedAt = new Date().toISOString();
  const payload = buildStartSitPayload({
    league,
    facts,
    winner: output.winner,
    verdict: output.verdict.slice(0, 240),
    source: "ai",
    extraStats: (output.extraStats ?? []).slice(0, 3),
    reasoning: output.reasoning.slice(0, 4),
    confidence: output.confidence,
    generatedAt,
  });

  await writeRecommendation({
    profileId: input.profileId,
    leagueId: input.leagueId,
    type: "lineup",
    week: league.week,
    envelope: { payload, generatedAt, model: "tier:fast" },
  }).catch((error) => console.error("Start/sit cache write failed:", error));

  return payload;
}

// ---------------------------------------------------------------------------
// Waivers
// ---------------------------------------------------------------------------

type WaiverModelOutput = {
  strategy: string;
  targets: Array<{
    name: string;
    suggestedBid: number;
    why: string;
    tags: Array<{ label: string; variant: "gold" | "red" | null }>;
    dropSuggestion: string | null;
    confidence: "high" | "medium" | "low";
  }>;
};

const waiverTool: Anthropic.Tool = {
  name: "submit_waiver_targets",
  description:
    "Submit ranked waiver targets chosen ONLY from the provided candidate list, with bids and reasoning grounded in the provided data.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      strategy: {
        type: "string",
        description:
          "One sentence describing this week's overall waiver approach for this roster.",
      },
      targets: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Must exactly match a name from the provided candidates list.",
            },
            suggestedBid: {
              type: "integer",
              description:
                "FAAB dollars. Must not exceed the provided faabRemaining. Use 0 if the league does not use FAAB.",
            },
            why: {
              type: "string",
              description:
                "1-2 sentences citing the provided data (add counts, injuries on the user's roster, usage trends).",
            },
            tags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  variant: { type: ["string", "null"], enum: ["gold", "red", null] },
                },
                required: ["label", "variant"],
                additionalProperties: false,
              },
            },
            dropSuggestion: {
              type: ["string", "null"],
              description:
                "Exact name of a player from the provided droppable list, or null.",
            },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["name", "suggestedBid", "why", "tags", "dropSuggestion", "confidence"],
          additionalProperties: false,
        },
        description: "3 to 4 targets, best first.",
      },
    },
    required: ["strategy", "targets"],
    additionalProperties: false,
  },
};

export async function getOrGenerateWaivers(input: {
  profileId: string;
  leagueId: string;
  league: SyncedLeagueSummary;
  refresh: boolean;
  apiKey: string;
}): Promise<WaiversPayload | null> {
  const { league } = input;

  if (!input.refresh) {
    const cached = await readRecommendation<WaiversPayload>({
      profileId: input.profileId,
      leagueId: input.leagueId,
      type: "waiver",
      week: league.week,
    }).catch(() => null);
    if (cached) {
      return { ...cached.payload, source: "ai-cached", generatedAt: cached.generatedAt };
    }
  }

  const facts = await buildWaiverFacts(league);
  if (!facts.candidates.length) return null;

  const rosterIds = league.roster.map((entry) => entry.playerExternalId);
  const candidateIds = facts.candidates.map((candidate) => candidate.sleeperId);

  const [rosterInjuries, expertRanks] = await Promise.all([
    getRecentInjuryNewsBySleeperIds(rosterIds).catch(() => new Map()),
    getExpertRankingsBySleeperIds(candidateIds, league.season, league.week).catch(
      () => new Map()
    ),
  ]);

  // Droppable pool: active bench only — never starters, IR, or taxi.
  const droppable = league.roster.filter(
    (entry) => entry.rosterStatus === "active" && entry.slot === "BN"
  );

  const client = new Anthropic({ apiKey: input.apiKey });
  const response = await createWithFallback(client, "fast", {
    max_tokens: 2000,
    system:
      "You are a fantasy football waiver-wire analyst. Rank 3-4 pickups chosen ONLY from the provided candidates, using ONLY the data provided. Bids must respect the provided FAAB budget (0 if the league does not use FAAB). Drop suggestions may only name players from the provided droppable list. Cite add counts, roster needs, and injuries from the data — never invent facts.",
    tools: [waiverTool],
    tool_choice: { type: "tool", name: "submit_waiver_targets" },
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          league: describeLeagueRules(league),
          faabRemaining: facts.faabRemaining,
          usesFaab: league.rules.waiverType === "faab",
          candidates: facts.candidates.map((candidate) => ({
            ...candidate,
            expertConsensus: expertRanks.get(candidate.sleeperId) ?? null,
          })),
          roster: league.roster.map((entry) => ({
            name: entry.playerName,
            position: entry.position,
            slot: entry.slot,
            rosterStatus: entry.rosterStatus,
            injuryStatus: entry.injuryStatus,
            projectedPoints: entry.projectedPoints,
            recentInjuryReports: rosterInjuries.get(entry.playerExternalId) ?? [],
          })),
          droppable: droppable.map((entry) => entry.playerName),
        }),
      },
    ],
  });

  const output = extractForcedToolInput<WaiverModelOutput>(
    response,
    "submit_waiver_targets"
  );
  if (!output || !Array.isArray(output.targets) || !output.targets.length) {
    return null;
  }

  // Validate every model claim against the deterministic facts. Anything that doesn't
  // check out invalidates the whole generation → heuristic fallback.
  const candidateByName = new Map(
    facts.candidates.map((candidate) => [candidate.name.toLowerCase(), candidate])
  );
  const droppableNames = new Set(droppable.map((entry) => entry.playerName.toLowerCase()));
  const usesFaab = league.rules.waiverType === "faab";

  const targets: WaiverTarget[] = [];
  for (const target of output.targets.slice(0, 4)) {
    const candidate = candidateByName.get(target.name?.toLowerCase() ?? "");
    if (!candidate) return null; // hallucinated player — reject the whole batch

    const bid = usesFaab
      ? Math.max(0, Math.min(Math.round(target.suggestedBid ?? 0), facts.faabRemaining))
      : 0;

    const dropSuggestion =
      target.dropSuggestion && droppableNames.has(target.dropSuggestion.toLowerCase())
        ? target.dropSuggestion
        : undefined;

    targets.push({
      name: candidate.name,
      position: candidate.position,
      team: candidate.team,
      rostered: `${Math.min(99, candidate.addCount)} adds`,
      suggestedBid: bid,
      why: target.why?.slice(0, 300) ?? "",
      tags: (target.tags ?? []).slice(0, 3).map((tag) => ({
        label: tag.label.slice(0, 24).toUpperCase(),
        variant: tag.variant ?? undefined,
      })),
      dropSuggestion,
    });
  }

  if (targets.length < 3) return null;

  const generatedAt = new Date().toISOString();
  const payload: WaiversPayload = {
    source: "ai",
    faabRemaining: facts.faabRemaining,
    claimsSet: 0,
    targets,
    generatedAt,
    strategy: output.strategy?.slice(0, 200),
  };

  await writeRecommendation({
    profileId: input.profileId,
    leagueId: input.leagueId,
    type: "waiver",
    week: league.week,
    envelope: { payload, generatedAt, model: "tier:fast" },
  }).catch((error) => console.error("Waiver cache write failed:", error));

  return payload;
}
