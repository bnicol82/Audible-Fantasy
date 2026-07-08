// Pure fantasy-point computation. No I/O — every input is already-fetched data.
//
// Sleeper's `scoring_settings` dict uses keys (pass_td, rec, bonus_rec_te, fum_lost, ...)
// that map almost 1:1 onto the raw stat fields its stats/projections endpoints return,
// including pre-computed bonus-threshold flags (e.g. bonus_rec_yd_100 is already 1/absent
// in the stat line). So the core rule is: sum(rules[k] * stats[k]) for every key present
// in both. The one real exception is team defense "points allowed", which Sleeper reports
// as a single scalar (pts_allow) that has to be bucketed against a tiered rule key.

export type RawStatLine = Record<string, number | undefined>;

export type ScoringRuleDict = Record<string, number>;

// Adapter for Sleeper's response payloads, which type raw stat fields as `unknown` to
// avoid index-signature conflicts with their explicitly-typed fields (player_id, etc.).
// Filters down to the numeric subset the scoring engine actually operates on.
export function toRawStatLine(blob: Record<string, unknown> | undefined): RawStatLine {
  const result: RawStatLine = {};
  if (!blob) return result;
  for (const [key, value] of Object.entries(blob)) {
    if (typeof value === "number") result[key] = value;
  }
  return result;
}

export type ScoringSettings = {
  format: "standard" | "half_ppr" | "ppr" | "custom";
  raw: ScoringRuleDict;
};

type PointsAllowedBracket = { max: number; key: string };

// Sleeper's standard defense points-allowed bracket keys, in ascending order.
const POINTS_ALLOWED_BRACKETS: PointsAllowedBracket[] = [
  { max: 0, key: "pts_allow_0" },
  { max: 6, key: "pts_allow_1_6" },
  { max: 13, key: "pts_allow_7_13" },
  { max: 20, key: "pts_allow_14_20" },
  { max: 27, key: "pts_allow_21_27" },
  { max: 34, key: "pts_allow_28_34" },
  { max: Infinity, key: "pts_allow_35p" },
];

const POINTS_ALLOWED_KEYS = new Set(POINTS_ALLOWED_BRACKETS.map((b) => b.key));

function pointsAllowedBonus(stats: RawStatLine, rules: ScoringRuleDict): number {
  const allowed = stats.pts_allow;
  if (typeof allowed !== "number") return 0;
  const bracket = POINTS_ALLOWED_BRACKETS.find((b) => allowed <= b.max);
  return bracket ? (rules[bracket.key] ?? 0) : 0;
}

export function computeFantasyPointsBreakdown(
  stats: RawStatLine | undefined,
  rules: ScoringRuleDict
): { total: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {};

  if (stats) {
    for (const [key, ruleValue] of Object.entries(rules)) {
      if (POINTS_ALLOWED_KEYS.has(key) || !ruleValue) continue;
      const statValue = stats[key];
      if (typeof statValue !== "number" || statValue === 0) continue;
      byCategory[key] = ruleValue * statValue;
    }

    const defenseBonus = pointsAllowedBonus(stats, rules);
    if (defenseBonus) byCategory.pts_allow = defenseBonus;
  }

  const total = Object.values(byCategory).reduce((sum, value) => sum + value, 0);
  return { total: Math.round(total * 100) / 100, byCategory };
}

export function computeFantasyPoints(
  stats: RawStatLine | undefined,
  rules: ScoringRuleDict
): number {
  return computeFantasyPointsBreakdown(stats, rules).total;
}

// Fallback rule dicts for leagues with no real scoring dict on file (e.g. manual-provider
// leagues), keyed by the coarse format bucket that's already stored today.
export const DEFAULT_STANDARD_RULES: ScoringRuleDict = {
  pass_yd: 0.04,
  pass_td: 4,
  pass_int: -2,
  pass_2pt: 2,
  rush_yd: 0.1,
  rush_td: 6,
  rush_2pt: 2,
  rec_yd: 0.1,
  rec_td: 6,
  rec_2pt: 2,
  fum_lost: -2,
};

export const DEFAULT_HALF_PPR_RULES: ScoringRuleDict = {
  ...DEFAULT_STANDARD_RULES,
  rec: 0.5,
};

export const DEFAULT_PPR_RULES: ScoringRuleDict = {
  ...DEFAULT_STANDARD_RULES,
  rec: 1,
};

export function defaultRulesForFormat(format?: string): ScoringRuleDict {
  if (format === "ppr") return DEFAULT_PPR_RULES;
  if (format === "standard") return DEFAULT_STANDARD_RULES;
  return DEFAULT_HALF_PPR_RULES;
}

// Computes points using the league's real scoring dict when one is on file, falling back
// to a generic default for the league's format bucket when it isn't (manual leagues, or
// legacy rows synced before this field existed).
export function computeFantasyPointsWithFallback(
  stats: RawStatLine | undefined,
  scoringSettings: ScoringSettings
): number {
  if (!stats) return 0;
  const rules =
    scoringSettings.raw && Object.keys(scoringSettings.raw).length > 0
      ? scoringSettings.raw
      : defaultRulesForFormat(scoringSettings.format);
  return computeFantasyPoints(stats, rules);
}
