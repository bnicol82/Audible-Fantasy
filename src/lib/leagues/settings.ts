import { league as demoLeague, matchup as demoMatchup } from "@/lib/data";
import { getDb } from "@/lib/db";
import { getSleeperLeague } from "@/lib/providers/sleeper";

export type SettingsRow = {
  label: string;
  value: string;
};

export type LeagueSettingsPayload = {
  source: "live" | "demo";
  leagueName: string;
  teamName: string;
  platform: string;
  season: number;
  leagueStatus: string;
  scoringFormat: string;
  sleeperUsername?: string | null;
  rosterSlots: SettingsRow[];
  scoringRules: SettingsRow[];
};

const SCORING_LABELS: Record<string, string> = {
  rec: "Reception",
  pass_yd: "Passing yard",
  pass_td: "Passing TD",
  pass_int: "Interception",
  rush_yd: "Rushing yard",
  rush_td: "Rushing TD",
  rec_yd: "Receiving yard",
  rec_td: "Receiving TD",
  fum_lost: "Fumble lost",
  fum: "Fumble",
  two_pt: "2-pt conversion",
  bonus_rec_te: "TE premium",
};

function formatScoring(format?: string) {
  switch (format) {
    case "ppr":
      return "PPR";
    case "half_ppr":
      return "Half PPR";
    case "standard":
      return "Standard";
    default:
      return "Custom";
  }
}

function formatLeagueStatus(status?: string) {
  switch (status) {
    case "pre_draft":
      return "Pre-draft";
    case "drafting":
      return "Drafting";
    case "in_season":
      return "In season";
    case "complete":
      return "Complete";
    default:
      return status ?? "Unknown";
  }
}

function formatPoints(value: number, key: string) {
  if (key.includes("_yd")) {
    return `${value} pt${value === 1 ? "" : "s"} / yard`;
  }
  if (value > 0) return `+${value}`;
  return String(value);
}

export function formatScoringRules(raw: Record<string, number>) {
  const priority = [
    "rec",
    "pass_yd",
    "pass_td",
    "pass_int",
    "rush_yd",
    "rush_td",
    "rec_yd",
    "rec_td",
    "fum_lost",
    "two_pt",
    "bonus_rec_te",
  ];

  const rows: SettingsRow[] = [];
  const seen = new Set<string>();

  for (const key of priority) {
    const value = raw[key];
    if (value === undefined || value === 0) continue;
    rows.push({
      label: SCORING_LABELS[key] ?? key.replaceAll("_", " "),
      value: formatPoints(value, key),
    });
    seen.add(key);
  }

  for (const [key, value] of Object.entries(raw)) {
    if (seen.has(key) || value === 0) continue;
    rows.push({
      label: SCORING_LABELS[key] ?? key.replaceAll("_", " "),
      value: formatPoints(value, key),
    });
  }

  return rows.slice(0, 12);
}

function demoSettings(): LeagueSettingsPayload {
  return {
    source: "demo",
    leagueName: demoLeague.name,
    teamName: demoMatchup.yourTeam,
    platform: "Sleeper",
    season: new Date().getFullYear(),
    leagueStatus: "In season",
    scoringFormat: demoLeague.scoring,
    sleeperUsername: null,
    rosterSlots: [
      { label: "QB", value: "1" },
      { label: "RB", value: "2" },
      { label: "WR", value: "2" },
      { label: "TE", value: "1" },
      { label: "FLEX", value: "1" },
      { label: "K", value: "1" },
      { label: "DEF", value: "1" },
      { label: "BN", value: "6" },
    ],
    scoringRules: [
      { label: "Reception", value: "+0.5" },
      { label: "Passing yard", value: "0.04 pts / yard" },
      { label: "Passing TD", value: "+4" },
      { label: "Interception", value: "-1" },
      { label: "Rushing yard", value: "0.1 pts / yard" },
      { label: "Rushing TD", value: "+6" },
      { label: "Receiving yard", value: "0.1 pts / yard" },
      { label: "Receiving TD", value: "+6" },
      { label: "Fumble lost", value: "-2" },
    ],
  };
}

export async function getLeagueSettings(input: {
  profileId?: string;
  leagueId?: string;
}) {
  if (!input.profileId || !input.leagueId || !process.env.DATABASE_URL) {
    return demoSettings();
  }

  try {
    const db = getDb();
    const rows = (await db`
      select
        l.name,
        l.platform,
        l.season,
        l.scoring_settings,
        l.roster_slots,
        l.external_league_id,
        p.sleeper_username,
        p.sleeper_user_id
      from leagues l
      join profiles p on p.id = l.user_id
      where l.id = ${input.leagueId}::uuid
        and l.user_id = ${input.profileId}::uuid
      limit 1
    `) as Array<{
      name: string;
      platform: string;
      season: number;
      scoring_settings: { format?: string; raw?: Record<string, number> };
      roster_slots: Array<{ slot: string; count: number }>;
      external_league_id: string;
      sleeper_username: string | null;
      sleeper_user_id: string;
    }>;

    const league = rows[0];
    if (!league) return demoSettings();

    const rosterRows = (await db`
      select team_name, external_roster_id
      from rosters
      where league_id = ${input.leagueId}::uuid
    `) as Array<{ team_name: string; external_roster_id: string }>;

    const liveLeague = await getSleeperLeague(league.external_league_id).catch(
      () => null
    );

    let teamName = rosterRows[0]?.team_name ?? "Your team";
    if (liveLeague) {
      const { getSleeperRosters } = await import("@/lib/providers/sleeper");
      const rosters = await getSleeperRosters(league.external_league_id).catch(
        () => []
      );
      const userRoster = rosters.find((r) => r.owner_id === league.sleeper_user_id);
      if (userRoster) {
        const row = rosterRows.find(
          (entry) => entry.external_roster_id === String(userRoster.roster_id)
        );
        teamName = row?.team_name ?? teamName;
      }
    }

    const rawScoring =
      league.scoring_settings?.raw ??
      liveLeague?.scoring_settings ??
      ({} as Record<string, number>);

    const rosterSlots = (league.roster_slots ?? []).map((slot) => ({
      label: slot.slot,
      value: String(slot.count),
    }));

    if (!rosterSlots.length && liveLeague?.roster_positions) {
      const counts = new Map<string, number>();
      for (const slot of liveLeague.roster_positions) {
        counts.set(slot, (counts.get(slot) ?? 0) + 1);
      }
      for (const [slot, count] of counts.entries()) {
        rosterSlots.push({ label: slot, value: String(count) });
      }
    }

    return {
      source: "live" as const,
      leagueName: league.name,
      teamName,
      platform: league.platform.toUpperCase(),
      season: league.season,
      leagueStatus: formatLeagueStatus(liveLeague?.status),
      scoringFormat: formatScoring(league.scoring_settings?.format),
      sleeperUsername: league.sleeper_username,
      rosterSlots,
      scoringRules: formatScoringRules(rawScoring),
    };
  } catch {
    return demoSettings();
  }
}
