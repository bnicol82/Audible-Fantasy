// Read-side queries against the tables the new sync jobs (src/lib/data-sources/sync.ts)
// populate. Kept separate from execute-tools.ts so the AI tool layer doesn't need to know
// about table shapes directly.

import { getDb } from "@/lib/db";

export type StoredGameConditions = {
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string | null;
  isOutdoor: boolean;
  weather: Record<string, unknown>;
  odds: Record<string, unknown>;
};

export async function getGameConditionsForTeams(
  season: number,
  week: number,
  teams: string[]
): Promise<StoredGameConditions[]> {
  if (!process.env.DATABASE_URL || !teams.length) return [];
  const db = getDb();
  const rows = (await db`
    select home_team, away_team, kickoff_utc, is_outdoor, weather, odds
    from game_conditions
    where season = ${season} and week = ${week}
      and (home_team = any(${teams}) or away_team = any(${teams}))
  `) as Array<{
    home_team: string;
    away_team: string;
    kickoff_utc: string | null;
    is_outdoor: boolean;
    weather: Record<string, unknown>;
    odds: Record<string, unknown>;
  }>;

  return rows.map((row) => ({
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    kickoffUtc: row.kickoff_utc,
    isOutdoor: row.is_outdoor,
    weather: row.weather,
    odds: row.odds,
  }));
}

export type StoredInjuryNews = {
  headline: string;
  body: string | null;
  publishedAt: string;
};

export async function getRecentInjuryNewsBySleeperIds(
  sleeperIds: string[]
): Promise<Map<string, StoredInjuryNews[]>> {
  const result = new Map<string, StoredInjuryNews[]>();
  if (!process.env.DATABASE_URL || !sleeperIds.length) return result;

  const db = getDb();
  const rows = (await db`
    select p.external_ids->>'sleeper' as sleeper_id, n.headline, n.body, n.published_at
    from news_items n
    join players p on p.id = n.player_id
    where p.external_ids->>'sleeper' = any(${sleeperIds})
    order by n.published_at desc
  `) as Array<{
    sleeper_id: string;
    headline: string;
    body: string | null;
    published_at: string;
  }>;

  for (const row of rows) {
    const list = result.get(row.sleeper_id) ?? [];
    list.push({ headline: row.headline, body: row.body, publishedAt: row.published_at });
    result.set(row.sleeper_id, list);
  }
  return result;
}

export type StoredExpertRanking = { rank: number; source: string };

export async function getExpertRankingsBySleeperIds(
  sleeperIds: string[],
  season: number,
  week: number
): Promise<Map<string, StoredExpertRanking>> {
  const result = new Map<string, StoredExpertRanking>();
  if (!process.env.DATABASE_URL || !sleeperIds.length) return result;

  const db = getDb();
  const rows = (await db`
    select p.external_ids->>'sleeper' as sleeper_id, proj.source, proj.raw->>'rank' as rank
    from projections proj
    join players p on p.id = proj.player_id
    where p.external_ids->>'sleeper' = any(${sleeperIds})
      and proj.season = ${season} and proj.week = ${week}
      and proj.source in ('fantasypros_ecr', 'nflverse_synthetic')
  `) as Array<{ sleeper_id: string; source: string; rank: string | null }>;

  for (const row of rows) {
    if (!row.rank) continue;
    result.set(row.sleeper_id, { rank: Number(row.rank), source: row.source });
  }
  return result;
}

export type StoredAdvancedStats = {
  targets?: number;
  targetShare?: number;
  airYardsShare?: number;
};

export async function getAdvancedStatsBySleeperIds(
  sleeperIds: string[],
  season: number,
  week: number
): Promise<Map<string, StoredAdvancedStats>> {
  const result = new Map<string, StoredAdvancedStats>();
  if (!process.env.DATABASE_URL || !sleeperIds.length) return result;

  const db = getDb();
  const rows = (await db`
    select p.external_ids->>'sleeper' as sleeper_id, ps.raw_stats
    from player_stats ps
    join players p on p.id = ps.player_id
    where p.external_ids->>'sleeper' = any(${sleeperIds})
      and ps.season = ${season} and ps.week = ${week}
  `) as Array<{ sleeper_id: string; raw_stats: Record<string, unknown> }>;

  for (const row of rows) {
    const raw = row.raw_stats ?? {};
    result.set(row.sleeper_id, {
      targets: typeof raw.targets === "number" ? raw.targets : undefined,
      targetShare: typeof raw.targetShare === "number" ? raw.targetShare : undefined,
      airYardsShare: typeof raw.airYardsShare === "number" ? raw.airYardsShare : undefined,
    });
  }
  return result;
}
