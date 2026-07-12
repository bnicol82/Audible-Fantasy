// National Weather Service API (api.weather.gov) — free, no API key, but requires a
// descriptive User-Agent per NWS usage policy (unauthenticated requests without one are
// frequently throttled/rejected). Two-step lookup: resolve a lat/lon to its forecast grid,
// then fetch the forecast for that grid. Only meaningful ~7 days out from kickoff, and only
// worth calling for outdoor stadiums.

import { fetchJson } from "./http";

const NWS_USER_AGENT = "AudibleFantasy/1.0 (contact: support@audible-fantasy.app)";

type PointsResponse = {
  properties: {
    forecastHourly: string;
    gridId: string;
    gridX: number;
    gridY: number;
  };
};

type HourlyForecastResponse = {
  properties: {
    periods: Array<{
      startTime: string;
      temperature: number;
      temperatureUnit: string;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      probabilityOfPrecipitation?: { value: number | null };
    }>;
  };
};

export type GameWeather = {
  tempF: number | null;
  windMph: number | null;
  windDirection: string | null;
  precipitationPct: number | null;
  condition: string | null;
  forecastFor: string | null;
};

function parseWindMph(windSpeed: string): number | null {
  const match = windSpeed.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

export async function getGameWeather(input: {
  lat: number;
  lon: number;
  kickoffUtc: string;
}): Promise<GameWeather | null> {
  const kickoff = new Date(input.kickoffUtc);
  const daysOut = (kickoff.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysOut > 7 || daysOut < -1) {
    // Outside NWS's reliable forecast window — nothing meaningful to report.
    return null;
  }

  const headers = { "User-Agent": NWS_USER_AGENT, Accept: "application/geo+json" };

  const points = await fetchJson<PointsResponse>(
    `https://api.weather.gov/points/${input.lat.toFixed(4)},${input.lon.toFixed(4)}`,
    { headers }
  );

  const hourly = await fetchJson<HourlyForecastResponse>(points.properties.forecastHourly, {
    headers,
  });

  const closest = hourly.properties.periods.reduce<
    (typeof hourly.properties.periods)[number] | null
  >((best, period) => {
    const diff = Math.abs(new Date(period.startTime).getTime() - kickoff.getTime());
    const bestDiff = best ? Math.abs(new Date(best.startTime).getTime() - kickoff.getTime()) : Infinity;
    return diff < bestDiff ? period : best;
  }, null);

  if (!closest) return null;

  return {
    tempF: closest.temperatureUnit === "F" ? closest.temperature : null,
    windMph: parseWindMph(closest.windSpeed),
    windDirection: closest.windDirection || null,
    precipitationPct: closest.probabilityOfPrecipitation?.value ?? null,
    condition: closest.shortForecast || null,
    forecastFor: closest.startTime,
  };
}
