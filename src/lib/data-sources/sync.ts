// DB-writing sync jobs for the new external data sources. Kept separate from
// src/lib/cache/players.ts (which orchestrates all sync jobs via runCacheSync) to avoid a
// circular import — this module never imports back from cache/players.ts.

import { getDb } from "@/lib/db";
import { getSleeperPlayers } from "@/lib/providers/sleeper";
import { getNflverseWeeklyAdvanced } from "./nflverse";
import { getWeeklySchedule } from "./schedule";
import { getGameWeather } from "./weather";
import { getWeeklyOdds } from "./odds";
import { getInjuryReport } from "./injuries";
import { getSyntheticConsensusRankings, isExpertRankingsLicensed } from "./expert-rankings";

export async function syncNflverseWeeklyAdvanced(season: number, week: number) {
  const db = getDb();
  const rows = await getNflverseWeeklyAdvanced(season, week);
  let matched = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.gsisId) {
      skipped += 1;
      continue;
    }

    const playerRows = (await db`
      select id from players where external_ids->>'gsis' = ${row.gsisId} limit 1
    `) as Array<{ id: string }>;
    const playerId = playerRows[0]?.id;
    if (!playerId) {
      skipped += 1;
      continue;
    }

    await db`
      insert into player_stats (player_id, season, week, raw_stats)
      values (${playerId}::uuid, ${season}, ${week}, ${JSON.stringify(row)}::jsonb)
      on conflict (player_id, season, week) do update set
        raw_stats = player_stats.raw_stats || excluded.raw_stats
    `;
    matched += 1;
  }

  return { matched, skipped, total: rows.length };
}

export async function syncGameConditionsForWeek(season: number, week: number) {
  const db = getDb();
  const games = await getWeeklySchedule(season, week);
  const odds = await getWeeklyOdds(season, week).catch(() => []);
  const oddsByMatchup = new Map(odds.map((entry) => [`${entry.homeTeam}-${entry.awayTeam}`, entry]));

  let updated = 0;
  for (const game of games) {
    let weather = null;
    if (game.isOutdoor && game.lat !== null && game.lon !== null && game.kickoffUtc) {
      weather = await getGameWeather({
        lat: game.lat,
        lon: game.lon,
        kickoffUtc: game.kickoffUtc,
      }).catch(() => null);
    }
    const gameOdds = oddsByMatchup.get(`${game.homeTeam}-${game.awayTeam}`) ?? null;

    await db`
      insert into game_conditions (
        season, week, home_team, away_team, kickoff_utc, is_outdoor, weather, odds, updated_at
      )
      values (
        ${season}, ${week}, ${game.homeTeam}, ${game.awayTeam},
        ${game.kickoffUtc}, ${game.isOutdoor},
        ${JSON.stringify(weather ?? {})}::jsonb,
        ${JSON.stringify(gameOdds ?? {})}::jsonb,
        now()
      )
      on conflict (season, week, home_team, away_team) do update set
        kickoff_utc = excluded.kickoff_utc,
        is_outdoor = excluded.is_outdoor,
        weather = excluded.weather,
        odds = excluded.odds,
        updated_at = now()
    `;
    updated += 1;
  }

  return { updated, total: games.length };
}

export async function syncInjuryReports(season: number, week: number) {
  const db = getDb();
  const reports = await getInjuryReport(season, week);
  let matched = 0;
  let skipped = 0;

  for (const report of reports) {
    const playerRows = (await db`
      select id from players where external_ids->>'gsis' = ${report.gsisId} limit 1
    `) as Array<{ id: string }>;
    const playerId = playerRows[0]?.id;
    if (!playerId) {
      skipped += 1;
      continue;
    }

    const headline = `${report.playerName} (${report.team}) — ${report.reportStatus ?? "Injury update"}`;
    const body =
      [report.bodyPart, report.practiceParticipation ? `Practice: ${report.practiceParticipation}` : null]
        .filter(Boolean)
        .join(". ") || null;

    // No unique constraint on news_items — dedupe manually so a re-run of the same sync
    // (3x/day cron) doesn't spam duplicate rows for an unchanged status.
    const alreadyReported = (await db`
      select id from news_items
      where player_id = ${playerId}::uuid
        and headline = ${headline}
        and published_at > now() - interval '20 hours'
      limit 1
    `) as Array<{ id: string }>;
    if (alreadyReported.length) {
      skipped += 1;
      continue;
    }

    await db`
      insert into news_items (player_id, headline, body, source, published_at)
      values (${playerId}::uuid, ${headline}, ${body}, 'nflverse_injury_report', now())
    `;
    matched += 1;
  }

  return { matched, skipped, total: reports.length };
}

// Writes a ranking into `projections` under a distinct `source` value — real ECR when
// FANTASYPROS_API_KEY is licensed, otherwise the clearly-labeled synthetic fallback. Reuses
// the existing multi-source support on `projections` (unique on player/season/week/source)
// rather than a new table.
export async function syncExpertRankings(season: number, week: number) {
  const db = getDb();
  const rows = (await db`
    select p.id as player_id, p.external_ids->>'sleeper' as sleeper_id,
           p.external_ids->>'gsis' as gsis_id, p.name, p.position
    from players p
    where p.position = any(array['QB','RB','WR','TE'])
      and p.external_ids ? 'sleeper'
  `) as Array<{
    player_id: string;
    sleeper_id: string | null;
    gsis_id: string | null;
    name: string;
    position: string;
  }>;

  if (!rows.length) return { ranked: 0 };

  const sleeperPlayers = await getSleeperPlayers();
  const candidates = rows
    .filter((row): row is typeof row & { sleeper_id: string } => Boolean(row.sleeper_id))
    .map((row) => ({
      sleeperId: row.sleeper_id,
      playerName: row.name,
      position: row.position,
      adpRank: sleeperPlayers[row.sleeper_id]?.search_rank ?? null,
      gsisId: row.gsis_id,
    }));

  const rankings = await getSyntheticConsensusRankings({ season, week, players: candidates });
  const sortedBySleeperId = new Map(rows.map((row) => [row.sleeper_id, row.player_id]));
  const source = isExpertRankingsLicensed() ? "fantasypros_ecr" : "nflverse_synthetic";

  const ranked = [...rankings].sort((a, b) => a.compositeScore - b.compositeScore);
  let count = 0;

  for (const [index, ranking] of ranked.entries()) {
    const playerId = sortedBySleeperId.get(ranking.sleeperId);
    if (!playerId) continue;

    await db`
      insert into projections (player_id, season, week, source, raw)
      values (
        ${playerId}::uuid, ${season}, ${week}, ${source},
        ${JSON.stringify({ rank: index + 1, ...ranking })}::jsonb
      )
      on conflict (player_id, season, week, source) do update set
        raw = excluded.raw
    `;
    count += 1;
  }

  return { ranked: count, source };
}
