-- Sleeper account fields on profiles (pre-auth local profiles)

alter table public.profiles
  add column if not exists sleeper_username text,
  add column if not exists sleeper_user_id text;

create index if not exists profiles_sleeper_user_id_idx
  on public.profiles (sleeper_user_id);
