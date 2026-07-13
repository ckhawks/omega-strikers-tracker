# omega-strikers-tracker

## Database

PostgreSQL on the VPS (migrated off Neon 2026-07-12). Connection details live in `.env`
(`DATABASE_URL` / `PGUSER` / `PGPASSWORD`). Host `216.146.25.22`, **port 7465**, db/user `omega-tracker`.

No local `psql`/`pg_dump` — use the Docker `postgres:16` image:

```bash
docker run --rm -i postgres:16 psql "$DATABASE_URL" -c 'SELECT ...'
# run a .sql file (mount its folder):
docker run --rm -v "$PWD/migrations:/mig" postgres:16 psql "$DATABASE_URL" -f /mig/001_auto_capture.sql
```

Notes:
- Remote access is IP-allowlisted in the VPS `pg_hba.conf` + firewall (port 7465). A new
  client IP needs its own rule added there.
- The app user owns the tables but is **not** a superuser (can't `CREATE EXTENSION` or
  `SET session_replication_role`); do those as the `postgres` superuser on the VPS.
- Schema uses quoted mixed-case identifiers (`"Match"`, `"MatchPlayer"`, ...) — always quote them.
- Migrations: plain `.sql` in `migrations/`, idempotent, run in order.
