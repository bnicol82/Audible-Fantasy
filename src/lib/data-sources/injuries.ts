// Injury detail with severity/timeline, beyond Sleeper's single coarse `injury_status`
// string. Provider-agnostic on purpose: nflverse's weekly injury report release (free,
// public, no ToS issue) is the default and preferred source. A licensed injury/news API is
// a paid-API decision point, same category as expert rankings — not implemented here,
// slot it in behind `getInjuryReport()` if nflverse's coverage/lag proves insufficient.
// Scraping NFL.com/team injury report pages was explicitly deferred per the sourcing
// decision — it needs a per-site ToS/robots.txt check before any code is written against it.

import { getNflverseInjuryReport, type NflverseInjuryReportRow } from "./nflverse";

export type InjuryDetail = {
  gsisId: string;
  playerName: string;
  team: string;
  position?: string;
  reportStatus?: string;
  practiceParticipation?: string;
  bodyPart?: string;
  secondaryBodyPart?: string;
  reportedAt?: string;
};

function toInjuryDetail(row: NflverseInjuryReportRow): InjuryDetail {
  return {
    gsisId: row.gsisId,
    playerName: row.playerName,
    team: row.team,
    position: row.position,
    reportStatus: row.reportStatus,
    practiceParticipation: row.practiceStatus,
    bodyPart: row.primaryInjury,
    secondaryBodyPart: row.secondaryInjury,
    reportedAt: row.dateModified,
  };
}

export async function getInjuryReport(season: number, week: number): Promise<InjuryDetail[]> {
  const rows = await getNflverseInjuryReport(season, week);
  return rows.map(toInjuryDetail);
}
