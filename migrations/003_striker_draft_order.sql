--
-- Migration 003: striker draft order
--
-- Records the pre-match striker draft: the per-player pick order and which team
-- drafted first (the draft is a snake, so the first-pick team matters).
--
-- Derived on ingest from the payload's `selections[]` (the game's
-- CharactersSelected event log): a player's confirmed pick is their last non-null
-- striker selection; draft order = players ranked by that selection's index;
-- first-pick team = the team of pick #1.
--
-- All additions are nullable, so existing rows, legacy manual data, and any
-- capture that lacks draft data keep working unchanged.
--
-- Idempotent (IF NOT EXISTS). Wrap in a transaction.

BEGIN;

-- Which team had the first pick in the snake draft (1 or 2; null if unknown).
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS "firstPickTeam" integer;

-- 1-based striker draft position for this player (1 = first striker locked in).
-- Null for legacy/manual rows and any capture without draft data.
ALTER TABLE public."MatchPlayer" ADD COLUMN IF NOT EXISTS "strikerPickOrder" integer;

COMMIT;
