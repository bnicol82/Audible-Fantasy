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
  profileId: "audible-profile-id",
  leagueId: "audible-league-id",
  sleeperUsername: "audible-sleeper-username",
  demoMode: "audible-demo-mode",
  appPhase: "audible-app-phase",
} as const;

export function applyTeamTheme(team: NflTeam, mode: ColorMode) {
  const root = document.documentElement;
  root.dataset.mode = mode;
  root.dataset.team = team.id;

  const primary = team.primary;
  const secondary = usableSecondary(team);
  const stripe = `linear-gradient(90deg, ${primary} 0%, ${primary} 50%, ${secondary} 50%, ${secondary} 100%)`;

  root.style.setProperty("--team-primary", primary);
  root.style.setProperty("--team-secondary", secondary);
  root.style.setProperty("--stripe-bar", stripe);
  root.style.setProperty("--stripe-thick", "8px");
  root.style.setProperty("--stripe-medium", "6px");

  if (mode === "home") {
    // White jersey: clean white field, bold team-color stripes & accents
    root.style.setProperty("--surface", "#ffffff");
    root.style.setProperty("--surface-card", "#ffffff");
    root.style.setProperty("--surface-raised", "#f7f7f5");
    root.style.setProperty("--text", "#121412");
    root.style.setProperty("--text-muted", "rgba(18, 20, 18, 0.68)");
    root.style.setProperty("--text-subtle", "rgba(18, 20, 18, 0.42)");
    root.style.setProperty("--line-thin", "rgba(18, 20, 18, 0.18)");
    root.style.setProperty("--stripe-a", primary);
    root.style.setProperty("--stripe-b", secondary);
    root.style.setProperty("--stripe-accent", secondary);
    root.style.setProperty("--accent", primary);
    root.style.setProperty("--accent-alt", secondary);
    root.style.setProperty("--accent-dim", hexAlpha(primary, 0.1));
    root.style.setProperty("--btn-primary-text", getContrastText(primary));
    root.style.setProperty("--app-bg", "#ffffff");
    root.style.setProperty("--tabbar-bg", "#ffffff");
    // Menu accents: legible on the white nav bar and on white icon tiles.
    root.style.setProperty("--accent-nav", ensureContrast(primary, "#ffffff"));
    root.style.setProperty("--accent-on-card", ensureContrast(primary, "#ffffff"));
    root.style.setProperty("--text-on-card", "var(--text)");
    root.style.setProperty("--text-on-card-muted", "var(--text-muted)");
    root.style.setProperty("--text-on-card-subtle", "var(--text-subtle)");
    root.style.setProperty("--line-on-card", "rgba(18, 20, 18, 0.2)");
    root.style.setProperty("--depth-highlight", "rgba(255, 255, 255, 0.95)");
    root.style.setProperty("--depth-shadow", "rgba(0, 0, 0, 0.1)");
    root.style.setProperty("--depth-shadow-strong", "rgba(0, 0, 0, 0.18)");
    root.style.setProperty(
      "--shadow-card",
      "0 1px 0 var(--depth-highlight) inset, 0 3px 0 var(--depth-shadow), 0 10px 24px var(--depth-shadow-strong)"
    );
    root.style.setProperty(
      "--shadow-raised",
      "0 2px 0 var(--depth-highlight) inset, 0 5px 0 var(--depth-shadow), 0 16px 36px var(--depth-shadow-strong)"
    );
    root.style.setProperty("--shadow-surface", "0 -8px 24px rgba(0, 0, 0, 0.1)");
  } else {
    // Away jersey: dark team field, light cards with dark readable text
    const darkBase = getAwayBase(team);

    root.style.setProperty("--surface", darkBase);
    root.style.setProperty("--surface-card", "#ffffff");
    root.style.setProperty("--surface-raised", "#f4f4f1");
    root.style.setProperty("--text", "#ffffff");
    root.style.setProperty("--text-muted", "rgba(255, 255, 255, 0.72)");
    root.style.setProperty("--text-subtle", "rgba(255, 255, 255, 0.45)");
    root.style.setProperty("--text-on-card", "#121412");
    root.style.setProperty("--text-on-card-muted", "rgba(18, 20, 18, 0.68)");
    root.style.setProperty("--text-on-card-subtle", "rgba(18, 20, 18, 0.42)");
    root.style.setProperty("--line-thin", "rgba(255, 255, 255, 0.28)");
    root.style.setProperty("--line-on-card", "rgba(18, 20, 18, 0.22)");
    root.style.setProperty("--stripe-a", "#ffffff");
    root.style.setProperty("--stripe-b", secondary);
    root.style.setProperty("--stripe-accent", primary);
    root.style.setProperty("--accent", primary);
    root.style.setProperty("--accent-alt", secondary);
    root.style.setProperty("--accent-dim", hexAlpha(primary, 0.12));
    root.style.setProperty("--btn-primary-text", getContrastText(primary));
    root.style.setProperty("--app-bg", darkBase);
    const tabbarBg = darken(darkBase, 0.15);
    root.style.setProperty("--tabbar-bg", tabbarBg);
    // Menu accents: the active label sits on the DARK nav bar (needs a light-enough
    // accent), while the active icon glyph sits on a WHITE tile (needs a dark-enough
    // accent) — so they're computed against different backgrounds.
    root.style.setProperty("--accent-nav", ensureContrast(primary, tabbarBg));
    root.style.setProperty("--accent-on-card", ensureContrast(primary, "#ffffff"));
    root.style.setProperty("--depth-highlight", "rgba(255, 255, 255, 0.88)");
    root.style.setProperty("--depth-shadow", "rgba(0, 0, 0, 0.22)");
    root.style.setProperty("--depth-shadow-strong", "rgba(0, 0, 0, 0.45)");
    root.style.setProperty(
      "--shadow-card",
      "0 2px 0 var(--depth-highlight) inset, 0 4px 0 var(--depth-shadow), 0 14px 36px var(--depth-shadow-strong)"
    );
    root.style.setProperty(
      "--shadow-raised",
      "0 2px 0 var(--depth-highlight) inset, 0 6px 0 var(--depth-shadow), 0 20px 48px var(--depth-shadow-strong)"
    );
    root.style.setProperty("--shadow-surface", "0 -10px 32px rgba(0, 0, 0, 0.45)");
  }

  // Legacy aliases used across components
  root.style.setProperty("--turf", "var(--surface)");
  root.style.setProperty("--turf-2", "var(--surface-card)");
  root.style.setProperty("--turf-3", "var(--surface-raised)");
  root.style.setProperty("--chalk", "var(--text)");
  root.style.setProperty("--chalk-60", "var(--text-muted)");
  root.style.setProperty("--chalk-35", "var(--text-subtle)");
  root.style.setProperty("--line", "var(--line-thin)");
  root.style.setProperty("--flag", "var(--accent)");
  root.style.setProperty("--flag-dim", "var(--accent-dim)");
}

/** If secondary is pure black, use a lifted tone so stripes remain visible on dark away */
function usableSecondary(team: NflTeam) {
  if (luminance(team.secondary) < 0.08) {
    return mixHex(team.primary, "#3a3a3a", 0.35);
  }
  return team.secondary;
}

function getAwayBase(team: NflTeam) {
  const pDark = darken(team.primary, 0.35);
  const sDark = darken(usableSecondary(team), 0.25);
  return luminance(pDark) < luminance(sDark) ? pDark : sDark;
}

function hexAlpha(hex: string, alpha: number) {
  const { r, g, b } = parseHex(hex);
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

function darken(hex: string, amount: number) {
  return mixHex(hex, "#000000", 1 - amount);
}

function parseHex(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function luminance(hex: string) {
  const { r, g, b } = parseHex(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getContrastText(hex: string) {
  return luminance(hex) > 0.55 ? "#121412" : "#ffffff";
}

// WCAG relative luminance + contrast ratio, used to keep accent colors legible against
// whatever surface they land on (some team primaries are near-black or near-white).
function relLuminance(hex: string) {
  const { r, g, b } = parseHex(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: string, b: string) {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Nudges a foreground color toward white (on dark backgrounds) or black (on light ones)
// until it clears the target contrast ratio — so an accent stays visible no matter which
// team color it started from.
function ensureContrast(fg: string, bg: string, target = 3.2) {
  if (contrastRatio(fg, bg) >= target) return fg;
  const toward = relLuminance(bg) < 0.5 ? "#ffffff" : "#000000";
  let best = fg;
  for (let weight = 0.85; weight >= 0; weight -= 0.05) {
    best = mixHex(fg, toward, weight);
    if (contrastRatio(best, bg) >= target) break;
  }
  return best;
}
