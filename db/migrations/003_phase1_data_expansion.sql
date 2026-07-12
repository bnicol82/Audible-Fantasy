-- Phase 1 AI/data redesign: real per-league rules, game-level enrichment data (weather,
-- odds), and waiver/trade transaction history.

-- League-level rules beyond scoring/roster slots: waiver type, FAAB budget, taxi/IR slot
-- counts, playoff format, trade deadline. Same jsonb-column pattern as the existing
-- scoring_settings/roster_slots columns rather than a wide table of scalar columns.
alter table public.leagues
  add column if not exists rules jsonb not null default '{}';

-- Game-level facts (weather, Vegas lines) are shared across every league/user watching
-- that game — they don't belong keyed per-league like `matchups`, which would duplicate
-- identical data once per user.
create table if not exists public.game_conditions (
  id uuid primary key default gen_random_uuid(),
  season int not null,
  week int not null,
  home_team text not null,
  away_team text not null,
  kickoff_utc timestamptz,
  is_outdoor boolean not null default true,
  weather jsonb not null default '{}',
  odds jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique (season, week, home_team, away_team)
);

create index if not exists game_conditions_season_week_idx
  on public.game_conditions (season, week);

-- Waiver/free-agent/trade transaction history, sourced from Sleeper's transactions
-- endpoint (previously fetched by getSleeperTransactions but never persisted anywhere).
-- This is what makes FAAB-remaining a real computed value instead of a hardcoded constant.
create table if not exists public.league_transactions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  external_transaction_id text,
  type text not null check (type in ('waiver', 'free_agent', 'trade')),
  week int not null,
  roster_id text,
  faab_spent int,
  adds jsonb not null default '{}',
  drops jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (league_id, external_transaction_id)
);

create index if not exists league_transactions_league_id_idx
  on public.league_transactions (league_id);
