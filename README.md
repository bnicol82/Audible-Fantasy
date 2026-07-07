# Audible

**Fantasy football AI assistant** — connect your league, ask grounded questions, set lineups, work waivers, evaluate trades.

## Live Demo (UI mockups)

**https://bnicol82.github.io/Audible-Fantasy/**

## Product

Audible is your fantasy team's second brain. Unlike generic chatbots, every AI answer is grounded in **your** roster, **your** scoring settings, and **this week's** matchups.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full product & technical plan.

## Screens

| # | Screen | Status |
|---|--------|--------|
| 01 | Connect league | UI + Sleeper API route |
| 02 | My Team | UI mockup |
| 03 | Ask Audible | UI mockup |
| 04 | Start / Sit | UI mockup |
| 05 | Waivers | UI mockup |
| 06 | Paywall | UI mockup |
| 07 | Pro Dashboard | UI mockup |

## Local Development

```bash
cp .env.example .env.local
# Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

npm install
npm run dev
```

## Database

```bash
# Apply migrations to your Supabase project
supabase db push
```

Schema: `supabase/migrations/20260707000000_initial_schema.sql`

## Deployment

| Target | Use case |
|--------|----------|
| **GitHub Pages** | Static UI mockups (auto-deploy on push to `main`) |
| **Vercel** | Full app with API routes, Supabase, AI chat |

### Vercel setup

1. Link repo at [vercel.com](https://vercel.com)
2. Add env vars from `.env.example`
3. Set `VERCEL_DEPLOY_ENABLED=true` in GitHub repo variables for CI deploy

## Tech Stack

- Next.js 15 · React 19 · TypeScript
- Supabase (Postgres, Auth, RLS)
- Anthropic API (Claude with tool use)
- Sleeper API (league sync)
