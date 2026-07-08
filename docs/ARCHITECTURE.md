# Audible — Architecture

Fantasy football AI assistant. Mobile-first PWA. Multi-sport by design, football at launch.

## Principles

1. **Grounded, never hallucinated** — AI uses tools against cached Postgres data
2. **Sync-first, manual-fallback** — Sleeper username → real roster
3. **Sport-agnostic bones** — `LeagueProvider` interface, JSONB for platform quirks

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), PWA |
| Backend | Neon Postgres (via Vercel) + API routes |
| AI | Anthropic API (tool use + streaming) |
| Data | Sleeper API + nflverse (Phase 1) |
| Auth | Clerk (Phase 1B — replaces Supabase Auth) |
| Payments | Stripe (Phase 2) |
| Deploy | Vercel (API routes) + GitHub Pages (UI mockups) |

## Project layout

```
src/
  app/              # Next.js routes + API
  components/       # UI screens (mockups → production)
  lib/
    providers/      # LeagueProvider (Sleeper, Manual, Yahoo, ESPN)
    db.ts           # Neon Postgres client
    ai/             # Tool definitions + system prompt
db/
  migrations/       # Postgres schema (Neon)
```

## Phase 1 (MVP — before Week 1 2026)

- [x] UI mockups (connect, roster, chat, start/sit, waivers, paywall, pro dashboard)
- [x] `LeagueProvider` interface + Sleeper provider
- [x] Database schema (Neon Postgres)
- [x] AI tool definitions + chat API skeleton
- [x] Neon linked on Vercel + migrations applied
- [x] Sleeper league sync → Postgres persistence
- [x] AI chat with tool execution against Sleeper data
- [x] Ask Audible wired to streaming chat API with league context
- [x] Start/Sit and Waivers screens powered by Sleeper tools (demo fallback)
- [x] Settings page (league, roster slots, scoring rules, appearance)
- [x] Player cache / projections pipeline in Neon
- [x] Draft Mode — pre-draft UI, draft board, and AI draft tools
- [ ] Scoring computation tests

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/leagues/connect` | Fetch Sleeper leagues by username |
| `POST /api/leagues/sync` | Persist league + roster to Neon |
| `GET /api/leagues/active` | Load synced roster + matchup + cached projections |
| `GET /api/leagues/settings` | League info, roster slots, scoring rules |
| `GET /api/fantasy/draft` | Draft board, roster needs, and targets |
| `POST /api/chat` | Streaming AI chat (requires `ANTHROPIC_API_KEY`) |
| `GET /api/fantasy/start-sit` | Start/sit comparison with cached projections |
| `GET /api/fantasy/waivers` | Trending waiver adds |
| `GET /api/cache/sync` | Cache status (or sync when `CRON_SECRET` auth header present) |
| `POST /api/cache/sync` | Sync Sleeper projections + trending players to Neon |

## Environment

Copy `.env.example` → `.env.local` and fill in `DATABASE_URL`, `ANTHROPIC_API_KEY`, and optionally `CRON_SECRET` for scheduled cache sync.

## Deployment note

GitHub Pages serves static UI only (no API routes). For full backend:
deploy to **Vercel** with `DATABASE_URL` and `ANTHROPIC_API_KEY` configured.
