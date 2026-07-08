import type { LeagueRules, RosterStatus } from "@/lib/providers/types";

const SLEEPER_API = "https://api.sleeper.app/v1";

// Permissive bag for the many raw counting-stat fields Sleeper's stats/projections
// endpoints return (pass_yd, rec, fum_lost, ...) that the app doesn't otherwise model by
// name. `unknown` (not `number | undefined`) avoids index-signature conflicts with the
// explicit typed fields declared alongside it — narrow with `toRawStatLine()` before
// feeding into the scoring engine.
export type SleeperStatBlob = { [key: string]: unknown };

type SleeperUser = { user_id: string; display_name: string; username: string };
type SleeperLeagueSettings = {
  waiver_type?: number; // 0 = rolling waivers, 1 = FAAB, 2 = reverse-standings
  waiver_budget?: number;
  taxi_slots?: number;
  reserve_slots?: number;
  playoff_week_start?: number;
  playoff_teams?: number;
  num_teams?: number;
  trade_deadline?: number;
  daily_waivers?: number;
};
type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  status?: string;
  draft_id?: string;
  scoring_settings: Record<string, number>;
  roster_positions: string[];
  settings?: SleeperLeagueSettings;
};
type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  players: string[];
  starters: string[];
  reserve?: string[] | null;
  taxi?: string[] | null;
  settings?: { wins?: number; losses?: number; fpts?: number };
};
type SleeperLeagueUser = {
  user_id: string;
  display_name: string;
  metadata?: { team_name?: string };
};
type SleeperPlayer = {
  player_id?: string;
  full_name?: string;
  position?: string;
  team?: string;
  injury_status?: string;
  search_rank?: number;
  fantasy_positions?: string[];
  gsis_id?: string;
};

async function sleeperFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_API}${path}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`Sleeper API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

function mapScoring(settings: Record<string, number>) {
  const rec = settings.rec ?? 0;
  const format =
    rec >= 1 ? "ppr" : rec >= 0.5 ? "half_ppr" : rec > 0 ? "custom" : "standard";
  return { format, raw: settings } as const;
}

export function mapLeagueRules(settings?: SleeperLeagueSettings): LeagueRules {
  const waiverType =
    settings?.waiver_type === 1
      ? "faab"
      : settings?.waiver_type === 2
        ? "reverse_standings"
        : "rolling";

  return {
    waiverType,
    faabBudget: waiverType === "faab" ? (settings?.waiver_budget ?? 100) : null,
    taxiSlots: settings?.taxi_slots ?? 0,
    irSlots: settings?.reserve_slots ?? 0,
    playoffWeekStart: settings?.playoff_week_start ?? null,
    playoffTeams: settings?.playoff_teams ?? null,
    tradeDeadlineWeek: settings?.trade_deadline ?? null,
  };
}

function slotCounts(positions: string[]) {
  const counts = new Map<string, number>();
  for (const pos of positions) {
    counts.set(pos, (counts.get(pos) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([slot, count]) => ({ slot, count }));
}

export async function getSleeperUser(username: string) {
  return sleeperFetch<SleeperUser>(`/user/${encodeURIComponent(username)}`);
}

export async function getSleeperLeagues(userId: string, season: number) {
  return sleeperFetch<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`);
}

export async function getSleeperRosters(leagueId: string) {
  return sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`);
}

export async function getSleeperLeagueUsers(leagueId: string) {
  return sleeperFetch<SleeperLeagueUser[]>(`/league/${leagueId}/users`);
}

export async function getSleeperMatchups(leagueId: string, week: number) {
  return sleeperFetch<
    Array<{
      roster_id: number;
      matchup_id: number;
      points: number;
    }>
  >(`/league/${leagueId}/matchups/${week}`);
}

export type SleeperTransaction = {
  transaction_id: string;
  type: "waiver" | "free_agent" | "trade";
  status: string;
  roster_ids: number[];
  metadata?: { notes?: string };
  adds?: Record<string, number> | null;
  drops?: Record<string, number> | null;
  settings?: { waiver_bid?: number } | null;
};

export async function getSleeperTransactions(leagueId: string, week: number) {
  return sleeperFetch<SleeperTransaction[]>(
    `/league/${leagueId}/transactions/${week}`
  );
}

let playersCache: Record<string, SleeperPlayer> | null = null;

export async function getSleeperPlayers() {
  if (!playersCache) {
    playersCache = await sleeperFetch<Record<string, SleeperPlayer>>(
      "/players/nfl"
    );
  }
  return playersCache;
}

export function normalizeSleeperRosters(
  rosters: SleeperRoster[],
  users: SleeperLeagueUser[],
  players: Record<string, SleeperPlayer>
) {
  const userMap = new Map(users.map((u) => [u.user_id, u]));

  return rosters.map((roster) => {
    const owner = userMap.get(roster.owner_id);
    const teamName =
      owner?.metadata?.team_name ?? owner?.display_name ?? `Team ${roster.roster_id}`;
    const reserveSet = new Set(roster.reserve ?? []);
    const taxiSet = new Set(roster.taxi ?? []);

    const entries = roster.players.map((playerId) => {
      const player = players[playerId];
      const isStarter = roster.starters.includes(playerId);
      const rosterStatus: RosterStatus = isStarter
        ? "active"
        : reserveSet.has(playerId)
          ? "ir"
          : taxiSet.has(playerId)
            ? "taxi"
            : "active";
      return {
        playerExternalId: playerId,
        playerName: player?.full_name ?? `Player ${playerId}`,
        position: player?.position ?? "UNK",
        nflTeam: player?.team ?? null,
        slot: isStarter ? (player?.position ?? "FLEX") : rosterStatus === "ir" ? "IR" : rosterStatus === "taxi" ? "TAXI" : "BN",
        rosterStatus,
        injuryStatus: player?.injury_status ?? null,
      };
    });

    return {
      externalRosterId: String(roster.roster_id),
      teamName,
      ownerName: owner?.display_name ?? "Unknown",
      entries,
    };
  });
}

export async function getSleeperLeague(leagueId: string) {
  return sleeperFetch<SleeperLeague>(`/league/${leagueId}`);
}

export type SleeperNflState = {
  week: number;
  season: string;
  season_type: string;
  league_season: string;
};

export async function getSleeperNflState() {
  return sleeperFetch<SleeperNflState>("/state/nfl");
}

export function normalizeUserRosterEntries(
  roster: SleeperRoster,
  users: SleeperLeagueUser[],
  players: Record<string, SleeperPlayer>,
  rosterPositions: string[]
) {
  const owner = users.find((u) => u.user_id === roster.owner_id);
  const starterSlots = rosterPositions.filter((slot) => slot !== "BN");
  const reserveSet = new Set(roster.reserve ?? []);
  const taxiSet = new Set(roster.taxi ?? []);
  const entries: Array<{
    playerExternalId: string;
    playerName: string;
    position: string;
    nflTeam: string | null;
    slot: string;
    rosterStatus: RosterStatus;
    injuryStatus?: string | null;
  }> = [];

  for (const [index, playerId] of roster.starters.entries()) {
    const player = players[playerId];
    entries.push({
      playerExternalId: playerId,
      playerName: player?.full_name ?? `Player ${playerId}`,
      position: player?.position ?? "UNK",
      nflTeam: player?.team ?? null,
      slot: starterSlots[index] ?? "FLEX",
      rosterStatus: "active",
      injuryStatus: player?.injury_status ?? null,
    });
  }

  for (const playerId of roster.players) {
    if (roster.starters.includes(playerId)) continue;
    const player = players[playerId];
    const rosterStatus: RosterStatus = reserveSet.has(playerId)
      ? "ir"
      : taxiSet.has(playerId)
        ? "taxi"
        : "active";
    entries.push({
      playerExternalId: playerId,
      playerName: player?.full_name ?? `Player ${playerId}`,
      position: player?.position ?? "UNK",
      nflTeam: player?.team ?? null,
      slot: rosterStatus === "ir" ? "IR" : rosterStatus === "taxi" ? "TAXI" : "BN",
      rosterStatus,
      injuryStatus: player?.injury_status ?? null,
    });
  }

  const teamName =
    owner?.metadata?.team_name ?? owner?.display_name ?? `Team ${roster.roster_id}`;

  return {
    externalRosterId: String(roster.roster_id),
    teamName,
    ownerName: owner?.display_name ?? "Unknown",
    wins: roster.settings?.wins ?? 0,
    losses: roster.settings?.losses ?? 0,
    entries,
  };
}

export async function connectSleeperLeagues(username: string, season: number) {
  const user = await getSleeperUser(username);
  const leagues = await getSleeperLeagues(user.user_id, season);

  return leagues.map((league) => ({
    externalLeagueId: league.league_id,
    name: league.name,
    sport: "nfl",
    season: Number(league.season),
    totalTeams: league.total_rosters,
    status: league.status,
    draftId: league.draft_id,
    scoringSettings: mapScoring(league.scoring_settings),
    rosterSlots: slotCounts(league.roster_positions),
  }));
}

export async function connectSleeperLeaguesAcrossSeasons(
  username: string,
  seasons: number[]
) {
  const seen = new Set<string>();
  const merged = [];

  for (const season of seasons) {
    const leagues = await connectSleeperLeagues(username, season);
    for (const league of leagues) {
      if (seen.has(league.externalLeagueId)) continue;
      seen.add(league.externalLeagueId);
      merged.push(league);
    }
  }

  return merged;
}

export async function getSleeperTrendingAdds(
  lookbackHours = 24,
  limit = 25
) {
  return sleeperFetch<Array<{ player_id: string; count: number }>>(
    `/players/nfl/trending/add?lookback_hours=${lookbackHours}&limit=${limit}`
  );
}

export type SleeperWeeklyStatRow = SleeperStatBlob & {
  player_id: number | string;
  pts_ppr?: number;
  pts_half_ppr?: number;
  pts_std?: number;
};

export async function getSleeperWeeklyStats(season: number, week: number) {
  return sleeperFetch<SleeperWeeklyStatRow[]>(
    `/stats/nfl/regular/${season}/${week}`
  );
}

export type SleeperProjectionRow = {
  player_id?: string;
  player?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    position?: string;
    team?: string;
    injury_status?: string;
  };
  stats?: SleeperStatBlob & {
    pts_ppr?: number;
    pts_half_ppr?: number;
    pts_std?: number;
  };
};

export async function getSleeperProjections(season: number, week: number) {
  const params = new URLSearchParams({ season_type: "regular" });
  for (const position of ["QB", "RB", "WR", "TE", "K", "DEF"]) {
    params.append("position[]", position);
  }

  return sleeperFetch<SleeperProjectionRow[]>(
    `/projections/nfl/${season}/${week}?${params}`
  );
}

export function resolvePlayers(
  players: Record<string, SleeperPlayer>,
  identifiers: string[]
) {
  const entries = Object.entries(players).map(([id, player]) => ({
    ...player,
    player_id: id,
  }));

  return identifiers.map((identifier) => {
    const byId = players[identifier];
    if (byId) return { ...byId, player_id: identifier };

    const needle = identifier.toLowerCase();
    return (
      entries.find((player) => player.full_name?.toLowerCase() === needle) ??
      entries.find((player) => player.full_name?.toLowerCase().includes(needle)) ??
      { player_id: identifier, full_name: identifier, position: "UNK", team: undefined }
    );
  });
}

export function initialsForName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export type SleeperDraft = {
  draft_id: string;
  type: string;
  status: string;
  season: string;
  league_id: string;
  settings?: {
    teams?: number;
    rounds?: number;
    pick_timer?: number;
    slots_qb?: number;
    slots_rb?: number;
    slots_wr?: number;
    slots_te?: number;
    slots_flex?: number;
    slots_k?: number;
    slots_def?: number;
    slots_bn?: number;
  };
  draft_order?: Record<string, number>;
  slot_to_roster_id?: Record<string, number>;
  metadata?: { scoring_type?: string; name?: string };
};

export type SleeperDraftPick = {
  player_id: string;
  picked_by: string;
  roster_id: string;
  round: number;
  draft_slot: number;
  pick_no: number;
  metadata?: {
    first_name?: string;
    last_name?: string;
    position?: string;
    team?: string;
    injury_status?: string;
  };
  is_keeper?: boolean | null;
};

export async function getSleeperLeagueDrafts(leagueId: string) {
  return sleeperFetch<SleeperDraft[]>(`/league/${leagueId}/drafts`);
}

export async function getSleeperDraft(draftId: string) {
  return sleeperFetch<SleeperDraft>(`/draft/${draftId}`);
}

export async function getSleeperDraftPicks(draftId: string) {
  return sleeperFetch<SleeperDraftPick[]>(`/draft/${draftId}/picks`);
}

export function pickPlayerName(pick: SleeperDraftPick) {
  if (pick.metadata?.first_name || pick.metadata?.last_name) {
    return [pick.metadata.first_name, pick.metadata.last_name]
      .filter(Boolean)
      .join(" ");
  }
  return `Player ${pick.player_id}`;
}

export function countRosterNeeds(
  rosterPositions: string[],
  ownedPositions: string[]
) {
  const slotCounts = new Map<string, number>();
  for (const slot of rosterPositions) {
    if (slot === "BN" || slot === "IR") continue;
    slotCounts.set(slot, (slotCounts.get(slot) ?? 0) + 1);
  }

  const ownedCounts = new Map<string, number>();
  for (const position of ownedPositions) {
    ownedCounts.set(position, (ownedCounts.get(position) ?? 0) + 1);
  }

  const needs: Array<{ slot: string; needed: number }> = [];
  for (const [slot, total] of slotCounts.entries()) {
    let filled = 0;
    if (slot === "FLEX" || slot === "SUPER_FLEX") {
      filled = Math.min(
        total,
        ownedPositions.filter((pos) =>
          slot === "SUPER_FLEX"
            ? ["QB", "RB", "WR", "TE"].includes(pos)
            : ["RB", "WR", "TE"].includes(pos)
        ).length
      );
    } else {
      filled = Math.min(total, ownedCounts.get(slot) ?? 0);
    }
    const needed = Math.max(0, total - filled);
    if (needed > 0) needs.push({ slot, needed });
  }

  return needs.sort((a, b) => b.needed - a.needed);
}
