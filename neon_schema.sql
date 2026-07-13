--
-- PostgreSQL database dump
--

\restrict qxc2L5EcJ6A8Rwt5C0QwK2PU3adsBbtixmUwUmaJ11aI20mj7IZkPqH8FWsASv3

-- Dumped from database version 16.14 (3cbc516)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Match; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Match" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    map character varying NOT NULL,
    "team1Won" boolean NOT NULL,
    "team1Score" integer NOT NULL,
    "team2Score" integer NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    duration integer DEFAULT 0
);


--
-- Name: MatchPlayer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MatchPlayer" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "matchId" uuid NOT NULL,
    "playerId" uuid,
    "teamNumber" integer NOT NULL,
    striker character varying NOT NULL,
    rank integer,
    "wasGoalie" boolean NOT NULL,
    "statGoals" integer NOT NULL,
    "statAssists" integer NOT NULL,
    "statSaves" integer NOT NULL,
    "statKnockouts" integer NOT NULL,
    "statDamage" integer NOT NULL,
    "statShots" integer NOT NULL,
    "statRedirects" integer NOT NULL,
    "statOrbs" integer NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone
);


--
-- Name: Player; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Player" (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone
);


--
-- Name: MatchPlayer MatchPlayer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MatchPlayer"
    ADD CONSTRAINT "MatchPlayer_pkey" PRIMARY KEY (id);


--
-- Name: Match Match_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Match"
    ADD CONSTRAINT "Match_pkey" PRIMARY KEY (id);


--
-- Name: Player Player_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Player"
    ADD CONSTRAINT "Player_pkey" PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict qxc2L5EcJ6A8Rwt5C0QwK2PU3adsBbtixmUwUmaJ11aI20mj7IZkPqH8FWsASv3

