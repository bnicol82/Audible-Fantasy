import type { Tool } from "@anthropic-ai/sdk/resources/messages.mjs";
import type { AppPhase } from "@/lib/app-phase";
import { formatLeagueRulesSummary, type LeagueChatContext } from "@/lib/leagues/context";

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
  {
    name: "get_game_conditions",
    description:
      "Weather (temp, wind, precipitation) and Vegas lines (spread, total, implied team total) for a player's upcoming game. Only meaningful for outdoor stadiums and games within about a week of kickoff.",
    input_schema: {
      type: "object",
      properties: {
        player_ids: { type: "array", items: { type: "string" } },
        week: { type: "integer" },
      },
      required: ["player_ids"],
    },
  },
  {
    name: "get_injury_report",
    description:
      "Detailed injury status beyond a single flag: body part, practice participation trend, and recent injury news for players.",
    input_schema: {
      type: "object",
      properties: {
        player_ids: { type: "array", items: { type: "string" } },
      },
      required: ["player_ids"],
    },
  },
  {
    name: "get_expert_consensus",
    description:
      "Consensus ranking/tier for players this week. Check the `source` field on the result — 'fantasypros_ecr' is real licensed expert consensus, 'nflverse_synthetic' is a synthetic ADP+usage-trend rank and must be described as such, never as real expert consensus.",
    input_schema: {
      type: "object",
      properties: {
        player_ids: { type: "array", items: { type: "string" } },
        week: { type: "integer" },
      },
      required: ["player_ids"],
    },
  },
  {
    name: "get_advanced_stats",
    description:
      "Target share and air yards share for a player from recent weekly usage — useful for spotting role changes ADP/projections lag behind.",
    input_schema: {
      type: "object",
      properties: {
        player_ids: { type: "array", items: { type: "string" } },
        week: { type: "integer" },
      },
      required: ["player_ids"],
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

  const rulesSummary = context.leagueRules ? formatLeagueRulesSummary(context.leagueRules) : null;

  return `You are Audible, a fantasy football assistant grounded in real data.

RULES:
- Never invent stats or injury statuses. Use tools for every factual claim.
- Compute values under the league's actual scoring settings (${context.scoringFormat}) — get_player_stats and get_projections already do this for you using the league's real point-value rules, not a generic PPR bucket.
- Before making any claim about weather or Vegas lines, call get_game_conditions — don't assert conditions you haven't looked up.
- Before making any claim about injury severity or timeline, call get_injury_report — Sleeper's roster data only has a coarse status flag.
- If you call get_expert_consensus, check its 'source' field: only describe 'fantasypros_ecr' results as real expert consensus. Describe 'nflverse_synthetic' results as an internal usage-trend estimate, never as "experts say."
- Respect this league's actual waiver/trade/playoff rules (below) — don't assume generic defaults.
- Be decisive: "Start Nacua" not "it depends on many factors."
- Show the data behind recommendations (projections, matchups, target share).

LEAGUE CONTEXT:
- League: ${context.leagueName}
- Week: ${context.week}
- Record: ${context.record}
- Roster: ${context.rosterSummary}${rulesSummary ? `\n- Rules: ${rulesSummary}` : ""}`;
}
