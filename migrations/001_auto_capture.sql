--
-- Migration 001: auto-capture support
--
-- Adds season/source dividers, richer match + player fields, and new child tables
-- for set scores, awakenings, account->player mapping, and report provenance/dedup.
--
-- Safe to run on the new VPS database AFTER importing the existing Match/MatchPlayer/
-- Player data. All additions are nullable or defaulted, so existing rows and the
-- current manual insert flow keep working unchanged.
--
-- Idempotent where practical (IF NOT EXISTS). Wrap in a transaction.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- ---------------------------------------------------------------------------
-- Season: lightweight divider between legacy manual data and automated capture
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Season" (
    id          uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name        character varying NOT NULL,
    "isActive"  boolean DEFAULT false NOT NULL,   -- the season new captures land in
    "startedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "Season_pkey" PRIMARY KEY (id)
);

-- Seed two seasons: legacy (all old data) and the first automated season (active).
INSERT INTO public."Season" (name, "isActive", "startedAt")
SELECT 'Legacy (manual)', false, NULL
WHERE NOT EXISTS (SELECT 1 FROM public."Season" WHERE name = 'Legacy (manual)');

INSERT INTO public."Season" (name, "isActive", "startedAt")
SELECT 'Season 1 (automated)', true, now()
WHERE NOT EXISTS (SELECT 1 FROM public."Season" WHERE name = 'Season 1 (automated)');

-- ---------------------------------------------------------------------------
-- Match: new match-level columns
-- ---------------------------------------------------------------------------
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS source           character varying NOT NULL DEFAULT 'legacy_manual';
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS "seasonId"       uuid;
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS "gameId"         character varying;      -- canonical dedup key
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS "matchSignature" character varying;      -- fallback dedup key
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS mode             character varying;
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS terrain          character varying;
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS "winningTeam"    integer;
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS "mvpAccountId"   character varying;
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS "team1BanStriker" character varying;
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS "team2BanStriker" character varying;
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS "gameVersion"    character varying;
ALTER TABLE public."Match" ADD COLUMN IF NOT EXISTS "capturedAt"     timestamp with time zone;

-- Backfill existing rows -> legacy season (they defaulted to source=legacy_manual above).
UPDATE public."Match"
SET "seasonId" = (SELECT id FROM public."Season" WHERE name = 'Legacy (manual)')
WHERE "seasonId" IS NULL;

-- Dedup indexes (partial: only enforce uniqueness when the key is present).
CREATE UNIQUE INDEX IF NOT EXISTS "Match_gameId_key"
    ON public."Match" ("gameId") WHERE "gameId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Match_matchSignature_key"
    ON public."Match" ("matchSignature") WHERE "matchSignature" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Match_source_idx"   ON public."Match" (source);
CREATE INDEX IF NOT EXISTS "Match_seasonId_idx" ON public."Match" ("seasonId");

-- ---------------------------------------------------------------------------
-- MatchPlayer: new per-player columns (account identity, mvp, rank/MMR, extras)
-- ---------------------------------------------------------------------------
ALTER TABLE public."MatchPlayer" ADD COLUMN IF NOT EXISTS "gameAccountId" character varying;
ALTER TABLE public."MatchPlayer" ADD COLUMN IF NOT EXISTS username        character varying;
ALTER TABLE public."MatchPlayer" ADD COLUMN IF NOT EXISTS "strikerCode"   character varying;  -- CD_ id
ALTER TABLE public."MatchPlayer" ADD COLUMN IF NOT EXISTS "isMvp"         boolean DEFAULT false;
ALTER TABLE public."MatchPlayer" ADD COLUMN IF NOT EXISTS "ownGoals"      integer;
ALTER TABLE public."MatchPlayer" ADD COLUMN IF NOT EXISTS level           integer;
ALTER TABLE public."MatchPlayer" ADD COLUMN IF NOT EXISTS "ratingChange"  double precision;
ALTER TABLE public."MatchPlayer" ADD COLUMN IF NOT EXISTS "updatedRating" double precision;
ALTER TABLE public."MatchPlayer" ADD COLUMN IF NOT EXISTS "previousTier"  character varying;
ALTER TABLE public."MatchPlayer" ADD COLUMN IF NOT EXISTS "updatedTier"   character varying;

CREATE INDEX IF NOT EXISTS "MatchPlayer_gameAccountId_idx" ON public."MatchPlayer" ("gameAccountId");

-- ---------------------------------------------------------------------------
-- MatchSet: per-set scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."MatchSet" (
    id            uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "matchId"     uuid NOT NULL,
    "setNumber"   integer NOT NULL,
    "winningTeam" integer,
    "team1Goals"  integer NOT NULL DEFAULT 0,
    "team2Goals"  integer NOT NULL DEFAULT 0,
    CONSTRAINT "MatchSet_pkey" PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS "MatchSet_matchId_idx" ON public."MatchSet" ("matchId");

-- ---------------------------------------------------------------------------
-- MatchPlayerAwakening: draft picks (awakenings + gear) per player
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."MatchPlayerAwakening" (
    id              uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "matchPlayerId" uuid NOT NULL,
    round           integer,
    code            character varying NOT NULL,   -- TD_ id
    name            character varying,            -- resolved InGameName
    type            integer,                      -- 5=awakening, 1=gear, other=misc
    "pickOrder"     integer,
    CONSTRAINT "MatchPlayerAwakening_pkey" PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS "MatchPlayerAwakening_matchPlayerId_idx"
    ON public."MatchPlayerAwakening" ("matchPlayerId");

-- ---------------------------------------------------------------------------
-- PlayerAccount: maps a stable game account id -> a tracker Player
-- (lets repeat opponents attribute to the same player record over time)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."PlayerAccount" (
    id              uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "playerId"      uuid NOT NULL,
    "gameAccountId" character varying NOT NULL,
    username        character varying,
    "firstSeenAt"   timestamp with time zone DEFAULT now() NOT NULL,
    "lastSeenAt"    timestamp with time zone,
    CONSTRAINT "PlayerAccount_pkey" PRIMARY KEY (id),
    CONSTRAINT "PlayerAccount_gameAccountId_key" UNIQUE ("gameAccountId")
);
CREATE INDEX IF NOT EXISTS "PlayerAccount_playerId_idx" ON public."PlayerAccount" ("playerId");

-- ---------------------------------------------------------------------------
-- MatchReport: raw payload provenance + dedup ledger (one row per reporter)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."MatchReport" (
    id                  uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "matchId"           uuid,                     -- reconciled match (nullable until linked)
    "gameId"            character varying,
    "matchSignature"    character varying,
    "reporterAccountId" character varying,
    "rawPayload"        jsonb NOT NULL,
    "receivedAt"        timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "MatchReport_pkey" PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS "MatchReport_gameId_idx"  ON public."MatchReport" ("gameId");
CREATE INDEX IF NOT EXISTS "MatchReport_matchId_idx" ON public."MatchReport" ("matchId");

COMMIT;
