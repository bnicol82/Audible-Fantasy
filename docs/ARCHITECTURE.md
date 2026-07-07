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
| Backend | Supabase (Postgres, Auth, RLS, Edge Functions) |
| AI | Anthropic API (tool use + streaming) |
| Data | Sleeper API + nflverse (Phase 1) |
| Payments | Stripe (Phase 2) |
| Deploy | Vercel (API routes) + GitHub Pages (UI mockups) |

## Project layout

```
src/
  app/              # Next.js routes + API
  components/       # UI screens (mockups → production)
  lib/
    providers/      # LeagueProvider (Sleeper, Manual, Yahoo, ESPN)
    supabase/       # Auth + DB clients
    ai/             # Tool definitions + system prompt
supabase/
  migrations/     # Postgres schema + RLS
```

## Phase 1 (MVP — before Week 1 2026)

- [x] UI mockups (connect, roster, chat, start/sit, waivers, paywall, pro dashboard)
- [x] `LeagueProvider` interface + Sleeper provider
- [x] Database schema + RLS policies
- [x] AI tool definitions + chat API skeleton
- [ ] Supabase project linked + migrations applied
- [ ] Sleeper league sync → Postgres persistence
- [ ] AI chat with tool execution against DB
- [ ] Scoring computation tests

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/leagues/connect` | Fetch Sleeper leagues by username |
| `POST /api/chat` | Streaming AI chat (requires `ANTHROPIC_API_KEY`) |

## Environment

Copy `.env.example` → `.env.local` and fill in Supabase + Anthropic keys.

## Deployment note

GitHub Pages serves static UI only (no API routes). For full backend:
deploy to **Vercel** with environment variables configured.
