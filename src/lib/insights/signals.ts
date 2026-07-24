// Deterministic signal detection — the facts layer of the proactive insights engine.
// Every signal is a concrete, checkable condition found in real data (an injured starter,
// a 20mph-wind game, a bench player outprojecting a starter), carrying a stable dedupe
// key so the same fact never generates a second alert. The model downstream only decides
// which signals matter and writes the prose; it cannot invent signals.

import type { SyncedLeagueSummary } from "@/lib/leagues/sync";
import type { NormalizedRosterEntry } from "@/lib/providers/types";
import { getSleeperPlayers, getSleeperTrendingAdds } from "@/lib/providers/sleeper";
import {
  getGameConditionsForTeams,
  getRecentInjuryNewsBySleeperIds,
} from "@/lib/data-sources/query";

export type InsightKind = "injury" | "weather" | "lineup" | "waiver" | "trade";

export type InsightSignal = {
  id: string;
  kind: InsightKind;
  dedupeKey: string;
  data: Record<string, unknown>;
};

const CONCERNING_STATUSES = new Set(["questionable", "doubtful", "out", "ir", "sus", "pup"]);
const WIND_ALERT_MPH = 15;
const PRECIP_ALERT_PCT = 50;
const LINEUP_GAP_POINTS = 2;

function isStarter(entry: NormalizedRosterEntry) {
  return entry.rosterStatus === "active" && entry.slot !== "BN";
}

function benchAlternativesFor(
  roster: NormalizedRosterEntry[],
  position: string
): Array<{ name: string; projectedPoints: number | null }> {
  return roster
    .filter(
      (entry) =>
        entry.rosterStatus === "active" &&
        entry.slot === "BN" &&
        entry.position === position
    )
    .map((entry) => ({
      name: entry.playerName,
      projectedPoints: entry.projectedPoints ?? null,
    }));
}

export async function gatherSignals(league: SyncedLeagueSummary): Promise<InsightSignal[]> {
  const signals: InsightSignal[] = [];
  const week = league.week;
  const starters = league.roster.filter(isStarter);
  const rosterIds = league.roster.map((entry) => entry.playerExternalId);

  const injuryNews = await getRecentInjuryNewsBySleeperIds(rosterIds).catch(
    () => new Map<string, Array<{ headline: string; body: string | null }>>()
  );

  // 1. Injured starters — the alert a user most regrets missing.
  for (const starter of starters) {
    const status = starter.injuryStatus?.toLowerCase() ?? "";
    if (!CONCERNING_STATUSES.has(status)) continue;

    signals.push({
      id: `s${signals.length + 1}`,
      kind: "injury",
      dedupeKey: `injury:${starter.playerExternalId}:${status}:wk${week}`,
      data: {
        player: starter.playerName,
        position: starter.position,
        slot: starter.slot,
        status: starter.injuryStatus,
        projectedPoints: starter.projectedPoints ?? null,
        recentReports: (injuryNews.get(starter.playerExternalId) ?? []).slice(0, 2),
        benchAlternatives: benchAlternativesFor(league.roster, starter.position),
      },
    });
  }

  // 2. Bad weather for starters' games (outdoor only — the query layer stores dome
  // games with empty weather).
  const starterTeams = Array.from(
    new Set(starters.map((entry) => entry.nflTeam).filter((team): team is string => Boolean(team)))
  );
  const conditions = await getGameConditionsForTeams(league.season, week, starterTeams).catch(
    () => []
  );
  for (const game of conditions) {
    if (!game.isOutdoor) continue;
    const weather = game.weather as {
      windMph?: number | null;
      precipitationPct?: number | null;
      condition?: string | null;
      tempF?: number | null;
    };
    const windy = typeof weather.windMph === "number" && weather.windMph >= WIND_ALERT_MPH;
    const wet =
      typeof weather.precipitationPct === "number" &&
      weather.precipitationPct >= PRECIP_ALERT_PCT;
    if (!windy && !wet) continue;

    const affected = starters.filter(
      (entry) => entry.nflTeam === game.homeTeam || entry.nflTeam === game.awayTeam
    );
    if (!affected.length) continue;

    signals.push({
      id: `s${signals.length + 1}`,
      kind: "weather",
      dedupeKey: `weather:${game.homeTeam}-${game.awayTeam}:wk${week}`,
      data: {
        game: `${game.awayTeam} @ ${game.homeTeam}`,
        weather,
        affectedStarters: affected.map((entry) => ({
          name: entry.playerName,
          position: entry.position,
          projectedPoints: entry.projectedPoints ?? null,
        })),
      },
    });
  }

  // 3. Lineup gaps: a starter projecting at/near zero (bye, inactive, no projection
  // while others have one), or an active bench player clearly outprojecting a
  // same-position starter.
  const anyProjections = league.roster.some(
    (entry) => typeof entry.projectedPoints === "number" && entry.projectedPoints > 0
  );
  if (anyProjections) {
    for (const starter of starters) {
      const starterProj = starter.projectedPoints ?? 0;
      const alternatives = benchAlternativesFor(league.roster, starter.position).filter(
        (alternative) =>
          typeof alternative.projectedPoints === "number" &&
          alternative.projectedPoints > starterProj + LINEUP_GAP_POINTS
      );
      if (!alternatives.length) continue;

      const best = alternatives.sort(
        (a, b) => (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0)
      )[0];
      signals.push({
        id: `s${signals.length + 1}`,
        kind: "lineup",
        dedupeKey: `lineup:${starter.playerExternalId}:wk${week}`,
        data: {
          starter: {
            name: starter.playerName,
            position: starter.position,
            slot: starter.slot,
            projectedPoints: starterProj,
            injuryStatus: starter.injuryStatus ?? null,
          },
          benchOption: best,
        },
      });
    }
  }

  // 4. Waiver fits: trending unowned players at positions where the user has a
  // concerning starter (injured or projecting weakly). Capped to keep the prompt lean —
  // the Waivers screen covers general adds; these are need-driven only.
  const needPositions = new Set(
    starters
      .filter((entry) => {
        const status = entry.injuryStatus?.toLowerCase() ?? "";
        return CONCERNING_STATUSES.has(status) || (anyProjections && !entry.projectedPoints);
      })
      .map((entry) => entry.position)
  );

  if (needPositions.size) {
    try {
      const [players, trending] = await Promise.all([
        getSleeperPlayers(),
        getSleeperTrendingAdds(48, 50),
      ]);
      const owned = new Set(rosterIds);
      const fits = trending
        .filter((entry) => {
          const player = players[entry.player_id];
          return (
            player &&
            !owned.has(entry.player_id) &&
            needPositions.has(player.position ?? "")
          );
        })
        .slice(0, 3);

      for (const fit of fits) {
        const player = players[fit.player_id]!;
        signals.push({
          id: `s${signals.length + 1}`,
          kind: "waiver",
          dedupeKey: `waiver:${fit.player_id}:wk${week}`,
          data: {
            player: player.full_name,
            position: player.position,
            team: player.team ?? null,
            recentAddCount: fit.count,
            fillsNeedAt: player.position,
            faabBudget: league.rules.faabBudget,
            waiverType: league.rules.waiverType,
          },
        });
      }
    } catch {
      // Trending feed unavailable — skip waiver signals this run.
    }
  }

  // 5. One trade angle per week, only when the roster shows both a clear surplus and a
  // clear deficit worth shopping around.
  if (anyProjections) {
    const healthyByPosition = new Map<string, number>();
    for (const entry of league.roster) {
      if (entry.rosterStatus !== "active") continue;
      const status = entry.injuryStatus?.toLowerCase() ?? "";
      if (CONCERNING_STATUSES.has(status)) continue;
      if (!["QB", "RB", "WR", "TE"].includes(entry.position)) continue;
      healthyByPosition.set(
        entry.position,
        (healthyByPosition.get(entry.position) ?? 0) + 1
      );
    }

    const weakStarters = starters.filter(
      (entry) =>
        ["QB", "RB", "WR", "TE"].includes(entry.position) &&
        (entry.projectedPoints ?? 0) < 8
    );
    const surplus = Array.from(healthyByPosition.entries()).filter(([, count]) => count >= 4);

    if (surplus.length && weakStarters.length) {
      signals.push({
        id: `s${signals.length + 1}`,
        kind: "trade",
        dedupeKey: `trade:wk${week}`,
        data: {
          surplusPositions: surplus.map(([position, count]) => ({ position, count })),
          weakSpots: weakStarters.map((entry) => ({
            name: entry.playerName,
            position: entry.position,
            slot: entry.slot,
            projectedPoints: entry.projectedPoints ?? null,
          })),
          tradeDeadlineWeek: league.rules.tradeDeadlineWeek,
        },
      });
    }
  }

  return signals;
}
