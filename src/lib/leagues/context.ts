import type { AppPhase } from "@/lib/app-phase";
import type { SyncedLeagueSummary } from "@/lib/leagues/sync";
import type { LeagueRules } from "@/lib/providers/types";

export type LeagueChatContext = {
  leagueName: string;
  scoringFormat: string;
  rosterSummary: string;
  week: number;
  record: string;
  teamName?: string;
  externalLeagueId?: string;
  season?: number;
  phase?: AppPhase;
  leagueStatus?: string;
  draftSummary?: string;
  leagueRules?: LeagueRules;
};

function formatLeagueRulesSummary(rules: LeagueRules): string {
  const parts: string[] = [];
  parts.push(
    rules.waiverType === "faab"
      ? `FAAB waivers ($${rules.faabBudget ?? 100} budget)`
      : rules.waiverType === "reverse_standings"
        ? "Reverse-standings waiver priority"
        : "Rolling waiver priority"
  );
  if (rules.playoffWeekStart) parts.push(`Playoffs start Week ${rules.playoffWeekStart}`);
  if (rules.tradeDeadlineWeek) parts.push(`Trade deadline Week ${rules.tradeDeadlineWeek}`);
  if (rules.irSlots) parts.push(`${rules.irSlots} IR slot(s)`);
  if (rules.taxiSlots) parts.push(`${rules.taxiSlots} taxi slot(s)`);
  return parts.join(". ");
}

export function buildLeagueChatContext(
  league: SyncedLeagueSummary
): LeagueChatContext {
  const starters = league.roster.filter((player) => player.rosterStatus === "active" && player.slot !== "BN");
  const rosterSummary = starters
    .map((player) => {
      const injury = player.injuryStatus ? ` (${player.injuryStatus})` : "";
      return `${player.playerName}${injury}`;
    })
    .join(", ");

  const draftSummary =
    league.phase === "draft"
      ? `League status: ${league.leagueStatus}. Carryover roster until draft day — plan picks around existing keepers.`
      : undefined;

  return {
    leagueName: league.name,
    scoringFormat: league.scoring,
    rosterSummary: rosterSummary || "No starters synced yet",
    week: league.week,
    record: league.record,
    teamName: league.teamName,
    externalLeagueId: league.externalLeagueId,
    season: league.season,
    phase: league.phase,
    leagueStatus: league.leagueStatus,
    draftSummary,
    leagueRules: league.rules,
  };
}

export { formatLeagueRulesSummary };

export function demoLeagueChatContext(phase: AppPhase = "in_season"): LeagueChatContext {
  if (phase === "draft") {
    return {
      leagueName: "The Gauntlet League",
      scoringFormat: "Half PPR",
      rosterSummary:
        "Josh Allen (carryover), Ja'Marr Chase (carryover) — drafting RB/WR depth next",
      week: 0,
      record: "0-0",
      teamName: "Billy's Bandits",
      season: new Date().getFullYear(),
      phase: "draft",
      leagueStatus: "pre_draft",
      draftSummary:
        "Snake draft, pick 4. Biggest needs: RB, WR, TE. Use ADP and roster construction, not vibes.",
    };
  }

  return {
    leagueName: "The Gauntlet League",
    scoringFormat: "Half PPR",
    rosterSummary:
      "Josh Allen, Bijan Robinson, Jahmyr Gibbs (Q), Ja'Marr Chase, Puka Nacua, Trey McBride, Zay Flowers",
    week: 5,
    record: "3-1",
    teamName: "Billy's Bandits",
    season: new Date().getFullYear(),
    phase: "in_season",
  };
}
