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
- [ ] Player cache / projections pipeline in Neon
- [ ] Scoring computation tests

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/leagues/connect` | Fetch Sleeper leagues by username |
| `GET /api/leagues/active` | Load synced roster + matchup |
| `GET /api/leagues/settings` | League info, roster slots, scoring rules |
| `POST /api/chat` | Streaming AI chat (requires `ANTHROPIC_API_KEY`) |

## Environment

Copy `.env.example` → `.env.local` and fill in `DATABASE_URL` + `ANTHROPIC_API_KEY`.

## Deployment note

GitHub Pages serves static UI only (no API routes). For full backend:
deploy to **Vercel** with `DATABASE_URL` and `ANTHROPIC_API_KEY` configured.
