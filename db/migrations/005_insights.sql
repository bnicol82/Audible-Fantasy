-- Phase 3: proactive insights feed. Unlike `recommendations` (a per-week cache of the
-- screen payloads a user explicitly opens), insights are unprompted alerts pushed into a
-- notification feed, each carrying read/dismissed state and a dedupe key so the same fact
-- is never alerted twice.

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  league_id uuid not null references public.leagues (id) on delete cascade,
  week int not null,
  kind text not null check (kind in ('injury', 'weather', 'lineup', 'waiver', 'trade')),
  severity text not null check (severity in ('info', 'warning', 'urgent')),
  headline text not null,
  body text not null,
  dedupe_key text not null,
  payload jsonb not null default '{}',
  status text not null default 'new' check (status in ('new', 'seen', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, league_id, dedupe_key)
);

create index if not exists insights_feed_idx
  on public.insights (user_id, league_id, status, created_at desc);
