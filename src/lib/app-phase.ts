export type AppPhase = "draft" | "in_season" | "offseason";

export type SleeperLeagueStatus =
  | "pre_draft"
  | "drafting"
  | "in_season"
  | "complete"
  | (string & {});

export function phaseFromLeagueStatus(status?: string): AppPhase {
  if (status === "pre_draft" || status === "drafting") return "draft";
  if (status === "in_season") return "in_season";
  return "offseason";
}

export function phaseLabel(phase: AppPhase) {
  switch (phase) {
    case "draft":
      return "DRAFT";
    case "in_season":
      return "IN SEASON";
    default:
      return "OFFSEASON";
  }
}
