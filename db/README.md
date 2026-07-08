# Database (Neon)

Audible uses **Neon Postgres** via Vercel (or direct Neon account).

## Setup

1. Create a Neon project at [neon.tech](https://neon.tech) or via **Vercel → Storage → Neon**
2. Copy the connection string (with `?sslmode=require`)
3. Add to Vercel env vars as `DATABASE_URL`
4. For local dev: copy to `.env.local`

```bash
cp .env.example .env.local
# paste DATABASE_URL into .env.local
npm run db:migrate
```

## Migrations

| File | Purpose |
|------|---------|
| `db/migrations/001_initial_schema.sql` | Core tables (profiles, leagues, rosters, players, chat, etc.) |

Apply locally:

```bash
npm run db:migrate
```

## Verify

After deploy, hit:

```
GET /api/health/db
```

Returns `{ "ok": true, "serverTime": "..." }` when connected.

## Notes

- Auth is **not** in the database yet — `profiles.external_auth_id` is reserved for Clerk (Phase 1B)
- Row-level security is enforced in API routes, not Postgres RLS (Neon has no Supabase Auth)
