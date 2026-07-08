import { getDb } from "@/lib/db";
import {
  getSleeperNflState,
  getSleeperPlayers,
  getSleeperProjections,
  getSleeperTrendingAdds,
} from "@/lib/providers/sleeper";
import type { NormalizedRosterEntry } from "@/lib/providers/types";

export type CachedProjection = {
  playerId: string;
  sleeperId: string;
  name: string;
  position: string | null;
  team: string | null;
  projectedPoints: number;
  scoringFormat: string;
};

type SleeperProjectionRow = {
  player_id?: string;
  player?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    position?: string;
    team?: string;
    injury_status?: string;
  };
  stats?: {
    pts_ppr?: number;
    pts_half_ppr?: number;
    pts_std?: number;
  };
};

export function normalizeScoringFormat(format?: string) {
  const value = format?.toLowerCase() ?? "";
  if (value.includes("half")) return "half_ppr";
  if (value.includes("ppr")) return "ppr";
  if (value.includes("standard")) return "standard";
  return "half_ppr";
}

function pickProjectedPoints(
  stats: SleeperProjectionRow["stats"],
  scoringFormat: string
) {
  if (!stats) return 0;
  if (scoringFormat.includes("ppr") && !scoringFormat.includes("half")) {
    return stats.pts_ppr ?? stats.pts_half_ppr ?? stats.pts_std ?? 0;
  }
  if (scoringFormat.includes("half")) {
    return stats.pts_half_ppr ?? stats.pts_ppr ?? stats.pts_std ?? 0;
  }
  return stats.pts_std ?? stats.pts_half_ppr ?? stats.pts_ppr ?? 0;
}

export async function upsertPlayerBySleeperId(
  sleeperId: string,
  players?: Awaited<ReturnType<typeof getSleeperPlayers>>
) {
  const db = getDb();
  const allPlayers = players ?? (await getSleeperPlayers());
  const player = allPlayers[sleeperId];
  if (!player) return null;

  const existing = (await db`
    select id
    from players
    where external_ids->>'sleeper' = ${sleeperId}
    limit 1
  `) as Array<{ id: string }>;

  if (existing[0]?.id) {
    await db`
      update players
      set
        name = ${player.full_name ?? "Unknown"},
        team = ${player.team ?? null},
        position = ${player.position ?? null},
        status = ${player.injury_status ?? null},
        metadata = ${JSON.stringify({ injury_status: player.injury_status })}::jsonb,
        updated_at = now()
      where id = ${existing[0].id}::uuid
    `;
    return existing[0].id;
  }

  const inserted = (await db`
    insert into players (sport, name, team, position, status, external_ids, metadata)
    values (
      'nfl',
      ${player.full_name ?? "Unknown"},
      ${player.team ?? null},
      ${player.position ?? null},
      ${player.injury_status ?? null},
      ${JSON.stringify({ sleeper: sleeperId })}::jsonb,
      ${JSON.stringify({ injury_status: player.injury_status })}::jsonb
    )
    returning id
  `) as Array<{ id: string }>;

  return inserted[0]?.id ?? null;
}

export async function syncProjectionsForWeek(input?: {
  season?: number;
  week?: number;
  scoringFormat?: string;
}) {
  const nflState = await getSleeperNflState();
  const season = input?.season ?? Number(nflState.season);
  const week = input?.week ?? nflState.week;
  const scoringFormat = input?.scoringFormat ?? "half_ppr";

  const [rows, allPlayers] = await Promise.all([
    getSleeperProjections(season, week) as Promise<SleeperProjectionRow[]>,
    getSleeperPlayers(),
  ]);

  let playersUpserted = 0;
  let projectionsUpserted = 0;
  const db = getDb();

  for (const row of rows) {
    const sleeperId = row.player_id ?? "";
    if (!sleeperId) continue;

    const playerId = await upsertPlayerBySleeperId(sleeperId, allPlayers);
    if (!playerId) continue;
    playersUpserted += 1;

    const projectedPoints = pickProjectedPoints(row.stats, scoringFormat);
    await db`
      insert into projections (player_id, season, week, source, raw)
      values (
        ${playerId}::uuid,
        ${season},
        ${week},
        'sleeper',
        ${JSON.stringify({ ...row, projectedPoints, scoringFormat })}::jsonb
      )
      on conflict (player_id, season, week, source) do update set
        raw = excluded.raw
    `;
    projectionsUpserted += 1;
  }

  return {
    season,
    week,
    scoringFormat,
    playersUpserted,
    projectionsUpserted,
  };
}

export async function syncTrendingPlayers(limit = 50) {
  const [trending, allPlayers] = await Promise.all([
    getSleeperTrendingAdds(48, limit),
    getSleeperPlayers(),
  ]);
  let synced = 0;

  for (const entry of trending) {
    const playerId = await upsertPlayerBySleeperId(entry.player_id, allPlayers);
    if (playerId) synced += 1;
  }

  return { synced };
}

export async function getProjectionsBySleeperIds(input: {
  sleeperIds: string[];
  season: number;
  week: number;
  scoringFormat?: string;
}) {
  if (!input.sleeperIds.length || !process.env.DATABASE_URL) return [];

  const db = getDb();
  const rows = (await db`
    select
      p.id as player_id,
      p.external_ids->>'sleeper' as sleeper_id,
      p.name,
      p.position,
      p.team,
      proj.raw
    from players p
    join projections proj on proj.player_id = p.id
    where p.external_ids->>'sleeper' = any(${input.sleeperIds})
      and proj.season = ${input.season}
      and proj.week = ${input.week}
      and proj.source = 'sleeper'
  `) as Array<{
    player_id: string;
    sleeper_id: string;
    name: string;
    position: string | null;
    team: string | null;
    raw: { projectedPoints?: number; stats?: SleeperProjectionRow["stats"] };
  }>;

  const scoringFormat = input.scoringFormat ?? "half_ppr";

  return rows.map((row) => ({
    playerId: row.player_id,
    sleeperId: row.sleeper_id,
    name: row.name,
    position: row.position,
    team: row.team,
    projectedPoints:
      row.raw.projectedPoints ??
      pickProjectedPoints(row.raw.stats, scoringFormat),
    scoringFormat,
  })) satisfies CachedProjection[];
}

export async function enrichRosterWithProjections(input: {
  roster: NormalizedRosterEntry[];
  season: number;
  week: number;
  scoringFormat?: string;
}) {
  const sleeperIds = input.roster.map((entry) => entry.playerExternalId);
  const projections = await getProjectionsBySleeperIds({
    sleeperIds,
    season: input.season,
    week: input.week,
    scoringFormat: input.scoringFormat,
  });
  const bySleeperId = new Map(
    projections.map((projection) => [projection.sleeperId, projection.projectedPoints])
  );

  return input.roster.map((entry) => ({
    ...entry,
    projectedPoints: bySleeperId.get(entry.playerExternalId) ?? null,
  }));
}

export async function getCacheStatus() {
  const db = getDb();
  const playerCountRows = (await db`
    select count(*)::int as count from players
  `) as Array<{ count: number }>;
  const projectionCountRows = (await db`
    select count(*)::int as count from projections
  `) as Array<{ count: number }>;
  const latest = (await db`
    select season, week, max((raw->>'projectedPoints')::float) as max_proj
    from projections
    where source = 'sleeper'
    group by season, week
    order by season desc, week desc
    limit 1
  `) as Array<{ season: number; week: number }>;

  const nflState = await getSleeperNflState().catch(() => null);

  return {
    players: playerCountRows[0]?.count ?? 0,
    projections: projectionCountRows[0]?.count ?? 0,
    latestWeek: latest[0],
    nflState,
  };
}

export async function runCacheSync(input?: {
  season?: number;
  week?: number;
  scoringFormat?: string;
}) {
  const [projections, trending] = await Promise.all([
    syncProjectionsForWeek(input),
    syncTrendingPlayers(50),
  ]);

  return { projections, trending };
}
