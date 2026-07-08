import {
  getSleeperMatchups,
  getSleeperNflState,
  getSleeperPlayers,
  getSleeperRosters,
  getSleeperTrendingAdds,
  getSleeperWeeklyStats,
  resolvePlayers,
} from "@/lib/providers/sleeper";
import { getProjectionsBySleeperIds, normalizeScoringFormat } from "@/lib/cache/players";
import {
  computeFantasyPointsWithFallback,
  defaultRulesForFormat,
  toRawStatLine,
} from "@/lib/scoring/engine";
import {
  getAdvancedStatsBySleeperIds,
  getExpertRankingsBySleeperIds,
  getGameConditionsForTeams,
  getRecentInjuryNewsBySleeperIds,
  type StoredInjuryNews,
} from "@/lib/data-sources/query";
import type { AppPhase } from "@/lib/app-phase";
import type { ScoringSettings } from "@/lib/providers/types";
import { getDraftBoard } from "@/lib/fantasy/draft";
import type { ToolContext } from "./tool-context";
import { demoToolContext } from "./tool-context";

type ToolInput = Record<string, unknown>;

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatPlayer(
  player: {
    full_name?: string;
    position?: string;
    team?: string | null;
    injury_status?: string;
    player_id?: string;
  },
  context?: ToolContext
) {
  const rosterStatus = player.player_id
    ? context?.rosterStatusByPlayerId?.[player.player_id]
    : undefined;

  return {
    id: player.player_id,
    name: player.full_name ?? "Unknown",
    position: player.position ?? "UNK",
    team: player.team ?? null,
    injuryStatus: player.injury_status ?? null,
    rosterStatus: rosterStatus ?? null,
  };
}

export async function executeTool(
  name: string,
  input: ToolInput,
  context: ToolContext
) {
  switch (name) {
    case "get_player_details":
      return getPlayerDetails(input, context);
    case "compare_players":
      return comparePlayers(input, context);
    case "get_waiver_candidates":
      return getWaiverCandidates(input, context);
    case "get_matchup":
      return getMatchup(input, context);
    case "get_player_stats":
      return getPlayerStats(input, context);
    case "get_projections":
      return getProjections(input, context);
    case "get_game_conditions":
      return getGameConditions(input, context);
    case "get_injury_report":
      return getInjuryReport(input, context);
    case "get_expert_consensus":
      return getExpertConsensus(input, context);
    case "get_advanced_stats":
      return getAdvancedStats(input, context);
    case "get_draft_board":
      return getDraftBoardTool(context);
    case "get_available_players":
      return getAvailablePlayers(input, context);
    case "compare_draft_targets":
      return compareDraftTargets(input, context);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function getPlayerDetails(input: ToolInput, context: ToolContext) {
  const ids = asStringArray(input.player_ids);
  const players = await getSleeperPlayers();
  const resolved = resolvePlayers(players, ids);
  return {
    players: resolved.map((player) => formatPlayer(player, context)),
    week: context.week,
    season: context.season,
  };
}

async function loadCachedProjections(
  sleeperIds: string[],
  context: ToolContext,
  week: number
) {
  if (!process.env.DATABASE_URL || !sleeperIds.length) {
    return new Map<string, number>();
  }

  try {
    const rows = await getProjectionsBySleeperIds({
      sleeperIds,
      season: context.season,
      week,
      scoringSettings: context.scoringSettings,
    });
    return new Map(
      rows.map((row) => [row.sleeperId, row.projectedPoints] as const)
    );
  } catch {
    return new Map<string, number>();
  }
}

async function comparePlayers(input: ToolInput, context: ToolContext) {
  const ids = asStringArray(input.player_ids);
  const week = asNumber(input.week, context.week);
  const players = await getSleeperPlayers();
  const resolved = resolvePlayers(players, ids);
  const sleeperIds = resolved
    .map((player) => player.player_id ?? "")
    .filter(Boolean);

  let weeklyStats: Record<string, number> = {};
  try {
    const stats = await getSleeperWeeklyStats(context.season, week);
    weeklyStats = Object.fromEntries(
      stats.map((row) => [
        String(row.player_id),
        computeFantasyPointsWithFallback(toRawStatLine(row), context.scoringSettings),
      ])
    );
  } catch {
    // Stats may be unavailable in offseason
  }

  const projections = await loadCachedProjections(sleeperIds, context, week);

  return {
    week,
    scoringFormat: context.scoringFormat,
    players: resolved.map((player) => ({
      ...formatPlayer(player, context),
      lastWeekPoints: weeklyStats[player.player_id ?? ""] ?? null,
      projectedPoints: projections.get(player.player_id ?? "") ?? null,
    })),
  };
}

async function getWaiverCandidates(input: ToolInput, context: ToolContext) {
  const position = typeof input.position === "string" ? input.position : undefined;
  const limit = asNumber(input.limit, 8);
  const leagueId =
    typeof input.league_id === "string" ? input.league_id : context.externalLeagueId;

  const players = await getSleeperPlayers();
  let owned = new Set(context.rosterPlayerIds);

  if (leagueId) {
    const rosters = await getSleeperRosters(leagueId);
    owned = new Set(rosters.flatMap((roster) => roster.players));
  }

  const trending = await getSleeperTrendingAdds(48, 50);
  const candidates = trending
    .map((entry) => players[entry.player_id])
    .filter((player) => player && !owned.has(player.player_id ?? ""))
    .filter((player) => !position || player?.position === position)
    .slice(0, limit)
    .map((player) => ({
      ...formatPlayer(player!, context),
      addCount: trending.find((entry) => entry.player_id === player?.player_id)?.count ?? 0,
    }));

  return {
    leagueId: leagueId ?? null,
    position: position ?? "ALL",
    candidates,
    note: leagueId
      ? "Filtered to unowned players in your league using Sleeper add trends."
      : "Using Sleeper add trends (connect a league to filter owned players).",
  };
}

async function getMatchup(input: ToolInput, context: ToolContext) {
  const leagueId =
    typeof input.league_id === "string" ? input.league_id : context.externalLeagueId;
  const week = asNumber(input.week, context.week);

  if (!leagueId) {
    return { error: "No league connected. Connect Sleeper to load matchup data." };
  }

  const [matchups, rosters] = await Promise.all([
    getSleeperMatchups(leagueId, week),
    getSleeperRosters(leagueId),
  ]);

  return {
    week,
    matchups: matchups.map((matchup) => ({
      rosterId: matchup.roster_id,
      matchupId: matchup.matchup_id,
      points: matchup.points,
      rosterSize: rosters.find((r) => r.roster_id === matchup.roster_id)?.starters.length ?? 0,
    })),
  };
}

async function getPlayerStats(input: ToolInput, context: ToolContext) {
  const ids = asStringArray(input.player_ids);
  const week = typeof input.week === "number" ? input.week : context.week;
  const stats = await getSleeperWeeklyStats(context.season, week);
  const filtered = stats.filter((row) => ids.includes(String(row.player_id)));
  const withComputedPoints = filtered.map((row) => ({
    ...row,
    fantasyPoints: computeFantasyPointsWithFallback(toRawStatLine(row), context.scoringSettings),
  }));
  return {
    season: context.season,
    week,
    scoringFormat: context.scoringFormat,
    stats: withComputedPoints,
  };
}

async function getProjections(input: ToolInput, context: ToolContext) {
  const ids = asStringArray(input.player_ids);
  const week = asNumber(input.week, context.week);
  const players = await getSleeperPlayers();
  const resolved = resolvePlayers(players, ids);
  const sleeperIds = resolved
    .map((player) => player.player_id ?? "")
    .filter(Boolean);

  const projections = await loadCachedProjections(sleeperIds, context, week);
  const hasCache = projections.size > 0;

  return {
    week,
    season: context.season,
    scoringFormat: context.scoringFormat,
    source: hasCache ? "cache" : "unavailable",
    note: hasCache
      ? "Projections loaded from Neon cache (Sleeper feed), computed under this league's actual scoring rules."
      : "Projection cache empty — run POST /api/cache/sync to populate.",
    players: resolved.map((player) => ({
      ...formatPlayer(player, context),
      projectedPoints: projections.get(player.player_id ?? "") ?? null,
    })),
  };
}

async function getGameConditions(input: ToolInput, context: ToolContext) {
  const ids = asStringArray(input.player_ids);
  const week = asNumber(input.week, context.week);
  const players = await getSleeperPlayers();
  const resolved = resolvePlayers(players, ids);
  const teams = Array.from(
    new Set(resolved.map((player) => player.team).filter((team): team is string => Boolean(team)))
  );

  const conditions = await getGameConditionsForTeams(context.season, week, teams).catch(() => []);
  const hasData = conditions.length > 0;

  return {
    week,
    source: hasData ? "cache" : "unavailable",
    note: hasData
      ? "Weather from NWS, lines from The Odds API (or nflverse closing lines if no odds key is configured)."
      : "No game conditions cached yet for this week — run POST /api/cache/sync, or the game may be indoors/too far out for a forecast.",
    games: conditions,
  };
}

async function getInjuryReport(input: ToolInput, context: ToolContext) {
  const ids = asStringArray(input.player_ids);
  const players = await getSleeperPlayers();
  const resolved = resolvePlayers(players, ids);
  const sleeperIds = resolved.map((player) => player.player_id ?? "").filter(Boolean);

  const newsByPlayer = await getRecentInjuryNewsBySleeperIds(sleeperIds).catch(
    () => new Map<string, StoredInjuryNews[]>()
  );

  return {
    season: context.season,
    players: resolved.map((player) => ({
      ...formatPlayer(player, context),
      recentReports: newsByPlayer.get(player.player_id ?? "") ?? [],
    })),
    note:
      "Injury detail sourced from nflverse's weekly injury report (practice participation, body part) — more detail than Sleeper's single status flag, but only as current as the last sync.",
  };
}

async function getExpertConsensus(input: ToolInput, context: ToolContext) {
  const ids = asStringArray(input.player_ids);
  const week = asNumber(input.week, context.week);
  const players = await getSleeperPlayers();
  const resolved = resolvePlayers(players, ids);
  const sleeperIds = resolved.map((player) => player.player_id ?? "").filter(Boolean);

  const rankings = await getExpertRankingsBySleeperIds(sleeperIds, context.season, week).catch(
    () => new Map<string, { rank: number; source: string }>()
  );

  return {
    week,
    players: resolved.map((player) => {
      const ranking = rankings.get(player.player_id ?? "");
      return {
        ...formatPlayer(player, context),
        consensusRank: ranking?.rank ?? null,
        source: ranking?.source ?? null,
      };
    }),
    note:
      "'nflverse_synthetic' is NOT licensed expert consensus — it's a synthetic rank derived from ADP + usage trend. 'fantasypros_ecr' is real consensus and only appears if FANTASYPROS_API_KEY is configured.",
  };
}

async function getAdvancedStats(input: ToolInput, context: ToolContext) {
  const ids = asStringArray(input.player_ids);
  const week = asNumber(input.week, context.week);
  const players = await getSleeperPlayers();
  const resolved = resolvePlayers(players, ids);
  const sleeperIds = resolved.map((player) => player.player_id ?? "").filter(Boolean);

  const advanced = await getAdvancedStatsBySleeperIds(sleeperIds, context.season, week).catch(
    () => new Map<string, { targets?: number; targetShare?: number; airYardsShare?: number }>()
  );

  return {
    week,
    players: resolved.map((player) => ({
      ...formatPlayer(player, context),
      ...(advanced.get(player.player_id ?? "") ?? {}),
    })),
    note: "Target share / air yards share from nflverse's weekly advanced stats release.",
  };
}

async function getDraftBoardTool(context: ToolContext) {
  const board = await getDraftBoard({
    profileId: context.profileId,
    leagueId: context.leagueId,
  });

  return {
    status: board.status,
    draftType: board.draftType,
    draftSlot: board.draftSlot,
    nextPick: board.nextPick,
    picksUntilYou: board.picksUntilYou,
    rosterNeeds: board.rosterNeeds,
    yourPicks: board.yourPicks,
    recentPicks: board.recentPicks.slice(0, 6),
    targets: board.targets,
    carryoverNote: board.carryoverNote,
  };
}

async function getAvailablePlayers(input: ToolInput, context: ToolContext) {
  const position =
    typeof input.position === "string" && input.position !== "ALL"
      ? input.position
      : undefined;
  const limit = asNumber(input.limit, 10);
  const board = await getDraftBoard({
    profileId: context.profileId,
    leagueId: context.leagueId,
  });
  const drafted = new Set(context.draftedPlayerIds ?? board.draftedPlayerIds);
  const players = await getSleeperPlayers();

  const available = Object.entries(players)
    .map(([id, player]) => ({ id, ...player }))
    .filter(
      (player) =>
        player.full_name &&
        player.search_rank &&
        player.search_rank > 0 &&
        !drafted.has(player.id) &&
        ["QB", "RB", "WR", "TE", "K", "DEF"].includes(player.position ?? "") &&
        (!position || player.position === position)
    )
    .sort((a, b) => (a.search_rank ?? 9999) - (b.search_rank ?? 9999))
    .slice(0, limit)
    .map((player) => ({
      ...formatPlayer({ ...player, player_id: player.id }, context),
      adp: player.search_rank,
    }));

  return {
    position: position ?? "ALL",
    available,
    note: "ADP uses Sleeper search_rank (lower = earlier).",
  };
}

async function compareDraftTargets(input: ToolInput, context: ToolContext) {
  const ids = asStringArray(input.player_ids);
  const players = await getSleeperPlayers();
  const resolved = resolvePlayers(players, ids);
  const board = await getDraftBoard({
    profileId: context.profileId,
    leagueId: context.leagueId,
  });

  return {
    scoringFormat: context.scoringFormat,
    rosterNeeds: board.rosterNeeds,
    players: resolved.map((player) => ({
      ...formatPlayer(player, context),
      adp: players[player.player_id ?? ""]?.search_rank ?? null,
      alreadyOwned:
        context.rosterPlayerIds.includes(player.player_id ?? "") ||
        board.yourPicks.some((pick) => pick.playerName === player.full_name),
    })),
  };
}

export async function buildToolContextFromLeague(
  profileId: string,
  leagueId: string
): Promise<ToolContext | null> {
  const { getActiveLeague } = await import("@/lib/leagues/sync");
  const league = await getActiveLeague(profileId, leagueId);
  if (!league) return null;

  const board =
    league.phase === "draft"
      ? await getDraftBoard({ profileId, leagueId }).catch(() => null)
      : null;

  return {
    externalLeagueId: league.externalLeagueId,
    season: league.season,
    week: league.week,
    scoringFormat: league.scoringSettings.format,
    scoringSettings: league.scoringSettings,
    leagueRules: league.rules,
    rosterPlayerIds: league.roster.map((player) => player.playerExternalId),
    rosterStatusByPlayerId: Object.fromEntries(
      league.roster.map((player) => [player.playerExternalId, player.rosterStatus])
    ),
    phase: league.phase,
    profileId,
    leagueId,
    draftedPlayerIds: board?.draftedPlayerIds,
  };
}

export async function buildToolContextFromRequest(input: {
  profileId?: string;
  leagueId?: string;
  leagueContext?: {
    week?: number;
    scoringFormat?: string;
    externalLeagueId?: string;
    season?: number;
    phase?: AppPhase;
  };
}) {
  if (input.profileId && input.leagueId && process.env.DATABASE_URL) {
    const fromDb = await buildToolContextFromLeague(input.profileId, input.leagueId);
    if (fromDb) return fromDb;
  }

  const nflState = await getSleeperNflState().catch(() => null);
  const phase = input.leagueContext?.phase;

  const scoring = input.leagueContext?.scoringFormat?.toLowerCase() ?? "";
  const scoringFormat = normalizeScoringFormat(scoring) as ScoringSettings["format"];

  return {
    externalLeagueId: input.leagueContext?.externalLeagueId,
    season: input.leagueContext?.season ?? Number(nflState?.season ?? new Date().getFullYear()),
    week: input.leagueContext?.week ?? nflState?.week ?? demoToolContext().week,
    scoringFormat,
    scoringSettings: { format: scoringFormat, raw: defaultRulesForFormat(scoringFormat) },
    rosterPlayerIds: [],
    phase,
    profileId: input.profileId,
    leagueId: input.leagueId,
  };
}
