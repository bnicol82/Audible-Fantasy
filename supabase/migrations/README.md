# Deprecated — use Neon instead

This folder contains the original Supabase-oriented migration (with `auth.users` + RLS).

The active schema for Neon is:

```
db/migrations/001_initial_schema.sql
```

Apply with:

```bash
npm run db:migrate
```
