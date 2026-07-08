import type { Tool } from "@anthropic-ai/sdk/resources/messages.mjs";
import type { AppPhase } from "@/lib/app-phase";
import type { LeagueChatContext } from "@/lib/leagues/context";

export const inSeasonAiTools: Tool[] = [
  {
    name: "get_player_details",
    description:
      "Bio, team, position, injury status, and recent news for one or more players",
    input_schema: {
      type: "object",
      properties: {
        player_ids: {
          type: "array",
          items: { type: "string" },
          description: "Canonical or external player IDs",
        },
      },
      required: ["player_ids"],
    },
  },
  {
    name: "get_player_stats",
    description:
      "Weekly or season stats for players, computed under this league's scoring settings",
    input_schema: {
      type: "object",
      properties: {
        player_ids: { type: "array", items: { type: "string" } },
        season: { type: "integer" },
        week: { type: "integer" },
      },
      required: ["player_ids", "season"],
    },
  },
  {
    name: "get_projections",
    description: "Weekly and rest-of-season projections for players",
    input_schema: {
      type: "object",
      properties: {
        player_ids: { type: "array", items: { type: "string" } },
        week: { type: "integer" },
      },
      required: ["player_ids", "week"],
    },
  },
  {
    name: "get_matchup",
    description: "This week's opponent roster and projected totals",
    input_schema: {
      type: "object",
      properties: {
        league_id: { type: "string" },
        week: { type: "integer" },
      },
      required: ["league_id", "week"],
    },
  },
  {
    name: "get_waiver_candidates",
    description:
      "Top available free agents by position, filtered to the user's league",
    input_schema: {
      type: "object",
      properties: {
        league_id: { type: "string" },
        position: { type: "string" },
        limit: { type: "integer" },
      },
      required: ["league_id"],
    },
  },
  {
    name: "compare_players",
    description:
      "Side-by-side stats, projections, and schedule for start/sit decisions",
    input_schema: {
      type: "object",
      properties: {
        player_ids: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 4,
        },
        week: { type: "integer" },
      },
      required: ["player_ids", "week"],
    },
  },
];

export const draftAiTools: Tool[] = [
  {
    name: "get_player_details",
    description:
      "Bio, team, position, injury status for draft targets or comparisons",
    input_schema: {
      type: "object",
      properties: {
        player_ids: { type: "array", items: { type: "string" } },
      },
      required: ["player_ids"],
    },
  },
  {
    name: "get_draft_board",
    description:
      "Draft slot, next pick, roster needs, carryover keepers, recent picks, and target board",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_available_players",
    description:
      "Best available undrafted players by position sorted by Sleeper ADP (search_rank)",
    input_schema: {
      type: "object",
      properties: {
        position: {
          type: "string",
          description: "QB, RB, WR, TE, or ALL",
        },
        limit: { type: "integer" },
      },
    },
  },
  {
    name: "compare_draft_targets",
    description:
      "Side-by-side draft comparison with ADP and roster-fit notes for 2-4 players",
    input_schema: {
      type: "object",
      properties: {
        player_ids: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 4,
        },
      },
      required: ["player_ids"],
    },
  },
];

export const aiTools = inSeasonAiTools;

export function getToolsForPhase(phase?: AppPhase) {
  return phase === "draft" ? draftAiTools : inSeasonAiTools;
}

export function buildSystemPrompt(context: LeagueChatContext) {
  if (context.phase === "draft") {
    return `You are Audible, a fantasy football DRAFT assistant grounded in real data.

RULES:
- Never invent ADP, rankings, or injury statuses. Use tools for every factual claim.
- Recommend specific players by name with clear reasoning (roster needs, positional scarcity, value vs ADP).
- Account for carryover/keeper players already on the roster — don't recommend duplicates.
- Track positional runs and tier breaks. Warn when a position is drying up.
- Be decisive: "Take Bijan here" not "consider several options."
- Show the data behind picks (ADP, roster need, tier).

DRAFT CONTEXT:
- League: ${context.leagueName}
- Status: ${context.leagueStatus ?? "pre_draft"}
- Scoring: ${context.scoringFormat}
- Carryover roster: ${context.rosterSummary}
${context.draftSummary ? `- ${context.draftSummary}` : ""}`;
  }

  return `You are Audible, a fantasy football assistant grounded in real data.

RULES:
- Never invent stats or injury statuses. Use tools for every factual claim.
- Compute values under the league's actual scoring settings (${context.scoringFormat}).
- State uncertainty honestly for injuries, weather, and coaching decisions.
- Be decisive: "Start Nacua" not "it depends on many factors."
- Show the data behind recommendations (projections, matchups, target share).

LEAGUE CONTEXT:
- League: ${context.leagueName}
- Week: ${context.week}
- Record: ${context.record}
- Roster: ${context.rosterSummary}`;
}
