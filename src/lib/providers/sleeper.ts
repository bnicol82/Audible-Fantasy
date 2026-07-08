const SLEEPER_API = "https://api.sleeper.app/v1";

type SleeperUser = { user_id: string; display_name: string; username: string };
type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  status?: string;
  scoring_settings: Record<string, number>;
  roster_positions: string[];
};
type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  players: string[];
  starters: string[];
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

export async function getSleeperTransactions(leagueId: string, week: number) {
  return sleeperFetch<
    Array<{
      type: string;
      metadata?: { notes?: string };
      adds?: Record<string, number> | null;
      drops?: Record<string, number> | null;
    }>
  >(`/league/${leagueId}/transactions/${week}`);
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

    const entries = roster.players.map((playerId) => {
      const player = players[playerId];
      const isStarter = roster.starters.includes(playerId);
      return {
        playerExternalId: playerId,
        playerName: player?.full_name ?? `Player ${playerId}`,
        position: player?.position ?? "UNK",
        nflTeam: player?.team ?? null,
        slot: isStarter ? player?.position ?? "FLEX" : "BN",
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
  const entries: Array<{
    playerExternalId: string;
    playerName: string;
    position: string;
    nflTeam: string | null;
    slot: string;
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
      injuryStatus: player?.injury_status ?? null,
    });
  }

  for (const playerId of roster.players) {
    if (roster.starters.includes(playerId)) continue;
    const player = players[playerId];
    entries.push({
      playerExternalId: playerId,
      playerName: player?.full_name ?? `Player ${playerId}`,
      position: player?.position ?? "UNK",
      nflTeam: player?.team ?? null,
      slot: "BN",
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

export async function getSleeperWeeklyStats(season: number, week: number) {
  return sleeperFetch<
    Array<{
      player_id: number | string;
      pts_ppr?: number;
      pts_half_ppr?: number;
      pts_std?: number;
    }>
  >(`/stats/nfl/regular/${season}/${week}`);
}

export async function getSleeperProjections(season: number, week: number) {
  const params = new URLSearchParams({ season_type: "regular" });
  for (const position of ["QB", "RB", "WR", "TE", "K", "DEF"]) {
    params.append("position[]", position);
  }

  return sleeperFetch<unknown[]>(`/projections/nfl/${season}/${week}?${params}`);
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
