export type NflTeam = {
  id: string;
  city: string;
  name: string;
  abbreviation: string;
  primary: string;
  secondary: string;
};

export const NFL_TEAMS: NflTeam[] = [
  { id: "ari", city: "Arizona", name: "Cardinals", abbreviation: "ARI", primary: "#97233F", secondary: "#000000" },
  { id: "atl", city: "Atlanta", name: "Falcons", abbreviation: "ATL", primary: "#A71930", secondary: "#000000" },
  { id: "bal", city: "Baltimore", name: "Ravens", abbreviation: "BAL", primary: "#241773", secondary: "#000000" },
  { id: "buf", city: "Buffalo", name: "Bills", abbreviation: "BUF", primary: "#00338D", secondary: "#C60C30" },
  { id: "car", city: "Carolina", name: "Panthers", abbreviation: "CAR", primary: "#0085CA", secondary: "#101820" },
  { id: "chi", city: "Chicago", name: "Bears", abbreviation: "CHI", primary: "#0B162A", secondary: "#C83803" },
  { id: "cin", city: "Cincinnati", name: "Bengals", abbreviation: "CIN", primary: "#FB4F14", secondary: "#000000" },
  { id: "cle", city: "Cleveland", name: "Browns", abbreviation: "CLE", primary: "#311D00", secondary: "#FF3C00" },
  { id: "dal", city: "Dallas", name: "Cowboys", abbreviation: "DAL", primary: "#003594", secondary: "#869397" },
  { id: "den", city: "Denver", name: "Broncos", abbreviation: "DEN", primary: "#FB4F14", secondary: "#002244" },
  { id: "det", city: "Detroit", name: "Lions", abbreviation: "DET", primary: "#0076B6", secondary: "#B0B7BC" },
  { id: "gb", city: "Green Bay", name: "Packers", abbreviation: "GB", primary: "#203731", secondary: "#FFB612" },
  { id: "hou", city: "Houston", name: "Texans", abbreviation: "HOU", primary: "#03202F", secondary: "#A71930" },
  { id: "ind", city: "Indianapolis", name: "Colts", abbreviation: "IND", primary: "#002C5F", secondary: "#A2AAAD" },
  { id: "jax", city: "Jacksonville", name: "Jaguars", abbreviation: "JAX", primary: "#101820", secondary: "#D7A22A" },
  { id: "kc", city: "Kansas City", name: "Chiefs", abbreviation: "KC", primary: "#E31837", secondary: "#FFB81C" },
  { id: "lv", city: "Las Vegas", name: "Raiders", abbreviation: "LV", primary: "#000000", secondary: "#A5ACAF" },
  { id: "lac", city: "Los Angeles", name: "Chargers", abbreviation: "LAC", primary: "#0080C6", secondary: "#FFC20E" },
  { id: "lar", city: "Los Angeles", name: "Rams", abbreviation: "LAR", primary: "#003594", secondary: "#FFA300" },
  { id: "mia", city: "Miami", name: "Dolphins", abbreviation: "MIA", primary: "#008E97", secondary: "#FC4C02" },
  { id: "min", city: "Minnesota", name: "Vikings", abbreviation: "MIN", primary: "#4F2683", secondary: "#FFC62F" },
  { id: "ne", city: "New England", name: "Patriots", abbreviation: "NE", primary: "#002244", secondary: "#C60C30" },
  { id: "no", city: "New Orleans", name: "Saints", abbreviation: "NO", primary: "#D3BC8D", secondary: "#101820" },
  { id: "nyg", city: "New York", name: "Giants", abbreviation: "NYG", primary: "#0B2265", secondary: "#A71930" },
  { id: "nyj", city: "New York", name: "Jets", abbreviation: "NYJ", primary: "#125740", secondary: "#000000" },
  { id: "phi", city: "Philadelphia", name: "Eagles", abbreviation: "PHI", primary: "#004C54", secondary: "#A5ACAF" },
  { id: "pit", city: "Pittsburgh", name: "Steelers", abbreviation: "PIT", primary: "#FFB612", secondary: "#101820" },
  { id: "sf", city: "San Francisco", name: "49ers", abbreviation: "SF", primary: "#AA0000", secondary: "#B3995D" },
  { id: "sea", city: "Seattle", name: "Seahawks", abbreviation: "SEA", primary: "#002244", secondary: "#69BE28" },
  { id: "tb", city: "Tampa Bay", name: "Buccaneers", abbreviation: "TB", primary: "#D50A0A", secondary: "#FF7900" },
  { id: "ten", city: "Tennessee", name: "Titans", abbreviation: "TEN", primary: "#0C2340", secondary: "#4B92DB" },
  { id: "was", city: "Washington", name: "Commanders", abbreviation: "WAS", primary: "#5A1414", secondary: "#FFB612" },
];

export function getTeamById(id: string): NflTeam | undefined {
  return NFL_TEAMS.find((t) => t.id === id);
}

export type ColorMode = "home" | "away";

export const STORAGE_KEYS = {
  team: "audible-favorite-team",
  colorMode: "audible-color-mode",
  onboarded: "audible-onboarded",
  connected: "audible-connected",
  isPro: "audible-is-pro",
} as const;

export function applyTeamTheme(team: NflTeam, mode: ColorMode) {
  const root = document.documentElement;
  root.dataset.mode = mode;
  root.dataset.team = team.id;
  root.style.setProperty("--team-primary", team.primary);
  root.style.setProperty("--team-secondary", team.secondary);

  if (mode === "home") {
    root.style.setProperty("--turf", "#f2f3ee");
    root.style.setProperty("--turf-2", "#ffffff");
    root.style.setProperty("--turf-3", "#e6e8e1");
    root.style.setProperty("--chalk", "#141614");
    root.style.setProperty("--chalk-60", "rgba(20, 22, 20, 0.65)");
    root.style.setProperty("--chalk-35", "rgba(20, 22, 20, 0.4)");
    root.style.setProperty("--line", "rgba(0, 0, 0, 0.08)");
    root.style.setProperty("--flag", team.primary);
    root.style.setProperty("--flag-dim", hexAlpha(team.primary, 0.14));
    root.style.setProperty("--app-bg", `linear-gradient(180deg, ${hexAlpha(team.primary, 0.06)} 0%, #f2f3ee 40%)`);
    root.style.setProperty("--btn-primary-text", getContrastText(team.primary));
  } else {
    const darkBase = mixHex(team.secondary, "#060b08", 0.75);
    const cardBg = mixHex(team.primary, darkBase, 0.12);
    const raised = mixHex(team.primary, darkBase, 0.2);
    root.style.setProperty("--turf", darkBase);
    root.style.setProperty("--turf-2", cardBg);
    root.style.setProperty("--turf-3", raised);
    root.style.setProperty("--chalk", "#f2f4ee");
    root.style.setProperty("--chalk-60", "rgba(242, 244, 238, 0.6)");
    root.style.setProperty("--chalk-35", "rgba(242, 244, 238, 0.35)");
    root.style.setProperty("--line", "rgba(242, 244, 238, 0.12)");
    root.style.setProperty("--flag", team.primary);
    root.style.setProperty("--flag-dim", hexAlpha(team.primary, 0.18));
    root.style.setProperty(
      "--app-bg",
      `repeating-linear-gradient(to bottom, transparent 0 79px, rgba(242,244,238,0.028) 79px 80px), ${darkBase}`
    );
    root.style.setProperty("--btn-primary-text", getContrastText(team.primary));
  }
}

function hexAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixHex(a: string, b: string, weight: number) {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa.r * weight + pb.r * (1 - weight));
  const g = Math.round(pa.g * weight + pb.g * (1 - weight));
  const bl = Math.round(pa.b * weight + pb.b * (1 - weight));
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function getContrastText(hex: string) {
  const { r, g, b } = parseHex(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#141614" : "#f2f4ee";
}
