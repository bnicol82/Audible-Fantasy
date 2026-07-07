export type Player = {
  slot: string;
  name: string;
  team: string;
  matchup: string;
  projection: number;
  injury?: string;
  questionable?: boolean;
};

export type WaiverTarget = {
  name: string;
  position: string;
  team: string;
  rostered: string;
  suggestedBid: number;
  why: string;
  tags: { label: string; variant?: "gold" | "red" }[];
  dropSuggestion?: string;
};

export const league = {
  name: "The Gauntlet League",
  scoring: "Half PPR",
  week: 5,
  record: "3–1",
  faabRemaining: 62,
  claimsSet: 2,
};

export const matchup = {
  yourTeam: "Billy's Bandits",
  opponent: "Gridiron Gang",
  yourProjection: 118.4,
  opponentProjection: 112.7,
  winProbability: 57,
  kickoff: "SUN 1:00 PM",
};

export const roster: Player[] = [
  { slot: "QB", name: "Josh Allen", team: "BUF", matchup: "vs MIA", projection: 22.4 },
  { slot: "RB", name: "Bijan Robinson", team: "ATL", matchup: "@ CAR", projection: 18.9 },
  {
    slot: "RB",
    name: "Jahmyr Gibbs",
    team: "DET",
    matchup: "vs GB",
    projection: 15.1,
    questionable: true,
    injury: "ANKLE",
  },
  { slot: "WR", name: "Ja'Marr Chase", team: "CIN", matchup: "@ BAL", projection: 17.6 },
  { slot: "WR", name: "Puka Nacua", team: "LAR", matchup: "vs SEA", projection: 16.8 },
  { slot: "TE", name: "Trey McBride", team: "ARI", matchup: "@ SF", projection: 11.2 },
  { slot: "FLX", name: "Zay Flowers", team: "BAL", matchup: "vs CIN", projection: 13.2 },
];

export const waiverTargets: WaiverTarget[] = [
  {
    name: "Tyjae Spears",
    position: "RB",
    team: "TEN",
    rostered: "41%",
    suggestedBid: 14,
    why: "Covers your thinnest position — you have no RB3, and Gibbs is questionable. Lead-back usage the last 2 weeks (68% snaps).",
    tags: [{ label: "FILLS RB DEPTH", variant: "gold" }],
    dropSuggestion: "J. FORD",
  },
  {
    name: "Darnell Mooney",
    position: "WR",
    team: "ATL",
    rostered: "33%",
    suggestedBid: 6,
    why: "20%+ target share three straight weeks. A steady bye-week WR with the ATL passing volume trending up.",
    tags: [{ label: "BYE-WEEK COVER" }],
    dropSuggestion: "R. DOUBS",
  },
  {
    name: "Cade Otton",
    position: "TE",
    team: "TB",
    rostered: "18%",
    suggestedBid: 2,
    why: "Streaming option only — skip unless McBride's workload dips. Red-zone looks up, but low weekly floor.",
    tags: [{ label: "LOW PRIORITY", variant: "red" }],
  },
];

export const startSitComparison = {
  playerA: {
    initials: "PN",
    name: "Puka Nacua",
    position: "WR",
    team: "LAR",
    matchup: "vs SEA",
    isWinner: true,
  },
  playerB: {
    initials: "ZF",
    name: "Zay Flowers",
    position: "WR",
    team: "BAL",
    matchup: "vs CIN",
    isWinner: false,
  },
  stats: [
    { label: "Proj (Half PPR)", a: "16.8", b: "13.2", winner: "a" as "a" | "b" | null },
    { label: "Avg L4 Weeks", a: "15.4", b: "12.1", winner: "a" as "a" | "b" | null },
    { label: "Target Share", a: "27%", b: "21%", winner: "a" as "a" | "b" | null },
    { label: "Opp Rank vs WR", a: "#4", b: "#22", winner: "a" as "a" | "b" | null },
    { label: "Injury Status", a: "—", b: "—", winner: null as "a" | "b" | null },
  ],
  verdict: "Better volume, softer matchup, higher floor and ceiling. High confidence.",
};

export type ProTeam = {
  id: string;
  leagueName: string;
  platform: string;
  scoring: string;
  teamName: string;
  record: string;
  yourProjection: number;
  opponentProjection: number;
  winProbability: number;
  kickoff: string;
  losing?: boolean;
  tags: { label: string; variant?: "gold" | "red" }[];
};

export const proTeams: ProTeam[] = [
  {
    id: "gauntlet",
    leagueName: "The Gauntlet",
    platform: "SLEEPER",
    scoring: "HALF PPR",
    teamName: "BILLY'S BANDITS",
    record: "3–1",
    yourProjection: 118.4,
    opponentProjection: 112.7,
    winProbability: 57,
    kickoff: "SUN 1:00",
    tags: [
      { label: "1 LINEUP QUESTION", variant: "gold" },
      { label: "GIBBS Q · ANKLE" },
    ],
  },
  {
    id: "office",
    leagueName: "Office League",
    platform: "YAHOO",
    scoring: "PPR",
    teamName: "TEAM BILLY",
    record: "2–2",
    yourProjection: 104.2,
    opponentProjection: 121.8,
    winProbability: 34,
    kickoff: "SUN 1:00",
    losing: true,
    tags: [
      { label: "UNDERDOG — SWING FOR CEILING", variant: "red" },
      { label: "1 LINEUP QUESTION", variant: "gold" },
    ],
  },
  {
    id: "dynasty",
    leagueName: "Dynasty Degens",
    platform: "SLEEPER",
    scoring: "SUPERFLEX",
    teamName: "BANDITS DYNASTY",
    record: "4–0",
    yourProjection: 131.6,
    opponentProjection: 109.3,
    winProbability: 71,
    kickoff: "SUN 4:25",
    tags: [{ label: "LINEUP SET ✓" }, { label: "2 WAIVER TARGETS", variant: "gold" }],
  },
];

export const paywallFeatures = [
  { feature: "Leagues synced", free: "1", pro: "∞" },
  { feature: "AI messages", free: "10/WK", pro: "∞" },
  { feature: "Waiver FAAB bids", free: "—", pro: "✓" },
  { feature: "Trade analyzer", free: "—", pro: "✓" },
  { feature: "Injury push alerts", free: "—", pro: "✓" },
];

export const paywallPlans = [
  { id: "monthly", label: "Monthly", price: "$4.99", detail: "CANCEL ANYTIME", hero: false },
  {
    id: "season",
    label: "Season Pass",
    price: "$24.99",
    detail: "AUG–JAN · ≈$4.17/MO",
    hero: true,
    badge: "⚑ BEST VALUE",
  },
  { id: "annual", label: "Annual", price: "$39.99", detail: "≈$3.33/MO", hero: false },
];
