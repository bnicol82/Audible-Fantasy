// Expert consensus rankings (ECR).
//
// COST DECISION POINT: FantasyPros has a real partner API for ECR/ADP/projections, but it
// is a paid/licensed product — pricing tier, weekly-vs-ROS coverage, and draft-only-vs-full
// -season access all need to be decided before wiring it in, and this environment has no
// network access to verify FantasyPros' current API contract, so no request/response shape
// is guessed here. `FANTASYPROS_API_KEY` is reserved for that future integration.
//
// Until licensed, this module produces a synthetic "consensus-like" ranking from data
// already on hand: Sleeper's own ADP proxy (`search_rank`) blended with nflverse's
// target-share trend (a real signal for "who's seeing more usage lately," which ADP alone
// doesn't capture). This is explicitly NOT real ECR — every result is labeled
// `source: "nflverse_synthetic"` so it can never be mistaken for licensed expert consensus.

import { getNflverseWeeklyAdvanced } from "./nflverse";

export type SyntheticRanking = {
  sleeperId: string;
  playerName: string;
  position: string;
  adpRank: number | null;
  targetShareTrend: number | null;
  compositeScore: number;
  source: "nflverse_synthetic" | "fantasypros_ecr";
};

export function isExpertRankingsLicensed(): boolean {
  return Boolean(process.env.FANTASYPROS_API_KEY);
}

export async function getSyntheticConsensusRankings(input: {
  season: number;
  week: number;
  players: Array<{ sleeperId: string; playerName: string; position: string; adpRank: number | null; gsisId?: string | null }>;
}): Promise<SyntheticRanking[]> {
  const advanced = await getNflverseWeeklyAdvanced(input.season, input.week).catch(() => []);
  const targetShareByGsis = new Map(
    advanced.filter((row) => row.targetShare !== undefined).map((row) => [row.gsisId, row.targetShare!])
  );

  return input.players.map((player) => {
    const targetShareTrend = player.gsisId ? targetShareByGsis.get(player.gsisId) ?? null : null;
    // Lower ADP rank is better; fold in target share as a small adjustment (more recent
    // usage nudges a player up relative to a stale preseason ADP).
    const adpComponent = player.adpRank ?? 300;
    const usageAdjustment = targetShareTrend ? targetShareTrend * -50 : 0;
    const compositeScore = adpComponent + usageAdjustment;

    return {
      sleeperId: player.sleeperId,
      playerName: player.playerName,
      position: player.position,
      adpRank: player.adpRank,
      targetShareTrend,
      compositeScore,
      source: "nflverse_synthetic" as const,
    };
  });
}
