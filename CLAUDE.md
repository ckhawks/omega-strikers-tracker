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

## Auto-capture (game client → tracker)

Matches are captured automatically by a UE4SS Lua mod (NOT in this repo; lives at
`…/OmegaStrikers/Binaries/Win64/Mods/OSCapture/Scripts/main.lua`). It reads the
game's `APMGameState.MatchEventLog` at match end (all modes incl. customs), builds a
JSON payload, and POSTs it via Windows `curl.exe` (`os.execute`) — no companion process.

- Ingest: `POST /api/ingest`, header `x-ingest-token` == env `INGEST_TOKEN`. Dedup on
  `Match.gameId` (falls back to `matchSignature`). Auto-creates a `Player` +
  `PlayerAccount` per unseen game account.
- New auto data = `source='auto_capture'`, active `Season`; legacy manual data =
  `source='legacy_manual'`, "Legacy" season. Guard `RANKS[Math.round(rank)]` — auto
  rows have null rank (use tier/MMR columns instead).
- Dev loop: run `next dev` (:3010); mod's `ENDPOINT` points at it. For prod, deploy to
  VPS and repoint `ENDPOINT`. Live "new match" toast polls `/api/latest-match`.
- Awakening icons: `public/awakenings/` + `src/constants/awakeningIcons.ts` (name→path),
  scraped from omegastrikers.wiki.gg via a real browser (wiki 403s curl/node on /images/).
- Deeper design/findings notes live in assistant memory `auto-capture-approach.md`.
- Open work: see `TODO-auto-capture-YYYY-MM-DD.md`.
