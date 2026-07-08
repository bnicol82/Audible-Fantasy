import type { SyncedLeagueSummary } from "@/lib/leagues/sync";

export type LeagueChatContext = {
  leagueName: string;
  scoringFormat: string;
  rosterSummary: string;
  week: number;
  record: string;
  teamName?: string;
};

export function buildLeagueChatContext(
  league: SyncedLeagueSummary
): LeagueChatContext {
  const starters = league.roster.filter((player) => player.slot !== "BN");
  const rosterSummary = starters
    .map((player) => {
      const injury = player.injuryStatus ? ` (${player.injuryStatus})` : "";
      return `${player.playerName}${injury}`;
    })
    .join(", ");

  return {
    leagueName: league.name,
    scoringFormat: league.scoring,
    rosterSummary: rosterSummary || "No starters synced yet",
    week: league.week,
    record: league.record,
    teamName: league.teamName,
  };
}

export function demoLeagueChatContext(): LeagueChatContext {
  return {
    leagueName: "The Gauntlet League",
    scoringFormat: "Half PPR",
    rosterSummary:
      "Josh Allen, Bijan Robinson, Jahmyr Gibbs (Q), Ja'Marr Chase, Puka Nacua, Trey McBride, Zay Flowers",
    week: 5,
    record: "3-1",
    teamName: "Billy's Bandits",
  };
}
