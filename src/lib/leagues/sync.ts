import { getDb } from "@/lib/db";
import { phaseFromLeagueStatus, type AppPhase } from "@/lib/app-phase";
import { enrichRosterWithProjections } from "@/lib/cache/players";
import {
  getSleeperLeague,
  getSleeperLeagueUsers,
  getSleeperMatchups,
  getSleeperNflState,
  getSleeperPlayers,
  getSleeperRosters,
  getSleeperUser,
  mapLeagueRules,
  normalizeUserRosterEntries,
} from "@/lib/providers/sleeper";
import type {
  LeagueMeta,
  LeagueRules,
  NormalizedRosterEntry,
  ScoringSettings,
} from "@/lib/providers/types";

export type SyncedLeagueSummary = {
  leagueId: string;
  externalLeagueId: string;
  name: string;
  scoring: string;
  scoringSettings: ScoringSettings;
  rules: LeagueRules;
  season: number;
  week: number;
  record: string;
  teamName: string;
  leagueStatus: string;
  phase: AppPhase;
  draftId?: string;
  sleeperUserId?: string;
  externalRosterId?: string;
  roster: NormalizedRosterEntry[];
  matchup: {
    yourTeam: string;
    opponent: string;
    yourPoints: number;
    opponentPoints: number;
    winProbability: number;
    kickoff: string;
  } | null;
};

function formatScoring(format: string) {
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

function estimateWinProbability(yourPoints: number, opponentPoints: number) {
  const diff = yourPoints - opponentPoints;
  const probability = 50 + diff * 2.5;
  return Math.max(5, Math.min(95, Math.round(probability)));
}

export async function syncSleeperLeague(input: {
  profileId: string;
  username: string;
  externalLeagueId: string;
  season?: number;
}) {
  const db = getDb();

  const [sleeperUser, league, nflState, rosters, users, players] =
    await Promise.all([
      getSleeperUser(input.username),
      getSleeperLeague(input.externalLeagueId),
      getSleeperNflState(),
      getSleeperRosters(input.externalLeagueId),
      getSleeperLeagueUsers(input.externalLeagueId),
      getSleeperPlayers(),
    ]);

  const scoringSettings: ScoringSettings = {
    format:
      (league.scoring_settings.rec ?? 0) >= 1
        ? "ppr"
        : (league.scoring_settings.rec ?? 0) >= 0.5
          ? "half_ppr"
          : (league.scoring_settings.rec ?? 0) > 0
            ? "custom"
            : "standard",
    raw: league.scoring_settings,
  };

  const rosterSlots = league.roster_positions.reduce<
    Array<{ slot: string; count: number }>
  >((acc, slot) => {
    const existing = acc.find((item) => item.slot === slot);
    if (existing) existing.count += 1;
    else acc.push({ slot, count: 1 });
    return acc;
  }, []);

  const rules = mapLeagueRules(league.settings);

  await db`
    insert into profiles (id, display_name, sleeper_username, sleeper_user_id)
    values (
      ${input.profileId}::uuid,
      ${sleeperUser.display_name},
      ${input.username},
      ${sleeperUser.user_id}
    )
    on conflict (id) do update set
      display_name = excluded.display_name,
      sleeper_username = excluded.sleeper_username,
      sleeper_user_id = excluded.sleeper_user_id,
      updated_at = now()
  `;

  const leagueRows = (await db`
    insert into leagues (
      user_id,
      platform,
      external_league_id,
      sport,
      name,
      scoring_settings,
      roster_slots,
      rules,
      season,
      synced_at
    )
    values (
      ${input.profileId}::uuid,
      'sleeper',
      ${input.externalLeagueId},
      'nfl',
      ${league.name},
      ${JSON.stringify(scoringSettings)}::jsonb,
      ${JSON.stringify(rosterSlots)}::jsonb,
      ${JSON.stringify(rules)}::jsonb,
      ${Number(league.season)},
      now()
    )
    on conflict (user_id, platform, external_league_id) do update set
      name = excluded.name,
      scoring_settings = excluded.scoring_settings,
      roster_slots = excluded.roster_slots,
      rules = excluded.rules,
      season = excluded.season,
      synced_at = now()
    returning id
  `) as { id: string }[];

  const leagueId = leagueRows[0]?.id;
  if (!leagueId) {
    throw new Error("Failed to save league");
  }

  const normalizedRosters = rosters.map((roster) =>
    normalizeUserRosterEntries(roster, users, players, league.roster_positions)
  );

  for (const roster of normalizedRosters) {
    await db`
      insert into rosters (
        league_id,
        external_roster_id,
        team_name,
        owner_name,
        entries,
        synced_at
      )
      values (
        ${leagueId}::uuid,
        ${roster.externalRosterId},
        ${roster.teamName},
        ${roster.ownerName},
        ${JSON.stringify(roster.entries)}::jsonb,
        now()
      )
      on conflict (league_id, external_roster_id) do update set
        team_name = excluded.team_name,
        owner_name = excluded.owner_name,
        entries = excluded.entries,
        synced_at = now()
    `;
  }

  const userRoster = rosters.find((r) => r.owner_id === sleeperUser.user_id);
  if (!userRoster) {
    throw new Error("Could not find your roster in this league");
  }

  const userNormalized = normalizeUserRosterEntries(
    userRoster,
    users,
    players,
    league.roster_positions
  );

  const week = nflState.week;
  const matchups = await getSleeperMatchups(input.externalLeagueId, week);
  const userMatchup = matchups.find((m) => m.roster_id === userRoster.roster_id);
  let matchup: SyncedLeagueSummary["matchup"] = null;

  if (userMatchup) {
    const opponentMatchup = matchups.find(
      (m) =>
        m.matchup_id === userMatchup.matchup_id &&
        m.roster_id !== userRoster.roster_id
    );
    const opponentRoster = opponentMatchup
      ? rosters.find((r) => r.roster_id === opponentMatchup.roster_id)
      : null;
    const opponentUser = opponentRoster
      ? users.find((u) => u.user_id === opponentRoster.owner_id)
      : null;
    const opponentName =
      opponentUser?.metadata?.team_name ??
      opponentUser?.display_name ??
      "Opponent";

    matchup = {
      yourTeam: userNormalized.teamName,
      opponent: opponentName,
      yourPoints: userMatchup.points ?? 0,
      opponentPoints: opponentMatchup?.points ?? 0,
      winProbability: estimateWinProbability(
        userMatchup.points ?? 0,
        opponentMatchup?.points ?? 0
      ),
      kickoff: `WK ${week}`,
    };
  }

  return {
    leagueId,
    externalLeagueId: input.externalLeagueId,
    name: league.name,
    scoring: formatScoring(scoringSettings.format),
    scoringSettings,
    rules,
    season: Number(league.season),
    week,
    record: `${userNormalized.wins}–${userNormalized.losses}`,
    teamName: userNormalized.teamName,
    leagueStatus: league.status ?? "pre_draft",
    phase: phaseFromLeagueStatus(league.status),
    draftId: league.draft_id,
    sleeperUserId: sleeperUser.user_id,
    externalRosterId: userNormalized.externalRosterId,
    roster: userNormalized.entries,
    matchup,
  } satisfies SyncedLeagueSummary;
}

export async function getActiveLeague(profileId: string, leagueId: string) {
  const db = getDb();

  const leagueRows = (await db`
    select
      l.id,
      l.external_league_id,
      l.name,
      l.scoring_settings,
      l.season,
      p.sleeper_user_id,
      p.sleeper_username
    from leagues l
    join profiles p on p.id = l.user_id
    where l.id = ${leagueId}::uuid
      and l.user_id = ${profileId}::uuid
    limit 1
  `) as Array<{
    id: string;
    external_league_id: string;
    name: string;
    scoring_settings: ScoringSettings;
    season: number;
    sleeper_user_id: string;
    sleeper_username: string;
  }>;

  const league = leagueRows[0];

  if (!league) {
    return null;
  }

  const rosterRows = (await db`
    select external_roster_id, team_name, owner_name, entries
    from rosters
    where league_id = ${leagueId}::uuid
  `) as Array<{
    external_roster_id: string;
    team_name: string;
    owner_name: string;
    entries: NormalizedRosterEntry[];
  }>;

  const [nflState, sleeperRosters, users, liveLeague] = await Promise.all([
    getSleeperNflState(),
    getSleeperRosters(league.external_league_id),
    getSleeperLeagueUsers(league.external_league_id),
    getSleeperLeague(league.external_league_id),
  ]);

  const week = nflState.week;
  const liveMatchups = await getSleeperMatchups(league.external_league_id, week);

  const userSleeperRoster = sleeperRosters.find(
    (r) => r.owner_id === league.sleeper_user_id
  );

  const rosterRow = rosterRows.find(
    (row) =>
      row.external_roster_id === String(userSleeperRoster?.roster_id ?? "")
  );

  if (!rosterRow || !userSleeperRoster) {
    return null;
  }

  const wins = userSleeperRoster.settings?.wins ?? 0;
  const losses = userSleeperRoster.settings?.losses ?? 0;

  const userMatchup = liveMatchups.find(
    (m) => m.roster_id === userSleeperRoster.roster_id
  );

  let matchup: SyncedLeagueSummary["matchup"] = null;
  if (userMatchup) {
    const opponentMatchup = liveMatchups.find(
      (m) =>
        m.matchup_id === userMatchup.matchup_id &&
        m.roster_id !== userSleeperRoster.roster_id
    );
    const opponentRoster = opponentMatchup
      ? sleeperRosters.find((r) => r.roster_id === opponentMatchup.roster_id)
      : null;
    const opponentUser = opponentRoster
      ? users.find((u) => u.user_id === opponentRoster.owner_id)
      : null;

    matchup = {
      yourTeam: rosterRow.team_name,
      opponent:
        opponentUser?.metadata?.team_name ??
        opponentUser?.display_name ??
        "Opponent",
      yourPoints: userMatchup.points ?? 0,
      opponentPoints: opponentMatchup?.points ?? 0,
      winProbability: estimateWinProbability(
        userMatchup.points ?? 0,
        opponentMatchup?.points ?? 0
      ),
      kickoff: `WK ${week}`,
    };
  }

  const scoringSettings: ScoringSettings = league.scoring_settings?.format
    ? league.scoring_settings
    : { format: "half_ppr", raw: {} };
  const rules = mapLeagueRules(liveLeague.settings);

  return {
    leagueId: league.id,
    externalLeagueId: league.external_league_id,
    name: league.name,
    scoring: formatScoring(scoringSettings.format),
    scoringSettings,
    rules,
    season: league.season,
    week,
    record: `${wins}–${losses}`,
    teamName: rosterRow.team_name,
    leagueStatus: liveLeague.status ?? "pre_draft",
    phase: phaseFromLeagueStatus(liveLeague.status),
    draftId: liveLeague.draft_id,
    sleeperUserId: league.sleeper_user_id,
    externalRosterId: rosterRow.external_roster_id,
    roster: await enrichRosterWithProjections({
      roster: rosterRow.entries,
      season: league.season,
      week,
      scoringSettings,
    }),
    matchup,
  } satisfies SyncedLeagueSummary;
}

export type { LeagueMeta };
