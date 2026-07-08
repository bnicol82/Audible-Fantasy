// Static NFL stadium reference data: this essentially never changes, so it's a hardcoded
// table rather than an API call. Coordinates are metro-level (sufficient for NWS forecast
// grid resolution). `isOutdoor` drives whether weather is even worth fetching for a game —
// retractable roofs default to "closed" (indoor) since that's the common case in cold/wet
// conditions, which is exactly when it would otherwise look like a weather risk.
//
// Team codes match Sleeper's `team` field convention.

export type StadiumInfo = {
  team: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  isOutdoor: boolean;
  roofType: "outdoor" | "dome" | "retractable";
};

export const STADIUMS: Record<string, StadiumInfo> = {
  ARI: { team: "ARI", name: "State Farm Stadium", city: "Glendale, AZ", lat: 33.5276, lon: -112.2626, isOutdoor: false, roofType: "retractable" },
  ATL: { team: "ATL", name: "Mercedes-Benz Stadium", city: "Atlanta, GA", lat: 33.7554, lon: -84.4008, isOutdoor: false, roofType: "dome" },
  BAL: { team: "BAL", name: "M&T Bank Stadium", city: "Baltimore, MD", lat: 39.2780, lon: -76.6227, isOutdoor: true, roofType: "outdoor" },
  BUF: { team: "BUF", name: "Highmark Stadium", city: "Orchard Park, NY", lat: 42.7738, lon: -78.7870, isOutdoor: true, roofType: "outdoor" },
  CAR: { team: "CAR", name: "Bank of America Stadium", city: "Charlotte, NC", lat: 35.2258, lon: -80.8528, isOutdoor: true, roofType: "outdoor" },
  CHI: { team: "CHI", name: "Soldier Field", city: "Chicago, IL", lat: 41.8623, lon: -87.6167, isOutdoor: true, roofType: "outdoor" },
  CIN: { team: "CIN", name: "Paycor Stadium", city: "Cincinnati, OH", lat: 39.0954, lon: -84.5160, isOutdoor: true, roofType: "outdoor" },
  CLE: { team: "CLE", name: "Huntington Bank Field", city: "Cleveland, OH", lat: 41.5061, lon: -81.6995, isOutdoor: true, roofType: "outdoor" },
  DAL: { team: "DAL", name: "AT&T Stadium", city: "Arlington, TX", lat: 32.7473, lon: -97.0945, isOutdoor: false, roofType: "retractable" },
  DEN: { team: "DEN", name: "Empower Field at Mile High", city: "Denver, CO", lat: 39.7439, lon: -105.0201, isOutdoor: true, roofType: "outdoor" },
  DET: { team: "DET", name: "Ford Field", city: "Detroit, MI", lat: 42.3400, lon: -83.0456, isOutdoor: false, roofType: "dome" },
  GB: { team: "GB", name: "Lambeau Field", city: "Green Bay, WI", lat: 44.5013, lon: -88.0622, isOutdoor: true, roofType: "outdoor" },
  HOU: { team: "HOU", name: "NRG Stadium", city: "Houston, TX", lat: 29.6847, lon: -95.4107, isOutdoor: false, roofType: "retractable" },
  IND: { team: "IND", name: "Lucas Oil Stadium", city: "Indianapolis, IN", lat: 39.7601, lon: -86.1639, isOutdoor: false, roofType: "retractable" },
  JAX: { team: "JAX", name: "EverBank Stadium", city: "Jacksonville, FL", lat: 30.3239, lon: -81.6373, isOutdoor: true, roofType: "outdoor" },
  KC: { team: "KC", name: "GEHA Field at Arrowhead Stadium", city: "Kansas City, MO", lat: 39.0489, lon: -94.4839, isOutdoor: true, roofType: "outdoor" },
  LAC: { team: "LAC", name: "SoFi Stadium", city: "Inglewood, CA", lat: 33.9535, lon: -118.3392, isOutdoor: false, roofType: "dome" },
  LAR: { team: "LAR", name: "SoFi Stadium", city: "Inglewood, CA", lat: 33.9535, lon: -118.3392, isOutdoor: false, roofType: "dome" },
  LV: { team: "LV", name: "Allegiant Stadium", city: "Las Vegas, NV", lat: 36.0909, lon: -115.1833, isOutdoor: false, roofType: "dome" },
  MIA: { team: "MIA", name: "Hard Rock Stadium", city: "Miami Gardens, FL", lat: 25.9580, lon: -80.2389, isOutdoor: true, roofType: "outdoor" },
  MIN: { team: "MIN", name: "U.S. Bank Stadium", city: "Minneapolis, MN", lat: 44.9735, lon: -93.2575, isOutdoor: false, roofType: "dome" },
  NE: { team: "NE", name: "Gillette Stadium", city: "Foxborough, MA", lat: 42.0909, lon: -71.2643, isOutdoor: true, roofType: "outdoor" },
  NO: { team: "NO", name: "Caesars Superdome", city: "New Orleans, LA", lat: 29.9511, lon: -90.0812, isOutdoor: false, roofType: "dome" },
  NYG: { team: "NYG", name: "MetLife Stadium", city: "East Rutherford, NJ", lat: 40.8135, lon: -74.0745, isOutdoor: true, roofType: "outdoor" },
  NYJ: { team: "NYJ", name: "MetLife Stadium", city: "East Rutherford, NJ", lat: 40.8135, lon: -74.0745, isOutdoor: true, roofType: "outdoor" },
  PHI: { team: "PHI", name: "Lincoln Financial Field", city: "Philadelphia, PA", lat: 39.9008, lon: -75.1675, isOutdoor: true, roofType: "outdoor" },
  PIT: { team: "PIT", name: "Acrisure Stadium", city: "Pittsburgh, PA", lat: 40.4468, lon: -80.0158, isOutdoor: true, roofType: "outdoor" },
  SEA: { team: "SEA", name: "Lumen Field", city: "Seattle, WA", lat: 47.5952, lon: -122.3316, isOutdoor: true, roofType: "outdoor" },
  SF: { team: "SF", name: "Levi's Stadium", city: "Santa Clara, CA", lat: 37.4030, lon: -121.9700, isOutdoor: true, roofType: "outdoor" },
  TB: { team: "TB", name: "Raymond James Stadium", city: "Tampa, FL", lat: 27.9759, lon: -82.5033, isOutdoor: true, roofType: "outdoor" },
  TEN: { team: "TEN", name: "Nissan Stadium", city: "Nashville, TN", lat: 36.1665, lon: -86.7713, isOutdoor: true, roofType: "outdoor" },
  WAS: { team: "WAS", name: "Northwest Stadium", city: "Landover, MD", lat: 38.9077, lon: -76.8645, isOutdoor: true, roofType: "outdoor" },
};

export function getStadiumForTeam(teamCode: string): StadiumInfo | null {
  return STADIUMS[teamCode.toUpperCase()] ?? null;
}
