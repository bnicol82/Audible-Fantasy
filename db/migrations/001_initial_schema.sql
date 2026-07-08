-- Audible: Neon Postgres schema (adapted from Supabase migration)
-- Auth/RLS enforced in API routes until Clerk (or similar) is added.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  external_auth_id text unique,
  email text,
  display_name text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro')),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('sleeper', 'yahoo', 'espn', 'manual')),
  external_league_id text,
  sport text not null default 'nfl',
  name text not null,
  scoring_settings jsonb not null default '{}',
  roster_slots jsonb not null default '[]',
  season int not null,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, platform, external_league_id)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  sport text not null default 'nfl',
  name text not null,
  team text,
  position text,
  status text,
  external_ids jsonb not null default '{}',
  metadata jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists players_external_ids_idx on public.players using gin (external_ids);
create index if not exists players_sport_position_idx on public.players (sport, position);

create table if not exists public.rosters (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  external_roster_id text,
  team_name text,
  owner_name text,
  entries jsonb not null default '[]',
  synced_at timestamptz not null default now(),
  unique (league_id, external_roster_id)
);

create table if not exists public.player_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  season int not null,
  week int,
  raw_stats jsonb not null default '{}',
  unique (player_id, season, week)
);

create table if not exists public.projections (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  season int not null,
  week int not null,
  source text not null,
  raw jsonb not null default '{}',
  unique (player_id, season, week, source)
);

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players (id) on delete set null,
  headline text not null,
  body text,
  source text,
  published_at timestamptz not null default now()
);

create table if not exists public.matchups (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  week int not null,
  home_roster_id uuid references public.rosters (id),
  away_roster_id uuid references public.rosters (id),
  home_score numeric,
  away_score numeric,
  metadata jsonb not null default '{}',
  unique (league_id, week, home_roster_id, away_roster_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete set null,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tool_calls jsonb,
  tokens_used int,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  league_id uuid not null references public.leagues (id) on delete cascade,
  type text not null check (type in ('waiver', 'lineup', 'trade')),
  week int not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.usage_limits (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  messages_this_week int not null default 0,
  week_start date not null default date_trunc('week', now())::date,
  messages_today int not null default 0,
  day_start date not null default current_date
);

create index if not exists leagues_user_id_idx on public.leagues (user_id);
create index if not exists rosters_league_id_idx on public.rosters (league_id);
create index if not exists conversations_user_id_idx on public.conversations (user_id);
