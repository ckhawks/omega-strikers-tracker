# Auto-Capture — TODO (as of 2026-07-13)

Status: core pipeline **done and committed** (branch `auto-capture-integration`).
A real match captures from the game client → POSTs to `/api/ingest` → lands in the
VPS DB with dedup, account mapping, awakenings, MVP/goalie/rank, sets, mode, map, duration.

## To go fully live (beyond the dev machine)
- [ ] **Deploy the Next.js site to the VPS.** Captures currently only land while
      `next dev` runs locally. Deploy the app, then set the mod's `ENDPOINT`
      (in `Mods/OSCapture/Scripts/main.lua`) to the VPS URL.
- [ ] **Distribute the mod to friends.** Package UE4SS + OSCapture with each
      person's token/endpoint. This also turns on the **3-reporter merge**
      (fills in each friend's MMR, which only replicates to their own client).
- [ ] **Seed identity mapping.** Auto-capture creates a *separate* Player per game
      account, so auto "stlrc" ≠ legacy "stlrc". Seed `PlayerAccount`
      (gameAccountId → existing Player id) for the friend group.
      NEEDS: which accounts are friends vs randoms (don't auto-merge by name).
      Known so far: stlrc=636fef9e…, syduck=6a52dd97…, KawakamiPrincess=6975a1ae…

## Validation
- [ ] **Play one Ranked / draft match** → validates bans + rank/MMR + duration
      (Normal/Quickplay have no ban phase and no MMR).

## Polish / deferred
- [ ] **Sound cue on upload.** Transport is done; the actual sound play isn't wired
      (needs a `UAkAudioEvent` + play call — small mod investigation).
- [ ] **Player-page MMR trend** (match page already shows per-player MMR).
- [ ] **In-play duration.** Current `duration` = total match session time (incl.
      champ select/draft/intermissions). Pure in-play would need a match-start hook.
- [ ] **Ability counting** — parked (local-player-only; input hooks didn't cooperate).
- [ ] **Heatmaps** (movement / shot-origin) — long-term; schema left extensible.
- [ ] Remove stray `public/awakenings/OdyPoints.png` (and `MagneticSoles.webp`
      duplicate of `MagnetizedSoles.webp`) — harmless.

## Housekeeping
- [ ] **Merge `auto-capture-integration` → main** after review.

## Reference
- Mod (not in repo): `…/OmegaStrikers/Binaries/Win64/Mods/OSCapture/Scripts/main.lua`
- VPS Postgres: see `CLAUDE.md` (host/port, docker `postgres:16` for psql).
- Full design + findings: assistant memory `auto-capture-approach.md`.
