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

export type LeagueRules = {
  waiverType: "rolling" | "faab" | "reverse_standings";
  faabBudget: number | null;
  taxiSlots: number;
  irSlots: number;
  playoffWeekStart: number | null;
  playoffTeams: number | null;
  tradeDeadlineWeek: number | null;
};

export type LeagueMeta = {
  externalLeagueId: string;
  name: string;
  sport: string;
  season: number;
  totalTeams: number;
  status?: string;
  draftId?: string;
  scoringSettings: ScoringSettings;
  rosterSlots: RosterSlot[];
  rules?: LeagueRules;
};

export type ScoringSettings = {
  format: "standard" | "half_ppr" | "ppr" | "custom";
  raw: Record<string, number>;
};

export type RosterSlot = {
  slot: string;
  count: number;
};

export type RosterStatus = "active" | "ir" | "taxi";

export type NormalizedRosterEntry = {
  playerExternalId: string;
  playerName: string;
  position: string;
  nflTeam: string | null;
  slot: string;
  rosterStatus: RosterStatus;
  injuryStatus?: string | null;
  projectedPoints?: number | null;
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
