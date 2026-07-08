import { startSitComparison } from "@/lib/data";
import { getActiveLeague } from "@/lib/leagues/sync";
import {
  getProjectionsBySleeperIds,
  normalizeScoringFormat,
} from "@/lib/cache/players";
import {
  getSleeperNflState,
  getSleeperWeeklyStats,
  initialsForName,
} from "@/lib/providers/sleeper";

export type StartSitPayload = typeof startSitComparison & {
  source: "live" | "demo";
  week: number;
};

function demoPayload(): StartSitPayload {
  return { ...startSitComparison, source: "demo", week: 5 };
}

function pickFlexDecision(
  roster: Array<{
    slot: string;
    playerExternalId: string;
    playerName: string;
    position: string;
    nflTeam: string | null;
  }>
) {
  const flexStarter = roster.find((player) => player.slot === "FLEX");
  const benchSkill = roster.filter(
    (player) =>
      player.slot === "BN" && ["RB", "WR", "TE"].includes(player.position)
  );

  if (flexStarter && benchSkill[0]) {
    return [flexStarter, benchSkill[0]];
  }

  const starters = roster.filter(
    (player) => player.slot !== "BN" && ["WR", "RB", "TE"].includes(player.position)
  );
  const bench = roster.filter(
    (player) => player.slot === "BN" && ["WR", "RB", "TE"].includes(player.position)
  );

  if (starters.at(-1) && bench[0]) {
    return [starters.at(-1)!, bench[0]];
  }

  return null;
}

export async function getStartSitComparison(input: {
  profileId?: string;
  leagueId?: string;
}) {
  if (!input.profileId || !input.leagueId || !process.env.DATABASE_URL) {
    return demoPayload();
  }

  try {
    const league = await getActiveLeague(input.profileId, input.leagueId);
    if (!league) return demoPayload();

    const pair = pickFlexDecision(league.roster);
    if (!pair) return demoPayload();

    const [playerAEntry, playerBEntry] = pair;

    let stats: Record<string, number> = {};
    try {
      const weekly = await getSleeperWeeklyStats(league.season, league.week);
      stats = Object.fromEntries(
        weekly.map((row) => [
          String(row.player_id),
          row.pts_half_ppr ?? row.pts_ppr ?? row.pts_std ?? 0,
        ])
      );
    } catch {
      // Offseason stats may be missing
    }

    const scoringFormat = normalizeScoringFormat(league.scoring);
    let projections = new Map<string, number>();
    try {
      const cached = await getProjectionsBySleeperIds({
        sleeperIds: [
          playerAEntry.playerExternalId,
          playerBEntry.playerExternalId,
        ],
        season: league.season,
        week: league.week,
        scoringFormat,
      });
      projections = new Map(
        cached.map((row) => [row.sleeperId, row.projectedPoints] as const)
      );
    } catch {
      // Cache may be empty before first sync
    }

    const aPoints = stats[playerAEntry.playerExternalId] ?? null;
    const bPoints = stats[playerBEntry.playerExternalId] ?? null;
    const aProj = projections.get(playerAEntry.playerExternalId) ?? null;
    const bProj = projections.get(playerBEntry.playerExternalId) ?? null;

    const winner =
      aProj !== null && bProj !== null
        ? aProj >= bProj
          ? "a"
          : "b"
        : aPoints !== null && bPoints !== null
          ? aPoints >= bPoints
            ? "a"
            : "b"
          : "a";

    return {
      source: "live" as const,
      week: league.week,
      playerA: {
        initials: initialsForName(playerAEntry.playerName),
        name: playerAEntry.playerName,
        position: playerAEntry.position,
        team: playerAEntry.nflTeam ?? "—",
        matchup: `WK ${league.week}`,
        isWinner: winner === "a",
      },
      playerB: {
        initials: initialsForName(playerBEntry.playerName),
        name: playerBEntry.playerName,
        position: playerBEntry.position,
        team: playerBEntry.nflTeam ?? "—",
        matchup: `WK ${league.week}`,
        isWinner: winner === "b",
      },
      stats: [
        {
          label: `Projected (${league.scoring})`,
          a: aProj !== null ? aProj.toFixed(1) : "—",
          b: bProj !== null ? bProj.toFixed(1) : "—",
          winner:
            aProj !== null && bProj !== null ? (winner as "a" | "b") : null,
        },
        {
          label: "Last Week (Half PPR)",
          a: aPoints !== null ? aPoints.toFixed(1) : "—",
          b: bPoints !== null ? bPoints.toFixed(1) : "—",
          winner:
            aPoints !== null && bPoints !== null
              ? aPoints >= bPoints
                ? "a"
                : "b"
              : null,
        },
        {
          label: "Role",
          a: playerAEntry.slot,
          b: playerBEntry.slot,
          winner: null,
        },
        {
          label: "Team",
          a: playerAEntry.nflTeam ?? "—",
          b: playerBEntry.nflTeam ?? "—",
          winner: null,
        },
      ],
      verdict:
        aProj !== null && bProj !== null
          ? winner === "a"
            ? `${playerAEntry.playerName.split(" ").pop()} projects higher (${aProj.toFixed(1)} vs ${bProj.toFixed(1)}).`
            : `${playerBEntry.playerName.split(" ").pop()} projects higher (${bProj.toFixed(1)} vs ${aProj.toFixed(1)}).`
          : winner === "a"
            ? `${playerAEntry.playerName.split(" ").pop()} has the stronger recent profile for this slot.`
            : `${playerBEntry.playerName.split(" ").pop()} looks like the better start this week.`,
    };
  } catch {
    return demoPayload();
  }
}

export async function getStartSitWeek() {
  const state = await getSleeperNflState().catch(() => null);
  return state?.week ?? 5;
}
