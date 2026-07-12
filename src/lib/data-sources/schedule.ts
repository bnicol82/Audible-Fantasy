// Thin wrapper over nflverse's schedule release: no dedicated schedule API exists anywhere
// in this app today, so this fills a real gap (weather/odds both need kickoff time + venue).

import { getNflverseSchedule } from "./nflverse";
import { getStadiumForTeam } from "./stadiums";

export type ScheduledGame = {
  gameId: string;
  season: number;
  week: number;
  homeTeam: string;
  awayTeam: string;
  kickoffUtc: string | null;
  stadium: string | null;
  isOutdoor: boolean;
  lat: number | null;
  lon: number | null;
  freeSpreadLine: number | null;
  freeTotalLine: number | null;
};

function toKickoffUtc(gameday: string, gametime?: string): string | null {
  if (!gameday) return null;
  // nflverse `gametime` is a local-ish HH:MM string without timezone info; treat as a
  // rough same-day marker rather than a precise instant (good enough for "is this within
  // forecast range", not for exact-second scheduling).
  const time = gametime && /^\d{1,2}:\d{2}/.test(gametime) ? gametime : "13:00";
  const iso = `${gameday}T${time}:00Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function getWeeklySchedule(season: number, week: number): Promise<ScheduledGame[]> {
  const games = await getNflverseSchedule(season, week);
  return games.map((game) => {
    const stadium = getStadiumForTeam(game.homeTeam);
    return {
      gameId: game.gameId,
      season,
      week,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      kickoffUtc: toKickoffUtc(game.gameday, game.gametime),
      stadium: game.stadium ?? stadium?.name ?? null,
      isOutdoor: game.roof ? game.roof === "outdoors" : (stadium?.isOutdoor ?? true),
      lat: stadium?.lat ?? null,
      lon: stadium?.lon ?? null,
      freeSpreadLine: game.spreadLine ?? null,
      freeTotalLine: game.totalLine ?? null,
    };
  });
}
