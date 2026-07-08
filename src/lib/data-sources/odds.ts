// Vegas lines / implied team totals.
//
// COST DECISION POINT: real-time spread/total data comes from a paid odds API (e.g.
// The Odds API, https://the-odds-api.com — free tier covers ~500 requests/month, and a
// single daily batched "all NFL games" call fits comfortably within that for game-level
// lines; player-prop markets are a separate, costlier tier and are NOT implemented here).
// Set ODDS_API_KEY to enable it. Without a key, this falls back to nflverse's own
// `spread_line`/`total_line` schedule columns, which are real historical/current lines but
// are only populated once a book has actually posted a line for that game (often not until
// a few days before kickoff) and are refreshed only as often as nflverse's schedule release
// updates — not a live feed.

import { fetchJson } from "./http";
import { getWeeklySchedule } from "./schedule";

export type GameOdds = {
  homeTeam: string;
  awayTeam: string;
  spread: number | null; // negative = home favored
  total: number | null;
  homeImpliedTotal: number | null;
  awayImpliedTotal: number | null;
  book: string;
};

function impliedTotals(total: number | null, spread: number | null) {
  if (total === null) return { home: null, away: null };
  if (spread === null) return { home: total / 2, away: total / 2 };
  // Home favored (negative spread) gets more than half the total.
  return {
    home: total / 2 - spread / 2,
    away: total / 2 + spread / 2,
  };
}

type TheOddsApiEvent = {
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    markets: Array<{
      key: string;
      outcomes: Array<{ name: string; price?: number; point?: number }>;
    }>;
  }>;
};

async function fetchFromOddsApi(): Promise<GameOdds[] | null> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return null;

  const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${apiKey}&regions=us&markets=spreads,totals&oddsFormat=american`;
  const events = await fetchJson<TheOddsApiEvent[]>(url);

  return events.map((event) => {
    const book = event.bookmakers[0];
    const spreadOutcome = book?.markets
      .find((m) => m.key === "spreads")
      ?.outcomes.find((o) => o.name === event.home_team);
    const totalOutcome = book?.markets.find((m) => m.key === "totals")?.outcomes[0];

    const spread = spreadOutcome?.point ?? null;
    const total = totalOutcome?.point ?? null;
    const implied = impliedTotals(total, spread);

    return {
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      spread,
      total,
      homeImpliedTotal: implied.home,
      awayImpliedTotal: implied.away,
      book: book?.key ?? "unknown",
    };
  });
}

async function fetchFromNflverseFallback(season: number, week: number): Promise<GameOdds[]> {
  const games = await getWeeklySchedule(season, week);
  return games
    .filter((game) => game.freeTotalLine !== null)
    .map((game) => {
      const implied = impliedTotals(game.freeTotalLine, game.freeSpreadLine);
      return {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        spread: game.freeSpreadLine,
        total: game.freeTotalLine,
        homeImpliedTotal: implied.home,
        awayImpliedTotal: implied.away,
        book: "nflverse (closing line, delayed)",
      };
    });
}

export async function getWeeklyOdds(season: number, week: number): Promise<GameOdds[]> {
  const fromApi = await fetchFromOddsApi().catch(() => null);
  if (fromApi && fromApi.length) return fromApi;
  return fetchFromNflverseFallback(season, week);
}
