-- Phase 2: conversation persistence + cached AI recommendations.

-- The recommendations table ships in 001 without a uniqueness guarantee, but Phase 2 uses
-- it as a per-(user, league, type, week) cache with upsert semantics. Dedupe defensively
-- first (the table has been unused so far, so this is a no-op in practice), then add the
-- unique index that `on conflict ... do update` needs.
delete from public.recommendations a
using public.recommendations b
where a.ctid < b.ctid
  and a.user_id = b.user_id
  and a.league_id = b.league_id
  and a.type = b.type
  and a.week = b.week;

alter table public.recommendations
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists recommendations_cache_key_idx
  on public.recommendations (user_id, league_id, type, week);

-- Chat history read paths: messages in order within a conversation, and a user's most
-- recent conversations per league.
create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

create index if not exists conversations_user_league_idx
  on public.conversations (user_id, league_id, created_at desc);
