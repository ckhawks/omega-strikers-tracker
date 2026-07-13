--
-- Migration 002: per-user ingest tokens
--
-- Replaces the single shared INGEST_TOKEN with per-friend tokens that can be
-- generated/revoked from the admin page and attributed per report.
-- The env INGEST_TOKEN still works as a master/admin key.

BEGIN;

CREATE TABLE IF NOT EXISTS public."IngestToken" (
    id          uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    token       character varying NOT NULL,
    label       character varying NOT NULL,   -- friend name / device
    "playerId"  uuid,                          -- optional link to a Player
    active      boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "lastUsedAt" timestamp with time zone,
    CONSTRAINT "IngestToken_pkey" PRIMARY KEY (id),
    CONSTRAINT "IngestToken_token_key" UNIQUE (token)
);

-- record which token submitted each report (attribution)
ALTER TABLE public."MatchReport" ADD COLUMN IF NOT EXISTS "tokenLabel" character varying;

COMMIT;
