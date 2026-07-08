import type { AppPhase } from "@/lib/app-phase";
import type { LeagueRules, ScoringSettings } from "@/lib/providers/types";

export type ToolContext = {
  externalLeagueId?: string;
  season: number;
  week: number;
  scoringFormat: string;
  scoringSettings: ScoringSettings;
  leagueRules?: LeagueRules;
  rosterPlayerIds: string[];
  rosterStatusByPlayerId?: Record<string, "active" | "ir" | "taxi">;
  phase?: AppPhase;
  profileId?: string;
  leagueId?: string;
  draftedPlayerIds?: string[];
};

export function demoToolContext(): ToolContext {
  return {
    season: new Date().getFullYear(),
    week: 5,
    scoringFormat: "half_ppr",
    scoringSettings: { format: "half_ppr", raw: {} },
    rosterPlayerIds: [],
  };
}

export function toolContextFromLeague(input: {
  externalLeagueId?: string;
  season: number;
  week: number;
  scoringSettings: ScoringSettings;
  leagueRules?: LeagueRules;
  roster?: Array<{ playerExternalId: string }>;
}): ToolContext {
  return {
    externalLeagueId: input.externalLeagueId,
    season: input.season,
    week: input.week,
    scoringFormat: input.scoringSettings.format,
    scoringSettings: input.scoringSettings,
    leagueRules: input.leagueRules,
    rosterPlayerIds:
      input.roster?.map((player) => player.playerExternalId).filter(Boolean) ?? [],
  };
}
