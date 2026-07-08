import type { Tool } from "@anthropic-ai/sdk/resources/messages.mjs";

export const aiTools: Tool[] = [
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

import type { LeagueChatContext } from "@/lib/leagues/context";

export function buildSystemPrompt(context: LeagueChatContext) {
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
