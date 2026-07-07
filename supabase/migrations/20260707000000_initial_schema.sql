-- Audible: core schema (sport-agnostic bones, football at launch)
-- See docs/ARCHITECTURE.md for product context

create extension if not exists "pgcrypto";

-- Profiles extend Supabase auth.users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro')),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leagues (
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

create table public.players (
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

create index players_external_ids_idx on public.players using gin (external_ids);
create index players_sport_position_idx on public.players (sport, position);

create table public.rosters (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  external_roster_id text,
  team_name text,
  owner_name text,
  entries jsonb not null default '[]',
  synced_at timestamptz not null default now(),
  unique (league_id, external_roster_id)
);

create table public.player_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  season int not null,
  week int,
  raw_stats jsonb not null default '{}',
  unique (player_id, season, week)
);

create table public.projections (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  season int not null,
  week int not null,
  source text not null,
  raw jsonb not null default '{}',
  unique (player_id, season, week, source)
);

create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players (id) on delete set null,
  headline text not null,
  body text,
  source text,
  published_at timestamptz not null default now()
);

create table public.matchups (
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

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete set null,
  title text,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tool_calls jsonb,
  tokens_used int,
  created_at timestamptz not null default now()
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  league_id uuid not null references public.leagues (id) on delete cascade,
  type text not null check (type in ('waiver', 'lineup', 'trade')),
  week int not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.usage_limits (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  messages_this_week int not null default 0,
  week_start date not null default date_trunc('week', now())::date,
  messages_today int not null default 0,
  day_start date not null default current_date
);

-- RLS
alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.rosters enable row level security;
alter table public.players enable row level security;
alter table public.player_stats enable row level security;
alter table public.projections enable row level security;
alter table public.news_items enable row level security;
alter table public.matchups enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.recommendations enable row level security;
alter table public.usage_limits enable row level security;

-- Profiles: users read/update own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- User-owned tables
create policy "leagues_own" on public.leagues
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rosters_via_league" on public.rosters
  for all using (
    exists (
      select 1 from public.leagues l
      where l.id = rosters.league_id and l.user_id = auth.uid()
    )
  );

create policy "matchups_via_league" on public.matchups
  for all using (
    exists (
      select 1 from public.leagues l
      where l.id = matchups.league_id and l.user_id = auth.uid()
    )
  );

create policy "conversations_own" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages_via_conversation" on public.messages
  for all using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "recommendations_own" on public.recommendations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "usage_limits_own" on public.usage_limits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shared read-only reference data
create policy "players_read_all" on public.players
  for select using (true);

create policy "player_stats_read_all" on public.player_stats
  for select using (true);

create policy "projections_read_all" on public.projections
  for select using (true);

create policy "news_read_all" on public.news_items
  for select using (true);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  insert into public.usage_limits (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
