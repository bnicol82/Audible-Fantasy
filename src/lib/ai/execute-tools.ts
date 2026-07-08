import {
  getSleeperMatchups,
  getSleeperNflState,
  getSleeperPlayers,
  getSleeperRosters,
  getSleeperTrendingAdds,
  getSleeperWeeklyStats,
  resolvePlayers,
} from "@/lib/providers/sleeper";
import type { AppPhase } from "@/lib/app-phase";
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

function formatPlayer(player: {
  full_name?: string;
  position?: string;
  team?: string | null;
  injury_status?: string;
  player_id?: string;
}) {
  return {
    id: player.player_id,
    name: player.full_name ?? "Unknown",
    position: player.position ?? "UNK",
    team: player.team ?? null,
    injuryStatus: player.injury_status ?? null,
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
    players: resolved.map((player) => formatPlayer(player)),
    week: context.week,
    season: context.season,
  };
}

async function comparePlayers(input: ToolInput, context: ToolContext) {
  const ids = asStringArray(input.player_ids);
  const week = asNumber(input.week, context.week);
  const players = await getSleeperPlayers();
  const resolved = resolvePlayers(players, ids);

  let weeklyStats: Record<string, number> = {};
  try {
    const stats = await getSleeperWeeklyStats(context.season, week);
    weeklyStats = Object.fromEntries(
      stats.map((row) => [String(row.player_id), row.pts_ppr ?? row.pts_half_ppr ?? row.pts_std ?? 0])
    );
  } catch {
    // Stats may be unavailable in offseason
  }

  return {
    week,
    scoringFormat: context.scoringFormat,
    players: resolved.map((player) => ({
      ...formatPlayer(player),
      lastWeekPoints: weeklyStats[player.player_id ?? ""] ?? null,
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
      ...formatPlayer(player!),
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
  return { season: context.season, week, stats: filtered };
}

async function getProjections(input: ToolInput, context: ToolContext) {
  const ids = asStringArray(input.player_ids);
  const week = asNumber(input.week, context.week);
  const players = await getSleeperPlayers();
  const resolved = resolvePlayers(players, ids);

  return {
    week,
    season: context.season,
    note: "Projection feed not cached yet — returning player metadata only.",
    players: resolved.map((player) => formatPlayer(player)),
    projections: resolved.map((player) => ({
      playerId: player.player_id,
      projectedPoints: null,
    })),
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
      ...formatPlayer({ ...player, player_id: player.id }),
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
      ...formatPlayer(player),
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
    scoringFormat: league.scoring.toLowerCase().replace(" ", "_"),
    rosterPlayerIds: league.roster.map((player) => player.playerExternalId),
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
  const scoringFormat = scoring.includes("half")
    ? "half_ppr"
    : scoring.includes("ppr")
      ? "ppr"
      : scoring.includes("standard")
        ? "standard"
        : "half_ppr";

  return {
    externalLeagueId: input.leagueContext?.externalLeagueId,
    season: input.leagueContext?.season ?? Number(nflState?.season ?? new Date().getFullYear()),
    week: input.leagueContext?.week ?? nflState?.week ?? demoToolContext().week,
    scoringFormat,
    rosterPlayerIds: [],
    phase,
    profileId: input.profileId,
    leagueId: input.leagueId,
  };
}
