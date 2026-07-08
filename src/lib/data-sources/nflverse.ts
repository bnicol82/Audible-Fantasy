// nflverse (https://github.com/nflverse/nflverse-data) publishes free, public NFL data as
// versioned CSV releases — no auth, no ToS restriction, no scraping. This is the backbone
// "free public data" source called for in the data-sourcing decision.
//
// NOTE: this environment's outbound network access does not reach github.com, so the exact
// CSV column names below could not be verified live against a current release. They're
// modeled on nflverse's long-stable `player_stats`, `snap_counts`, `injuries`, and
// `schedules` release schemas (nflreadr::load_player_stats() / load_snap_counts() /
// load_injuries() / load_schedules()). Verify column names against a live download before
// depending on this in production — a schema drift here fails soft (missing fields come
// back `undefined`), but should be checked with a real fetch in an environment with
// internet access.

import { fetchText } from "./http";

const NFLVERSE_RELEASES = "https://github.com/nflverse/nflverse-data/releases/download";

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // handled by the following \n
    } else if (char === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...dataRows] = rows;
  if (!header) return [];
  return dataRows.map((cols) =>
    Object.fromEntries(header.map((key, index) => [key, cols[index] ?? ""]))
  );
}

function numOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function fetchNflverseCsv(
  releaseTag: string,
  filename: string
): Promise<Record<string, string>[]> {
  const url = `${NFLVERSE_RELEASES}/${releaseTag}/${filename}`;
  const text = await fetchText(url);
  return parseCsv(text);
}

export type NflverseAdvancedStat = {
  gsisId: string;
  playerName: string;
  team: string;
  season: number;
  week: number;
  targets?: number;
  targetShare?: number;
  airYardsShare?: number;
  receivingAirYards?: number;
  receivingYardsAfterCatch?: number;
  carries?: number;
  rushingEpa?: number;
  receivingEpa?: number;
};

// Release tag "player_stats", one CSV per season: player_stats_<season>.csv
export async function getNflverseWeeklyAdvanced(
  season: number,
  week: number
): Promise<NflverseAdvancedStat[]> {
  const rows = await fetchNflverseCsv("player_stats", `player_stats_${season}.csv`);
  return rows
    .filter((row) => Number(row.week) === week && row.season_type !== "POST")
    .map((row) => ({
      gsisId: row.player_id,
      playerName: row.player_display_name || row.player_name || "",
      team: row.recent_team || row.team || "",
      season,
      week,
      targets: numOrUndefined(row.targets),
      targetShare: numOrUndefined(row.target_share),
      airYardsShare: numOrUndefined(row.air_yards_share),
      receivingAirYards: numOrUndefined(row.receiving_air_yards),
      receivingYardsAfterCatch: numOrUndefined(row.receiving_yards_after_catch),
      carries: numOrUndefined(row.carries),
      rushingEpa: numOrUndefined(row.rushing_epa),
      receivingEpa: numOrUndefined(row.receiving_epa),
    }));
}

export type NflverseSnapCount = {
  gsisId?: string;
  playerName: string;
  team: string;
  season: number;
  week: number;
  offenseSnaps?: number;
  offensePct?: number;
};

// Release tag "snap_counts", one CSV per season: snap_counts_<season>.csv
export async function getNflverseSnapCounts(
  season: number,
  week: number
): Promise<NflverseSnapCount[]> {
  const rows = await fetchNflverseCsv("snap_counts", `snap_counts_${season}.csv`);
  return rows
    .filter((row) => Number(row.week) === week)
    .map((row) => ({
      gsisId: row.pfr_player_id || undefined,
      playerName: row.player || "",
      team: row.team || "",
      season,
      week,
      offenseSnaps: numOrUndefined(row.offense_snaps),
      offensePct: numOrUndefined(row.offense_pct),
    }));
}

export type NflverseInjuryReportRow = {
  gsisId: string;
  playerName: string;
  team: string;
  season: number;
  week: number;
  position?: string;
  reportStatus?: string;
  practiceStatus?: string;
  primaryInjury?: string;
  secondaryInjury?: string;
  dateModified?: string;
};

// Release tag "injuries", one CSV per season: injuries_<season>.csv
export async function getNflverseInjuryReport(
  season: number,
  week: number
): Promise<NflverseInjuryReportRow[]> {
  const rows = await fetchNflverseCsv("injuries", `injuries_${season}.csv`);
  return rows
    .filter((row) => Number(row.week) === week)
    .map((row) => ({
      gsisId: row.gsis_id,
      playerName: row.full_name || "",
      team: row.team || "",
      season,
      week,
      position: row.position || undefined,
      reportStatus: row.report_status || undefined,
      practiceStatus: row.practice_status || undefined,
      primaryInjury: row.report_primary_injury || undefined,
      secondaryInjury: row.report_secondary_injury || undefined,
      dateModified: row.date_modified || undefined,
    }));
}

export type NflverseGame = {
  gameId: string;
  season: number;
  week: number;
  gameday: string;
  gametime?: string;
  homeTeam: string;
  awayTeam: string;
  roof?: string;
  surface?: string;
  stadium?: string;
  spreadLine?: number;
  totalLine?: number;
};

// Release tag "schedules", filename games.csv covers all seasons.
export async function getNflverseSchedule(season: number, week?: number): Promise<NflverseGame[]> {
  const rows = await fetchNflverseCsv("schedules", "games.csv");
  return rows
    .filter(
      (row) =>
        Number(row.season) === season &&
        row.game_type === "REG" &&
        (week === undefined || Number(row.week) === week)
    )
    .map((row) => ({
      gameId: row.game_id,
      season,
      week: Number(row.week),
      gameday: row.gameday,
      gametime: row.gametime || undefined,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      roof: row.roof || undefined,
      surface: row.surface || undefined,
      stadium: row.stadium || undefined,
      spreadLine: numOrUndefined(row.spread_line),
      totalLine: numOrUndefined(row.total_line),
    }));
}
