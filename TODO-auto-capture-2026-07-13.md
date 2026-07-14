# Auto-Capture — TODO (as of 2026-07-13)

Status: core pipeline **done and committed** (branch `auto-capture-integration`).
A real match captures from the game client → POSTs to `/api/ingest` → lands in the
VPS DB with dedup, account mapping, awakenings, MVP/goalie/rank, sets, mode, map, duration.

## To go fully live (beyond the dev machine)
- [x] **Deploy the Next.js site to the VPS.** Merged to `main` and pushed
      (2026-07-13). Runs via systemd (`os-tracker`, port 3010) behind nginx
      subdomain. Then set the mod's `ENDPOINT` in `Mods/OSCapture/config.txt`
      (no longer the Lua) to the VPS URL.
- [ ] **Distribute the mod to friends.** Ship UE4SS + OSCapture folder; each
      friend edits `config.txt` (ENDPOINT + their token from `/admin/tokens`).
      This also turns on the **3-reporter merge** (fills in each friend's MMR,
      which only replicates to their own client).
- [ ] **Seed identity mapping.** Auto-capture creates a *separate* Player per game
      account, so auto "stlrc" ≠ legacy "stlrc". Seed `PlayerAccount`
      (gameAccountId → existing Player id) for the friend group.
      NEEDS: which accounts are friends vs randoms (don't auto-merge by name).
      Known so far: stlrc=636fef9e…, syduck=6a52dd97…, KawakamiPrincess=6975a1ae…

## Validation
- [ ] **Play one Ranked / draft match** → validates bans + rank/MMR + duration
      (Normal/Quickplay have no ban phase and no MMR).

## Security / deps
- [ ] **Upgrade to `next@16`.** Bumped to `next@14.2.35` (2026-07-13) which cleared
      13/18 audit findings incl. the critical middleware auth-bypass. Remaining 5
      (RSC/image DoS + dev-tooling `glob` ReDoS + build-time postcss XSS) only fix
      in next@16 — a breaking 14→15→16 + React 18→19 migration. No RCE / 0 critical
      on 14.2.35. Do as its own effort, not on deploy day.

## Draft order
- [x] **Striker draft order** (2026-07-13). Mod sends raw `selections[]` (game's
      `CharactersSelected` log — hovers have null `striker_code`, lock-ins don't).
      Ingest reduces to per-player `strikerPickOrder` (last non-null pick per account,
      ranked by `pick_index`) + `Match.firstPickTeam` (team of pick #1; draft is a
      snake). Migration `003_striker_draft_order.sql` applied to prod. Match page shows
      a **Pick** column + **Draft → First pick: Team N**. NOTE: reduction rule verified
      only on a **2-player** draft — sanity-check the first **3v3** capture's Pick order.
- [ ] **Awakening draft order** (per set) — deferred. Mod already captures
      `select_index` per awakening (position in the `TrainingsSelected` log). Still need
      a real multi-set dump to confirm how `Round` + `select_index` segment: `Round` is
      **not** the set index (a 2-set match showed all awakenings tagged `r4`, so `Round`
      is a goal/phase counter). Plan once confirmed: add `selectIndex` column to
      `MatchPlayerAwakening`, derive per-set pick order, surface on match page.
- Bans are captured (resolved team slots `team1BanStriker`/`team2BanStriker`). Ban
  *order*/attribution is available via `BannedCharactersData.BannedCharacterVotes[]`
  (PlayerState + banned char per vote) but intentionally **not** captured — not wanted.

## Polish / deferred
- [x] **Sound cue on upload.** Done — plays a random ability SFX via
      `PostEventByName` after upload (`sfx_cha_generic_evade` /
      `sfx_cha_luna_skin02_bigRocket_cast`). F7 browses sounds.
- [ ] **Player-page MMR trend** (match page already shows per-player MMR).
- [ ] **In-play duration.** Current `duration` = total match session time (incl.
      champ select/draft/intermissions). Pure in-play would need a match-start hook.
- [ ] **Ability counting** — parked (local-player-only; input hooks didn't cooperate).
- [ ] **Heatmaps** (movement / shot-origin) — long-term; schema left extensible.
- [ ] Remove stray `public/awakenings/OdyPoints.png` (and `MagneticSoles.webp`
      duplicate of `MagnetizedSoles.webp`) — harmless.

## Housekeeping
- [x] **Merge `auto-capture-integration` → main** (2026-07-13).

## Reference
- Mod: vendored at `mod/OSCapture/Scripts/main.lua` (game folder is a junction to it).
  How to extend: `docs/MOD-DEVELOPMENT.md`.
- VPS Postgres: see `CLAUDE.md` (host/port, docker `postgres:16` for psql).
- Full design + findings: assistant memory `auto-capture-approach.md`.
