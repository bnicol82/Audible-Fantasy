import { startSitComparison } from "@/lib/data";
import { getActiveLeague, type SyncedLeagueSummary } from "@/lib/leagues/sync";
import { getProjectionsBySleeperIds } from "@/lib/cache/players";
import {
  getSleeperNflState,
  getSleeperWeeklyStats,
  initialsForName,
} from "@/lib/providers/sleeper";
import { computeFantasyPointsWithFallback, toRawStatLine } from "@/lib/scoring/engine";

export type StartSitPayload = typeof startSitComparison & {
  source: "live" | "demo" | "ai" | "ai-cached";
  week: number;
  generatedAt?: string;
  reasoning?: string[];
  confidence?: "high" | "medium" | "low";
};

function demoPayload(): StartSitPayload {
  return { ...startSitComparison, source: "demo", week: 5 };
}

export function pickFlexDecision(
  roster: Array<{
    slot: string;
    rosterStatus: "active" | "ir" | "taxi";
    playerExternalId: string;
    playerName: string;
    position: string;
    nflTeam: string | null;
  }>
) {
  // IR/taxi players are not real bench depth — never surface them as a flex-swap
  // candidate. Entries persisted by older app versions predate rosterStatus, so a
  // missing value means a normal active player, not an exclusion.
  const eligibleBench = roster.filter(
    (player) => (player.rosterStatus ?? "active") === "active"
  );

  const flexStarter = eligibleBench.find((player) => player.slot === "FLEX");
  const benchSkill = eligibleBench.filter(
    (player) =>
      player.slot === "BN" && ["RB", "WR", "TE"].includes(player.position)
  );

  if (flexStarter && benchSkill[0]) {
    return [flexStarter, benchSkill[0]];
  }

  const starters = eligibleBench.filter(
    (player) => player.slot !== "BN" && ["WR", "RB", "TE"].includes(player.position)
  );
  const bench = eligibleBench.filter(
    (player) => player.slot === "BN" && ["WR", "RB", "TE"].includes(player.position)
  );

  if (starters.at(-1) && bench[0]) {
    return [starters.at(-1)!, bench[0]];
  }

  return null;
}

export type StartSitFacts = {
  playerA: NonNullable<ReturnType<typeof pickFlexDecision>>[number];
  playerB: NonNullable<ReturnType<typeof pickFlexDecision>>[number];
  aPoints: number | null;
  bPoints: number | null;
  aProj: number | null;
  bProj: number | null;
};

// The deterministic layer both the heuristic and AI paths share: which two players are
// being compared, and their real numbers under this league's actual scoring rules. The
// AI never invents these figures — it only decides and explains.
export async function buildStartSitFacts(
  league: SyncedLeagueSummary
): Promise<StartSitFacts | null> {
  const pair = pickFlexDecision(league.roster);
  if (!pair) return null;

  const [playerAEntry, playerBEntry] = pair;

  let stats: Record<string, number> = {};
  try {
    const weekly = await getSleeperWeeklyStats(league.season, league.week);
    stats = Object.fromEntries(
      weekly.map((row) => [
        String(row.player_id),
        computeFantasyPointsWithFallback(toRawStatLine(row), league.scoringSettings),
      ])
    );
  } catch {
    // Offseason stats may be missing
  }

  let projections = new Map<string, number>();
  try {
    const cached = await getProjectionsBySleeperIds({
      sleeperIds: [playerAEntry.playerExternalId, playerBEntry.playerExternalId],
      season: league.season,
      week: league.week,
      scoringSettings: league.scoringSettings,
    });
    projections = new Map(
      cached.map((row) => [row.sleeperId, row.projectedPoints] as const)
    );
  } catch {
    // Cache may be empty before first sync
  }

  return {
    playerA: playerAEntry,
    playerB: playerBEntry,
    aPoints: stats[playerAEntry.playerExternalId] ?? null,
    bPoints: stats[playerBEntry.playerExternalId] ?? null,
    aProj: projections.get(playerAEntry.playerExternalId) ?? null,
    bProj: projections.get(playerBEntry.playerExternalId) ?? null,
  };
}

// Assembles the screen payload from facts plus a decision — used by the heuristic path
// directly, and by the AI path with the model's winner/verdict swapped in.
export function buildStartSitPayload(input: {
  league: SyncedLeagueSummary;
  facts: StartSitFacts;
  winner: "a" | "b";
  verdict: string;
  source: StartSitPayload["source"];
  extraStats?: Array<{ label: string; a: string; b: string; winner: "a" | "b" | null }>;
  reasoning?: string[];
  confidence?: "high" | "medium" | "low";
  generatedAt?: string;
}): StartSitPayload {
  const { league, facts, winner } = input;
  const { playerA, playerB, aPoints, bPoints, aProj, bProj } = facts;

  return {
    source: input.source,
    week: league.week,
    generatedAt: input.generatedAt,
    reasoning: input.reasoning,
    confidence: input.confidence,
    playerA: {
      initials: initialsForName(playerA.playerName),
      name: playerA.playerName,
      position: playerA.position,
      team: playerA.nflTeam ?? "—",
      matchup: `WK ${league.week}`,
      isWinner: winner === "a",
    },
    playerB: {
      initials: initialsForName(playerB.playerName),
      name: playerB.playerName,
      position: playerB.position,
      team: playerB.nflTeam ?? "—",
      matchup: `WK ${league.week}`,
      isWinner: winner === "b",
    },
    stats: [
      {
        label: `Projected (${league.scoring})`,
        a: aProj !== null ? aProj.toFixed(1) : "—",
        b: bProj !== null ? bProj.toFixed(1) : "—",
        winner: aProj !== null && bProj !== null ? (aProj >= bProj ? "a" : "b") : null,
      },
      {
        label: `Last Week (${league.scoring})`,
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
        a: playerA.slot,
        b: playerB.slot,
        winner: null,
      },
      {
        label: "Team",
        a: playerA.nflTeam ?? "—",
        b: playerB.nflTeam ?? "—",
        winner: null,
      },
      ...(input.extraStats ?? []),
    ],
    verdict: input.verdict,
  };
}

function heuristicDecision(facts: StartSitFacts): { winner: "a" | "b"; verdict: string } {
  const { playerA, playerB, aPoints, bPoints, aProj, bProj } = facts;

  const winner: "a" | "b" =
    aProj !== null && bProj !== null
      ? aProj >= bProj
        ? "a"
        : "b"
      : aPoints !== null && bPoints !== null
        ? aPoints >= bPoints
          ? "a"
          : "b"
        : "a";

  const verdict =
    aProj !== null && bProj !== null
      ? winner === "a"
        ? `${playerA.playerName.split(" ").pop()} projects higher (${aProj.toFixed(1)} vs ${bProj.toFixed(1)}).`
        : `${playerB.playerName.split(" ").pop()} projects higher (${bProj.toFixed(1)} vs ${aProj.toFixed(1)}).`
      : winner === "a"
        ? `${playerA.playerName.split(" ").pop()} has the stronger recent profile for this slot.`
        : `${playerB.playerName.split(" ").pop()} looks like the better start this week.`;

  return { winner, verdict };
}

export async function getStartSitComparison(input: {
  profileId?: string;
  leagueId?: string;
  refresh?: boolean;
}) {
  if (!input.profileId || !input.leagueId || !process.env.DATABASE_URL) {
    return demoPayload();
  }

  try {
    const league = await getActiveLeague(input.profileId, input.leagueId);
    if (!league) return demoPayload();

    // Pre-draft there's no lineup to set — keep this screen heuristic and cheap.
    if (league.phase !== "draft" && process.env.ANTHROPIC_API_KEY) {
      const { getOrGenerateStartSit } = await import("@/lib/ai/generate-recommendations");
      const aiPayload = await getOrGenerateStartSit({
        profileId: input.profileId,
        leagueId: input.leagueId,
        league,
        refresh: input.refresh ?? false,
        apiKey: process.env.ANTHROPIC_API_KEY,
      }).catch((error) => {
        console.error("Start/sit AI generation failed, using heuristic:", error);
        return null;
      });
      if (aiPayload) return aiPayload;
    }

    const facts = await buildStartSitFacts(league);
    if (!facts) return demoPayload();

    const { winner, verdict } = heuristicDecision(facts);
    return buildStartSitPayload({
      league,
      facts,
      winner,
      verdict,
      source: "live",
    });
  } catch {
    return demoPayload();
  }
}

export async function getStartSitWeek() {
  const state = await getSleeperNflState().catch(() => null);
  return state?.week ?? 5;
}
