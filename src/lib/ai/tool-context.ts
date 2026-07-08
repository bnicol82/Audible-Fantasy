import type { AppPhase } from "@/lib/app-phase";

export type ToolContext = {
  externalLeagueId?: string;
  season: number;
  week: number;
  scoringFormat: string;
  rosterPlayerIds: string[];
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
    rosterPlayerIds: [],
  };
}

export function toolContextFromLeague(input: {
  externalLeagueId?: string;
  season: number;
  week: number;
  scoringFormat: string;
  roster?: Array<{ playerExternalId: string }>;
}): ToolContext {
  return {
    externalLeagueId: input.externalLeagueId,
    season: input.season,
    week: input.week,
    scoringFormat: input.scoringFormat,
    rosterPlayerIds:
      input.roster?.map((player) => player.playerExternalId).filter(Boolean) ?? [],
  };
}
