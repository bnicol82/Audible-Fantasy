import {
  connectSleeperLeagues,
  getSleeperLeague,
  getSleeperLeagueUsers,
  getSleeperMatchups,
  getSleeperPlayers,
  getSleeperRosters,
  getSleeperTransactions,
  normalizeSleeperRosters,
} from "./sleeper";
import type {
  LeagueProvider,
  NormalizedMatchup,
  NormalizedTransaction,
  ProviderCredentials,
} from "./types";

export const sleeperProvider: LeagueProvider = {
  platform: "sleeper",

  async connectLeague(credentials: ProviderCredentials) {
    if (credentials.platform !== "sleeper") {
      throw new Error("Sleeper provider requires sleeper credentials");
    }
    const season = credentials.season ?? new Date().getFullYear();
    return connectSleeperLeagues(credentials.username, season);
  },

  async fetchRosters(leagueId: string) {
    const [rosters, users, players] = await Promise.all([
      getSleeperRosters(leagueId),
      getSleeperLeagueUsers(leagueId),
      getSleeperPlayers(),
    ]);
    return normalizeSleeperRosters(rosters, users, players);
  },

  async fetchScoringSettings(leagueId: string) {
    const league = await getSleeperLeague(leagueId);
    const rec = league.scoring_settings.rec ?? 0;
    const format =
      rec >= 1 ? "ppr" : rec >= 0.5 ? "half_ppr" : rec > 0 ? "custom" : "standard";
    return { format, raw: league.scoring_settings };
  },

  async fetchMatchups(leagueId: string, week: number) {
    const matchups = await getSleeperMatchups(leagueId, week);
    const byMatchup = new Map<number, typeof matchups>();

    for (const m of matchups) {
      const group = byMatchup.get(m.matchup_id) ?? [];
      group.push(m);
      byMatchup.set(m.matchup_id, group);
    }

    const normalized: NormalizedMatchup[] = [];
    for (const group of byMatchup.values()) {
      if (group.length < 2) continue;
      const [home, away] = group;
      normalized.push({
        week,
        homeRosterId: String(home.roster_id),
        awayRosterId: String(away.roster_id),
        homeProjection: home.points,
        awayProjection: away.points,
      });
    }
    return normalized;
  },

  async fetchTransactions(leagueId: string, week: number) {
    const txs = await getSleeperTransactions(leagueId, week);
    return txs.map(
      (tx): NormalizedTransaction => ({
        type: tx.type.includes("trade")
          ? "trade"
          : tx.adds
            ? "add"
            : "drop",
        week,
        description: tx.metadata?.notes ?? tx.type,
        playerNames: [
          ...Object.keys(tx.adds ?? {}),
          ...Object.keys(tx.drops ?? {}),
        ],
      })
    );
  },
};
