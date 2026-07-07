# Audible

**Fantasy football assistant** — connect your league, ask grounded AI questions, compare start/sit decisions, and get waiver recommendations.

## Live Demo

**https://bnicol82.github.io/Audible-Fantasy/**

## Screens

1. **Connect league** — Sleeper, Yahoo, ESPN
2. **My Team** — Roster dashboard with projections and win probability
3. **Ask Audible** — Grounded AI chat that knows your roster and scoring
4. **Start / Sit** — Side-by-side player comparison with verdict
5. **Waivers** — FAAB bid suggestions tailored to your roster

## Design

Night-game direction: turf-dark surfaces, chalk-line dividers, penalty-flag gold for decisions. Barlow Condensed headers, IBM Plex Mono scoreboard data.

## Local Development

```bash
npm install
npm run dev
```

## Deployment

Pushes to `main` auto-deploy via GitHub Actions to GitHub Pages.

```bash
GITHUB_PAGES=true npm run build
```

## Tech Stack

- Next.js 15
- React 19
- TypeScript
