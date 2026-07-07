import type {
  LeagueProvider,
  ProviderCredentials,
} from "./types";

export const manualProvider: LeagueProvider = {
  platform: "manual",

  async connectLeague(credentials: ProviderCredentials) {
    if (credentials.platform !== "manual") {
      throw new Error("Manual provider requires manual credentials");
    }

    return [
      {
        externalLeagueId: `manual-${Date.now()}`,
        name: `${credentials.teamName} (Manual)`,
        sport: "nfl",
        season: new Date().getFullYear(),
        totalTeams: 1,
        scoringSettings: {
          format: credentials.scoringFormat,
          raw: {},
        },
        rosterSlots: credentials.rosterSlots.map((slot) => ({
          slot,
          count: 1,
        })),
      },
    ];
  },

  async fetchRosters() {
    return [];
  },

  async fetchScoringSettings() {
    return { format: "half_ppr" as const, raw: {} };
  },

  async fetchMatchups() {
    return [];
  },

  async fetchTransactions() {
    return [];
  },
};
