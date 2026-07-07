export type Platform = "sleeper" | "yahoo" | "espn" | "manual";

export type ProviderCredentials =
  | { platform: "sleeper"; username: string; season?: number }
  | { platform: "yahoo"; accessToken: string; refreshToken: string }
  | { platform: "espn"; swid: string; espnS2: string }
  | {
      platform: "manual";
      teamName: string;
      scoringFormat: "standard" | "half_ppr" | "ppr";
      rosterSlots: string[];
      playerIds: string[];
    };

export type LeagueMeta = {
  externalLeagueId: string;
  name: string;
  sport: string;
  season: number;
  totalTeams: number;
  scoringSettings: ScoringSettings;
  rosterSlots: RosterSlot[];
};

export type ScoringSettings = {
  format: "standard" | "half_ppr" | "ppr" | "custom";
  raw: Record<string, number>;
};

export type RosterSlot = {
  slot: string;
  count: number;
};

export type NormalizedRosterEntry = {
  playerExternalId: string;
  playerName: string;
  position: string;
  nflTeam: string | null;
  slot: string;
  injuryStatus?: string | null;
};

export type NormalizedRoster = {
  externalRosterId: string;
  teamName: string;
  ownerName: string;
  entries: NormalizedRosterEntry[];
};

export type NormalizedMatchup = {
  week: number;
  homeRosterId: string;
  awayRosterId: string;
  homeProjection?: number;
  awayProjection?: number;
};

export type NormalizedTransaction = {
  type: "add" | "drop" | "trade";
  week: number;
  description: string;
  playerNames: string[];
};

export interface LeagueProvider {
  platform: Platform;
  connectLeague(credentials: ProviderCredentials): Promise<LeagueMeta[]>;
  fetchRosters(leagueId: string, context?: ProviderContext): Promise<NormalizedRoster[]>;
  fetchScoringSettings(
    leagueId: string,
    context?: ProviderContext
  ): Promise<ScoringSettings>;
  fetchMatchups(
    leagueId: string,
    week: number,
    context?: ProviderContext
  ): Promise<NormalizedMatchup[]>;
  fetchTransactions(
    leagueId: string,
    week: number,
    context?: ProviderContext
  ): Promise<NormalizedTransaction[]>;
}

export type ProviderContext = {
  season?: number;
  userId?: string;
};
