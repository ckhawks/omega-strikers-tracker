import styles from "../main.module.scss";
import Link from "next/link";
import NavigationBar from "@/components/NavigationBar";
import { db } from "@/util/db/db";
import { STRIKER_IMAGES } from "@/constants/strikers";
import { AVATAR_IMAGES } from "@/constants/avatars";

export const revalidate = 1;

const formatDuration = (seconds: number) => {
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  } else {
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else {
      return `${minutes}m ${remainingSeconds}s`;
    }
  }
};

export default async function PlayersList() {
  const players = await db(
    ` 
    WITH player_striker_count AS (
        SELECT 
            p."id",
            p."name",
            mp."striker",
            COUNT(mp."matchId") AS "matchCount",
            ROW_NUMBER() OVER (PARTITION BY p."id" ORDER BY COUNT(mp."matchId") DESC) AS rank
        FROM "Player" p
        LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
        WHERE p."deletedAt" IS NULL
        GROUP BY p."id", mp."striker"
    ),
    players_with_strikers AS (
        SELECT
            id,
            name,
            ARRAY_AGG("striker") FILTER (WHERE rank <= 3) AS "topStrikers" -- Collect top 3 strikers
        FROM player_striker_count
        GROUP BY id, name
    )
    SELECT 
        pws."id",
        pws."name",
        COUNT(mp."matchId") AS "matchCount",
        pws."topStrikers"
    FROM players_with_strikers pws
    LEFT JOIN "MatchPlayer" mp ON pws."id" = mp."playerId"
    GROUP BY pws.id, pws.name, pws."topStrikers"
    ORDER BY "matchCount" DESC;
    `,
    []
  );

  const combinedStats = await db(
    `
    WITH player_playtime AS (
      SELECT
          p."id",
          p."name",
          COALESCE(SUM(m."duration"), 0) AS "totalPlaytimeInSeconds",
          COALESCE(SUM(m."duration") / 60.0, 0) AS "totalPlaytimeInMinutes"
      FROM "Player" p
      LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
      LEFT JOIN "Match" m ON mp."matchId" = m."id"
      WHERE p."deletedAt" IS NULL
      GROUP BY p."id", p."name"
  ),
  combined_stats AS (
      SELECT
          p."id",
          p."name",
          playtime."totalPlaytimeInSeconds",
          playtime."totalPlaytimeInMinutes",
          COUNT(mp."matchId") AS "matchesPlayed",
          COALESCE(ROUND(AVG(mp."statGoals")::numeric, 2), 0) AS "avgGoalsPerMatch",
          COALESCE(SUM(mp."statGoals") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "goalsPerMinute",
          COALESCE(ROUND(AVG(mp."statAssists")::numeric, 2), 0) AS "avgAssistsPerMatch",
          COALESCE(SUM(mp."statAssists") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "assistsPerMinute",
          COALESCE(ROUND(AVG(mp."statSaves")::numeric, 2), 0) AS "avgSavesPerMatch",
          COALESCE(SUM(mp."statSaves") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "savesPerMinute",
          COALESCE(ROUND(AVG(mp."statKnockouts")::numeric, 2), 0) AS "avgKOsPerMatch",
          COALESCE(SUM(mp."statKnockouts") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "knockoutsPerMinute",
          COALESCE(ROUND(AVG(mp."statDamage")::numeric, 2), 0) AS "avgDamagePerMatch",
          COALESCE(SUM(mp."statDamage") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "damagePerMinute",
          COALESCE(ROUND(AVG(mp."statShots")::numeric, 2), 0) AS "avgShotsPerMatch",
          COALESCE(SUM(mp."statShots") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "shotsPerMinute",
          COALESCE(ROUND(AVG(mp."statRedirects")::numeric, 2), 0) AS "avgRedirectsPerMatch",
          COALESCE(SUM(mp."statRedirects") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "redirectsPerMinute",
          COALESCE(ROUND(AVG(mp."statOrbs")::numeric, 2), 0) AS "avgOrbsPerMatch",
          COALESCE(SUM(mp."statOrbs") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "orbsPerMinute"
      FROM "Player" p
      LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
      LEFT JOIN player_playtime playtime ON p."id" = playtime."id"
      WHERE p."deletedAt" IS NULL
      GROUP BY p."id", p."name", playtime."totalPlaytimeInSeconds", playtime."totalPlaytimeInMinutes"
  ),
  highlighted_combined_stats AS (
      SELECT 
          *,
          CASE WHEN "avgGoalsPerMatch" = MAX("avgGoalsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestGoalsPerMatch",
          CASE WHEN "goalsPerMinute" = MAX("goalsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestGoalsPerMinute",
          CASE WHEN "avgAssistsPerMatch" = MAX("avgAssistsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestAssistsPerMatch",
          CASE WHEN "assistsPerMinute" = MAX("assistsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestAssistsPerMinute",
          CASE WHEN "avgSavesPerMatch" = MAX("avgSavesPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestSavesPerMatch",
          CASE WHEN "savesPerMinute" = MAX("savesPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestSavesPerMinute",
          CASE WHEN "avgKOsPerMatch" = MAX("avgKOsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestKOsPerMatch",
          CASE WHEN "knockoutsPerMinute" = MAX("knockoutsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestKOsPerMinute",
          CASE WHEN "avgDamagePerMatch" = MAX("avgDamagePerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestDamagePerMatch",
          CASE WHEN "damagePerMinute" = MAX("damagePerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestDamagePerMinute",
          CASE WHEN "avgShotsPerMatch" = MAX("avgShotsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestShotsPerMatch",
          CASE WHEN "shotsPerMinute" = MAX("shotsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestShotsPerMinute",
          CASE WHEN "avgRedirectsPerMatch" = MAX("avgRedirectsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestRedirectsPerMatch",
          CASE WHEN "redirectsPerMinute" = MAX("redirectsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestRedirectsPerMinute",
          CASE WHEN "avgOrbsPerMatch" = MAX("avgOrbsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestOrbsPerMatch",
          CASE WHEN "orbsPerMinute" = MAX("orbsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestOrbsPerMinute"
      FROM combined_stats
  ),
top_strikers AS (
  SELECT 
    sub."id",
    ARRAY_AGG(sub."striker") AS "topStrikers"
  FROM (
    SELECT 
      p."id",
      mp."striker",
      COUNT(mp."matchId") AS "matchCount",
      ROW_NUMBER() OVER (PARTITION BY p."id" ORDER BY COUNT(mp."matchId") DESC) AS rank
    FROM "Player" p
    LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
    WHERE p."deletedAt" IS NULL
    GROUP BY p."id", mp."striker"
  ) AS sub
  WHERE sub.rank <= 3
  GROUP BY sub."id"
)
SELECT 
  hcs.*, 
  ts."topStrikers"
FROM highlighted_combined_stats hcs
LEFT JOIN top_strikers ts ON hcs."id" = ts."id"
ORDER BY "matchesPlayed" DESC;
  
  
    `,
    []
  );

  const forwardStats = await db(
    `
    WITH player_playtime AS (
    SELECT
        p."id",
        p."name",
        COALESCE(SUM(m."duration"), 0) AS "totalPlaytimeInSeconds",
        COALESCE(SUM(m."duration") / 60.0, 0) AS "totalPlaytimeInMinutes"
    FROM "Player" p
    LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
    LEFT JOIN "Match" m ON mp."matchId" = m."id"
    WHERE p."deletedAt" IS NULL AND mp."wasGoalie" = false
    GROUP BY p."id", p."name"
),
forward_stats AS (
    SELECT
        p."id",
        p."name",
        playtime."totalPlaytimeInSeconds",
        playtime."totalPlaytimeInMinutes",
        COUNT(mp."matchId") AS "matchesPlayed",
        COALESCE(ROUND(AVG(mp."statGoals")::numeric, 2), 0) AS "avgGoalsPerMatch",
        COALESCE(SUM(mp."statGoals") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "goalsPerMinute",
        COALESCE(ROUND(AVG(mp."statAssists")::numeric, 2), 0) AS "avgAssistsPerMatch",
        COALESCE(SUM(mp."statAssists") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "assistsPerMinute",
        COALESCE(ROUND(AVG(mp."statSaves")::numeric, 2), 0) AS "avgSavesPerMatch",
        COALESCE(SUM(mp."statSaves") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "savesPerMinute",
        COALESCE(ROUND(AVG(mp."statKnockouts")::numeric, 2), 0) AS "avgKOsPerMatch",
        COALESCE(SUM(mp."statKnockouts") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "knockoutsPerMinute",
        COALESCE(ROUND(AVG(mp."statDamage")::numeric, 2), 0) AS "avgDamagePerMatch",
        COALESCE(SUM(mp."statDamage") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "damagePerMinute",
        COALESCE(ROUND(AVG(mp."statShots")::numeric, 2), 0) AS "avgShotsPerMatch",
        COALESCE(SUM(mp."statShots") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "shotsPerMinute",
        COALESCE(ROUND(AVG(mp."statRedirects")::numeric, 2), 0) AS "avgRedirectsPerMatch",
        COALESCE(SUM(mp."statRedirects") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "redirectsPerMinute",
        COALESCE(ROUND(AVG(mp."statOrbs")::numeric, 2), 0) AS "avgOrbsPerMatch",
        COALESCE(SUM(mp."statOrbs") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "orbsPerMinute"
    FROM "Player" p
    LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
    LEFT JOIN player_playtime playtime ON p."id" = playtime."id"
    WHERE p."deletedAt" IS NULL AND mp."wasGoalie" = false
    GROUP BY p."id", p."name", playtime."totalPlaytimeInSeconds", playtime."totalPlaytimeInMinutes"
),
player_top_strikers AS (
    SELECT
        mp."playerId" AS "id",
        mp."striker",
        COUNT(mp."matchId") AS "matchCount",
        ROW_NUMBER() OVER (PARTITION BY mp."playerId" ORDER BY COUNT(mp."matchId") DESC) AS rank
    FROM "MatchPlayer" mp
    WHERE mp."wasGoalie" = false
    GROUP BY mp."playerId", mp."striker"
),
aggregated_top_strikers AS (
    SELECT
        "id",
        ARRAY_AGG("striker") FILTER (WHERE rank <= 3) AS "topStrikers"
    FROM player_top_strikers
    GROUP BY "id"
),
highlighted_forward_stats AS (
    SELECT 
        fs.*,
        ats."topStrikers",
        CASE WHEN "avgGoalsPerMatch" = MAX("avgGoalsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestGoalsPerMatch",
        CASE WHEN "goalsPerMinute" = MAX("goalsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestGoalsPerMinute",
        CASE WHEN "avgAssistsPerMatch" = MAX("avgAssistsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestAssistsPerMatch",
        CASE WHEN "assistsPerMinute" = MAX("assistsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestAssistsPerMinute",
        CASE WHEN "avgSavesPerMatch" = MAX("avgSavesPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestSavesPerMatch",
        CASE WHEN "savesPerMinute" = MAX("savesPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestSavesPerMinute",
        CASE WHEN "avgKOsPerMatch" = MAX("avgKOsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestKOsPerMatch",
        CASE WHEN "knockoutsPerMinute" = MAX("knockoutsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestKOsPerMinute",
        CASE WHEN "avgDamagePerMatch" = MAX("avgDamagePerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestDamagePerMatch",
        CASE WHEN "damagePerMinute" = MAX("damagePerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestDamagePerMinute",
        CASE WHEN "avgShotsPerMatch" = MAX("avgShotsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestShotsPerMatch",
        CASE WHEN "shotsPerMinute" = MAX("shotsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestShotsPerMinute",
        CASE WHEN "avgRedirectsPerMatch" = MAX("avgRedirectsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestRedirectsPerMatch",
        CASE WHEN "redirectsPerMinute" = MAX("redirectsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestRedirectsPerMinute",
        CASE WHEN "avgOrbsPerMatch" = MAX("avgOrbsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestOrbsPerMatch",
        CASE WHEN "orbsPerMinute" = MAX("orbsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestOrbsPerMinute"
    FROM forward_stats fs
    LEFT JOIN aggregated_top_strikers ats ON fs."id" = ats."id"
)
SELECT * FROM highlighted_forward_stats
ORDER BY "matchesPlayed" DESC;

  `,
    []
  );

  const anonymousCombinedStatsResult = await db(
    `
    WITH anonymous_top_strikers AS (
    SELECT 
        mp."striker",
        COUNT(mp."matchId") AS "matchCount",
        ROW_NUMBER() OVER (ORDER BY COUNT(mp."matchId") DESC) AS rank
    FROM "MatchPlayer" mp
    WHERE mp."playerId" IS NULL
    GROUP BY mp."striker"
),
aggregated_top_strikers AS (
    SELECT ARRAY_AGG("striker") AS "topStrikers"
    FROM anonymous_top_strikers
    WHERE rank <= 3
)
SELECT
    NULL AS "id",
    'Anonymous' AS "name",
    COALESCE(SUM(m."duration"), 0) AS "totalPlaytimeInSeconds",
    COALESCE(SUM(m."duration") / 60.0, 0) AS "totalPlaytimeInMinutes",
    COUNT(mp."matchId") AS "matchesPlayed",
    COALESCE(ROUND(AVG(mp."statGoals")::numeric, 2), 0) AS "avgGoalsPerMatch",
    COALESCE(SUM(mp."statGoals") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "goalsPerMinute",
    COALESCE(ROUND(AVG(mp."statAssists")::numeric, 2), 0) AS "avgAssistsPerMatch",
    COALESCE(SUM(mp."statAssists") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "assistsPerMinute",
    COALESCE(ROUND(AVG(mp."statSaves")::numeric, 2), 0) AS "avgSavesPerMatch",
    COALESCE(SUM(mp."statSaves") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "savesPerMinute",
    COALESCE(ROUND(AVG(mp."statKnockouts")::numeric, 2), 0) AS "avgKOsPerMatch",
    COALESCE(SUM(mp."statKnockouts") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "knockoutsPerMinute",
    COALESCE(ROUND(AVG(mp."statDamage")::numeric, 2), 0) AS "avgDamagePerMatch",
    COALESCE(SUM(mp."statDamage") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "damagePerMinute",
    COALESCE(ROUND(AVG(mp."statShots")::numeric, 2), 0) AS "avgShotsPerMatch",
    COALESCE(SUM(mp."statShots") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "shotsPerMinute",
    COALESCE(ROUND(AVG(mp."statRedirects")::numeric, 2), 0) AS "avgRedirectsPerMatch",
    COALESCE(SUM(mp."statRedirects") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "redirectsPerMinute",
    COALESCE(ROUND(AVG(mp."statOrbs")::numeric, 2), 0) AS "avgOrbsPerMatch",
    COALESCE(SUM(mp."statOrbs") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "orbsPerMinute",
    (SELECT "topStrikers" FROM aggregated_top_strikers) AS "topStrikers"
FROM "MatchPlayer" mp
LEFT JOIN "Match" m ON mp."matchId" = m."id"
WHERE mp."playerId" IS NULL;
    `,
    []
  );

  const anonymousCombinedStats = anonymousCombinedStatsResult[0];

  const anonymousForwardStatsResult = await db(
    `
    SELECT
    NULL AS "id",
    'Anonymous' AS "name",
    COALESCE(SUM(m."duration"), 0) AS "totalPlaytimeInSeconds",
    COALESCE(SUM(m."duration") / 60.0, 0) AS "totalPlaytimeInMinutes",
    COUNT(mp."matchId") AS "matchesPlayed",
    COALESCE(ROUND(AVG(mp."statGoals")::numeric, 2), 0) AS "avgGoalsPerMatch",
    COALESCE(SUM(mp."statGoals") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "goalsPerMinute",
    COALESCE(ROUND(AVG(mp."statAssists")::numeric, 2), 0) AS "avgAssistsPerMatch",
    COALESCE(SUM(mp."statAssists") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "assistsPerMinute",
    COALESCE(ROUND(AVG(mp."statSaves")::numeric, 2), 0) AS "avgSavesPerMatch",
    COALESCE(SUM(mp."statSaves") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "savesPerMinute",
    COALESCE(ROUND(AVG(mp."statKnockouts")::numeric, 2), 0) AS "avgKOsPerMatch",
    COALESCE(SUM(mp."statKnockouts") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "knockoutsPerMinute",
    COALESCE(ROUND(AVG(mp."statDamage")::numeric, 2), 0) AS "avgDamagePerMatch",
    COALESCE(SUM(mp."statDamage") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "damagePerMinute",
    COALESCE(ROUND(AVG(mp."statShots")::numeric, 2), 0) AS "avgShotsPerMatch",
    COALESCE(SUM(mp."statShots") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "shotsPerMinute",
    COALESCE(ROUND(AVG(mp."statRedirects")::numeric, 2), 0) AS "avgRedirectsPerMatch",
    COALESCE(SUM(mp."statRedirects") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "redirectsPerMinute",
    COALESCE(ROUND(AVG(mp."statOrbs")::numeric, 2), 0) AS "avgOrbsPerMatch",
    COALESCE(SUM(mp."statOrbs") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "orbsPerMinute",
    -- Top strikers for anonymous forwards
    (
        SELECT ARRAY_AGG(sub."striker") 
        FROM (
            SELECT mp."striker", COUNT(mp."matchId") AS "matchCount"
            FROM "MatchPlayer" mp
            WHERE mp."wasGoalie" = false AND mp."playerId" IS NULL
            GROUP BY mp."striker"
            ORDER BY "matchCount" DESC
            LIMIT 3
        ) AS sub
    ) AS "topStrikers"
FROM "MatchPlayer" mp
LEFT JOIN "Match" m ON mp."matchId" = m."id"
WHERE mp."wasGoalie" = false AND mp."playerId" IS NULL;


    `,
    []
  );

  const anonymousForwardStats = anonymousForwardStatsResult[0];
  const anonymousGoalieStatsResult = await db(
    `
    SELECT
    NULL AS "id",
    'Anonymous' AS "name",
    COALESCE(SUM(m."duration"), 0) AS "totalPlaytimeInSeconds",
    COALESCE(SUM(m."duration") / 60.0, 0) AS "totalPlaytimeInMinutes",
    COUNT(mp."matchId") AS "matchesPlayed",
    COALESCE(ROUND(AVG(mp."statGoals")::numeric, 2), 0) AS "avgGoalsPerMatch",
    COALESCE(SUM(mp."statGoals") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "goalsPerMinute",
    COALESCE(ROUND(AVG(mp."statAssists")::numeric, 2), 0) AS "avgAssistsPerMatch",
    COALESCE(SUM(mp."statAssists") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "assistsPerMinute",
    COALESCE(ROUND(AVG(mp."statSaves")::numeric, 2), 0) AS "avgSavesPerMatch",
    COALESCE(SUM(mp."statSaves") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "savesPerMinute",
    COALESCE(ROUND(AVG(mp."statKnockouts")::numeric, 2), 0) AS "avgKOsPerMatch",
    COALESCE(SUM(mp."statKnockouts") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "knockoutsPerMinute",
    COALESCE(ROUND(AVG(mp."statDamage")::numeric, 2), 0) AS "avgDamagePerMatch",
    COALESCE(SUM(mp."statDamage") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "damagePerMinute",
    COALESCE(ROUND(AVG(mp."statShots")::numeric, 2), 0) AS "avgShotsPerMatch",
    COALESCE(SUM(mp."statShots") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "shotsPerMinute",
    COALESCE(ROUND(AVG(mp."statRedirects")::numeric, 2), 0) AS "avgRedirectsPerMatch",
    COALESCE(SUM(mp."statRedirects") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "redirectsPerMinute",
    COALESCE(ROUND(AVG(mp."statOrbs")::numeric, 2), 0) AS "avgOrbsPerMatch",
    COALESCE(SUM(mp."statOrbs") / NULLIF(SUM(m."duration") / 60.0, 0), 0) AS "orbsPerMinute",
    -- Top strikers for anonymous forwards
    (
        SELECT ARRAY_AGG(sub."striker") 
        FROM (
            SELECT mp."striker", COUNT(mp."matchId") AS "matchCount"
            FROM "MatchPlayer" mp
            WHERE mp."wasGoalie" = true AND mp."playerId" IS NULL
            GROUP BY mp."striker"
            ORDER BY "matchCount" DESC
            LIMIT 3
        ) AS sub
    ) AS "topStrikers"
FROM "MatchPlayer" mp
LEFT JOIN "Match" m ON mp."matchId" = m."id"
WHERE mp."wasGoalie" = true AND mp."playerId" IS NULL;

    `,
    []
  );

  const anonymousGoalieStats = anonymousGoalieStatsResult[0];

  const goalieStats = await db(
    `
    WITH player_playtime AS (
    SELECT
        p."id",
        p."name",
        COALESCE(SUM(m."duration"), 0) AS "totalPlaytimeInSeconds",
        COALESCE(SUM(m."duration") / 60.0, 0) AS "totalPlaytimeInMinutes"
    FROM "Player" p
    LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
    LEFT JOIN "Match" m ON mp."matchId" = m."id"
    WHERE p."deletedAt" IS NULL AND mp."wasGoalie" = true
    GROUP BY p."id", p."name"
),
goalie_stats AS (
    SELECT
        p."id",
        p."name",
        playtime."totalPlaytimeInSeconds",
        playtime."totalPlaytimeInMinutes",
        COUNT(mp."matchId") AS "matchesPlayed",
        COALESCE(ROUND(AVG(mp."statGoals")::numeric, 2), 0) AS "avgGoalsPerMatch",
        COALESCE(SUM(mp."statGoals") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "goalsPerMinute",
        COALESCE(ROUND(AVG(mp."statAssists")::numeric, 2), 0) AS "avgAssistsPerMatch",
        COALESCE(SUM(mp."statAssists") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "assistsPerMinute",
        COALESCE(ROUND(AVG(mp."statSaves")::numeric, 2), 0) AS "avgSavesPerMatch",
        COALESCE(SUM(mp."statSaves") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "savesPerMinute",
        COALESCE(ROUND(AVG(mp."statKnockouts")::numeric, 2), 0) AS "avgKOsPerMatch",
        COALESCE(SUM(mp."statKnockouts") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "knockoutsPerMinute",
        COALESCE(ROUND(AVG(mp."statDamage")::numeric, 2), 0) AS "avgDamagePerMatch",
        COALESCE(SUM(mp."statDamage") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "damagePerMinute",
        COALESCE(ROUND(AVG(mp."statShots")::numeric, 2), 0) AS "avgShotsPerMatch",
        COALESCE(SUM(mp."statShots") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "shotsPerMinute",
        COALESCE(ROUND(AVG(mp."statRedirects")::numeric, 2), 0) AS "avgRedirectsPerMatch",
        COALESCE(SUM(mp."statRedirects") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "redirectsPerMinute",
        COALESCE(ROUND(AVG(mp."statOrbs")::numeric, 2), 0) AS "avgOrbsPerMatch",
        COALESCE(SUM(mp."statOrbs") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "orbsPerMinute",
        (
            SELECT ARRAY_AGG(sub."striker")
            FROM (
                SELECT mp."striker", COUNT(mp."matchId") AS "matchCount"
                FROM "MatchPlayer" mp
                WHERE mp."wasGoalie" = true AND mp."playerId" = p."id"
                GROUP BY mp."striker"
                ORDER BY "matchCount" DESC
                LIMIT 3
            ) AS sub
        ) AS "topStrikers"
    FROM "Player" p
    LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
    LEFT JOIN player_playtime playtime ON p."id" = playtime."id"
    WHERE p."deletedAt" IS NULL AND mp."wasGoalie" = true
    GROUP BY p."id", p."name", playtime."totalPlaytimeInSeconds", playtime."totalPlaytimeInMinutes"
),
highlighted_goalie_stats AS (
    SELECT 
        *,
        CASE WHEN "avgGoalsPerMatch" = MAX("avgGoalsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestGoalsPerMatch",
        CASE WHEN "goalsPerMinute" = MAX("goalsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestGoalsPerMinute",
        CASE WHEN "avgAssistsPerMatch" = MAX("avgAssistsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestAssistsPerMatch",
        CASE WHEN "assistsPerMinute" = MAX("assistsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestAssistsPerMinute",
        CASE WHEN "avgSavesPerMatch" = MAX("avgSavesPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestSavesPerMatch",
        CASE WHEN "savesPerMinute" = MAX("savesPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestSavesPerMinute",
        CASE WHEN "avgKOsPerMatch" = MAX("avgKOsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestKOsPerMatch",
        CASE WHEN "knockoutsPerMinute" = MAX("knockoutsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestKOsPerMinute",
        CASE WHEN "avgDamagePerMatch" = MAX("avgDamagePerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestDamagePerMatch",
        CASE WHEN "damagePerMinute" = MAX("damagePerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestDamagePerMinute",
        CASE WHEN "avgShotsPerMatch" = MAX("avgShotsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestShotsPerMatch",
        CASE WHEN "shotsPerMinute" = MAX("shotsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestShotsPerMinute",
        CASE WHEN "avgRedirectsPerMatch" = MAX("avgRedirectsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestRedirectsPerMatch",
        CASE WHEN "redirectsPerMinute" = MAX("redirectsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestRedirectsPerMinute",
        CASE WHEN "avgOrbsPerMatch" = MAX("avgOrbsPerMatch") OVER () THEN TRUE ELSE FALSE END AS "isHighestOrbsPerMatch",
        CASE WHEN "orbsPerMinute" = MAX("orbsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestOrbsPerMinute"
    FROM goalie_stats
)
SELECT * FROM highlighted_goalie_stats
ORDER BY "matchesPlayed" DESC;

  
    `
  );

  const allTimeStats = await db(
    `
      SELECT
        p."id",
        p."name",
        COUNT(mp."matchId") AS "totalMatches",
        COALESCE(SUM(mp."statGoals"), 0) AS "totalGoals",
        COALESCE(SUM(mp."statAssists"), 0) AS "totalAssists",
        COALESCE(SUM(mp."statSaves"), 0) AS "totalSaves",
        COALESCE(SUM(mp."statKnockouts"), 0) AS "totalKnockouts",
        COALESCE(SUM(mp."statDamage"), 0) AS "totalDamage",
        COALESCE(SUM(mp."statShots"), 0) AS "totalShots",
        COALESCE(SUM(mp."statRedirects"), 0) AS "totalRedirects",
        COALESCE(SUM(mp."statOrbs"), 0) AS "totalOrbs",
        -- Wins, Losses, and Win Rate
        SUM(CASE WHEN m."team1Won" = TRUE AND mp."teamNumber" = 1 THEN 1
                 WHEN m."team1Won" = FALSE AND mp."teamNumber" = 2 THEN 1
                 ELSE 0 END) AS "totalWins",
        SUM(CASE WHEN m."team1Won" = TRUE AND mp."teamNumber" = 2 THEN 1
                 WHEN m."team1Won" = FALSE AND mp."teamNumber" = 1 THEN 1
                 ELSE 0 END) AS "totalLosses",
        ROUND(
          (SUM(CASE WHEN m."team1Won" = TRUE AND mp."teamNumber" = 1 THEN 1
                    WHEN m."team1Won" = FALSE AND mp."teamNumber" = 2 THEN 1
                    ELSE 0 END)::numeric
          / NULLIF(COUNT(mp."matchId"), 0)) * 100, 2
        ) AS "winRate",
        COALESCE(SUM(m."duration"), 0) AS "totalPlaytime", -- Total playtime in seconds
        -- Highlight highest values
        CASE WHEN SUM(m."duration") = MAX(SUM(m."duration")) OVER () THEN TRUE ELSE FALSE END AS "isHighestPlaytime",
        CASE WHEN COUNT(mp."matchId") = MAX(COUNT(mp."matchId")) OVER () THEN TRUE ELSE FALSE END AS "isHighestMatches",
        CASE WHEN SUM(mp."statGoals") = MAX(SUM(mp."statGoals")) OVER () THEN TRUE ELSE FALSE END AS "isHighestGoals",
        CASE WHEN SUM(mp."statAssists") = MAX(SUM(mp."statAssists")) OVER () THEN TRUE ELSE FALSE END AS "isHighestAssists",
        CASE WHEN SUM(mp."statSaves") = MAX(SUM(mp."statSaves")) OVER () THEN TRUE ELSE FALSE END AS "isHighestSaves",
        CASE WHEN SUM(mp."statKnockouts") = MAX(SUM(mp."statKnockouts")) OVER () THEN TRUE ELSE FALSE END AS "isHighestKnockouts",
        CASE WHEN SUM(mp."statDamage") = MAX(SUM(mp."statDamage")) OVER () THEN TRUE ELSE FALSE END AS "isHighestDamage",
        CASE WHEN SUM(mp."statShots") = MAX(SUM(mp."statShots")) OVER () THEN TRUE ELSE FALSE END AS "isHighestShots",
        CASE WHEN SUM(mp."statRedirects") = MAX(SUM(mp."statRedirects")) OVER () THEN TRUE ELSE FALSE END AS "isHighestRedirects",
        CASE WHEN SUM(mp."statOrbs") = MAX(SUM(mp."statOrbs")) OVER () THEN TRUE ELSE FALSE END AS "isHighestOrbs",
        CASE WHEN SUM(CASE WHEN m."team1Won" = TRUE AND mp."teamNumber" = 1 THEN 1
                           WHEN m."team1Won" = FALSE AND mp."teamNumber" = 2 THEN 1
                           ELSE 0 END) = MAX(SUM(CASE WHEN m."team1Won" = TRUE AND mp."teamNumber" = 1 THEN 1
                                                     WHEN m."team1Won" = FALSE AND mp."teamNumber" = 2 THEN 1
                                                     ELSE 0 END)) OVER () THEN TRUE ELSE FALSE END AS "isHighestWins",
        CASE WHEN SUM(CASE WHEN m."team1Won" = TRUE AND mp."teamNumber" = 2 THEN 1
                           WHEN m."team1Won" = FALSE AND mp."teamNumber" = 1 THEN 1
                           ELSE 0 END) = MAX(SUM(CASE WHEN m."team1Won" = TRUE AND mp."teamNumber" = 2 THEN 1
                                                     WHEN m."team1Won" = FALSE AND mp."teamNumber" = 1 THEN 1
                                                     ELSE 0 END)) OVER () THEN TRUE ELSE FALSE END AS "isHighestLosses",
        CASE WHEN ROUND(
          (SUM(CASE WHEN m."team1Won" = TRUE AND mp."teamNumber" = 1 THEN 1
                    WHEN m."team1Won" = FALSE AND mp."teamNumber" = 2 THEN 1
                    ELSE 0 END)::numeric
          / NULLIF(COUNT(mp."matchId"), 0)) * 100, 2
        ) = MAX(ROUND(
          (SUM(CASE WHEN m."team1Won" = TRUE AND mp."teamNumber" = 1 THEN 1
                    WHEN m."team1Won" = FALSE AND mp."teamNumber" = 2 THEN 1
                    ELSE 0 END)::numeric
          / NULLIF(COUNT(mp."matchId"), 0)) * 100, 2)) OVER () THEN TRUE ELSE FALSE END AS "isHighestWinRate"
      FROM "Player" p
      LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
      LEFT JOIN "Match" m ON mp."matchId" = m."id"
      WHERE p."deletedAt" IS NULL
      GROUP BY p."id", p."name"
      ORDER BY "totalMatches" DESC;
    `,
    []
  );

  return (
    <div className={styles.main}>
      <NavigationBar />
      <h1>Players</h1>
      <div className={styles["player-list"]}>
        {players &&
          players.map((player, index) => {
            return (
              <Link
                key={player.id}
                className={`${styles.card} ${styles["player-row"]}`}
                href={"/player/" + player.id}
              >
                <div className={styles["player-row-section"]}>
                  <img
                    width={32}
                    src={
                      "/avatars/" +
                      // @ts-ignore
                      AVATAR_IMAGES[player.name]
                    }
                    style={{
                      borderRadius: "100%",
                    }}
                  />
                  <h5 style={{ marginBottom: "0" }}>{player.name}</h5>
                </div>
                <div className={styles["player-row-section"]}>
                  <span>{player.matchCount} matches</span>
                  <div className={styles["player-row-strikers"]}>
                    {/* <Link href={"/player/" + player.id}>View</Link> */}
                    {player.topStrikers &&
                      player.topStrikers.map((striker: any) => {
                        if (striker != null) {
                          return (
                            <img
                              key={striker}
                              width={32}
                              src={
                                "/strikers/" +
                                // @ts-ignore
                                STRIKER_IMAGES[striker]
                              }
                              style={{ borderRadius: "8px" }}
                            />
                          );
                        }
                      })}
                  </div>
                </div>
              </Link>
            );
          })}
      </div>
      <div>
        <h3>Forward & Goalie</h3>
        <div>Includes average per match and average per minute</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Strikers</th>
            <th>Playtime</th>
            <th>Matches</th>
            <th>Length</th>
            <th colSpan={2}>
              <center>Goals</center>
            </th>
            <th colSpan={2}>
              <center>Assists</center>
            </th>
            <th colSpan={2}>
              <center>Saves</center>
            </th>
            <th colSpan={2}>
              <center>KOs</center>
            </th>
            <th colSpan={2}>
              <center>Damage</center>
            </th>
            <th colSpan={2}>
              <center>Shots</center>
            </th>
            <th colSpan={2}>
              <center>Redirects</center>
            </th>
            <th colSpan={2}>
              <center>Orbs</center>
            </th>
          </tr>
          <tr>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
          </tr>
        </thead>
        <tbody>
          {combinedStats.map((player, index) => (
            <tr key={index}>
              <td>{player.name}</td>
              <td>
                <div style={{ display: "flex", gap: "4px" }}>
                  {player.topStrikers?.map((striker: any, i: number) => (
                    <img
                      key={i}
                      // @ts-ignore
                      src={`/strikers/${STRIKER_IMAGES[striker]}`} // Adjust path as needed
                      alt={striker}
                      width={24}
                      style={{ borderRadius: "4px" }}
                    />
                  ))}
                </div>
              </td>
              <td>{formatDuration(player.totalPlaytimeInSeconds)}</td>
              <td>{player.matchesPlayed}</td>
              <td>
                {formatDuration(
                  Number(
                    (
                      player.totalPlaytimeInSeconds / player.matchesPlayed
                    ).toFixed(0)
                  )
                )}
              </td>
              <td
                className={
                  player.isHighestGoalsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgGoalsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestGoalsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.goalsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestAssistsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgAssistsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestAssistsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.assistsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestSavesPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgSavesPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestSavesPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.savesPerMinute).toFixed(2)}
              </td>
              <td
                className={player.isHighestKOsPerMatch ? styles.highlight : ""}
              >
                {Number(player.avgKOsPerMatch).toFixed(2)}
              </td>
              <td
                className={player.isHighestKOsPerMinute ? styles.highlight : ""}
              >
                {Number(player.knockoutsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestDamagePerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgDamagePerMatch).toFixed(0)}
              </td>
              <td
                className={
                  player.isHighestDamagePerMinute ? styles.highlight : ""
                }
              >
                {Number(player.damagePerMinute).toFixed(0)}
              </td>
              <td
                className={
                  player.isHighestShotsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgShotsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestShotsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.shotsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestRedirectsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgRedirectsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestRedirectsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.redirectsPerMinute).toFixed(2)}
              </td>
              <td
                className={player.isHighestOrbsPerMatch ? styles.highlight : ""}
              >
                {Number(player.avgOrbsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestOrbsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.orbsPerMinute).toFixed(2)}
              </td>
            </tr>
          ))}
          {anonymousCombinedStats && (
            <tr>
              <td>{anonymousCombinedStats.name}</td>
              <td>
                <div style={{ display: "flex", gap: "4px" }}>
                  {anonymousCombinedStats.topStrikers?.map(
                    (striker: any, i: number) => (
                      <img
                        key={i}
                        // @ts-ignore
                        src={`/strikers/${STRIKER_IMAGES[striker]}`} // Adjust path as needed
                        alt={striker}
                        width={24}
                        style={{ borderRadius: "4px" }}
                      />
                    )
                  )}
                </div>
              </td>
              <td>
                {formatDuration(anonymousCombinedStats.totalPlaytimeInSeconds)}
              </td>
              <td>{anonymousCombinedStats.matchesPlayed}</td>
              <td>
                {formatDuration(
                  Number(
                    (
                      anonymousCombinedStats.totalPlaytimeInSeconds /
                      anonymousCombinedStats.matchesPlayed
                    ).toFixed(0)
                  )
                )}
              </td>
              <td>
                {Number(anonymousCombinedStats.avgGoalsPerMatch).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.goalsPerMinute).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.avgAssistsPerMatch).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.assistsPerMinute).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.avgSavesPerMatch).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.savesPerMinute).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.avgKOsPerMatch).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.knockoutsPerMinute).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.avgDamagePerMatch).toFixed(0)}
              </td>
              <td>
                {Number(anonymousCombinedStats.damagePerMinute).toFixed(0)}
              </td>
              <td>
                {Number(anonymousCombinedStats.avgShotsPerMatch).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.shotsPerMinute).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.avgRedirectsPerMatch).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.redirectsPerMinute).toFixed(2)}
              </td>
              <td>
                {Number(anonymousCombinedStats.avgOrbsPerMatch).toFixed(2)}
              </td>
              <td>{Number(anonymousCombinedStats.orbsPerMinute).toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        Forward
        <img src="/icons/skip-forward.svg" width={28} />
      </h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Strikers</th>
            <th>Playtime</th>
            <th>Matches</th>
            <th>Length</th>
            <th colSpan={2}>
              <center>Goals</center>
            </th>
            <th colSpan={2}>
              <center>Assists</center>
            </th>
            <th colSpan={2}>
              <center>Saves</center>
            </th>
            <th colSpan={2}>
              <center>KOs</center>
            </th>
            <th colSpan={2}>
              <center>Damage</center>
            </th>
            <th colSpan={2}>
              <center>Shots</center>
            </th>
            <th colSpan={2}>
              <center>Redirects</center>
            </th>
            <th colSpan={2}>
              <center>Orbs</center>
            </th>
          </tr>
          <tr>
            <th colSpan={5}></th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
          </tr>
        </thead>
        <tbody>
          {forwardStats.map((player, index) => (
            <tr key={index}>
              <td>{player.name}</td>
              <td>
                <div style={{ display: "flex", gap: "4px" }}>
                  {player.topStrikers?.map((striker: any, i: number) => (
                    <img
                      key={i}
                      // @ts-ignore
                      src={`/strikers/${STRIKER_IMAGES[striker]}`} // Adjust path as needed
                      alt={striker}
                      width={24}
                      style={{ borderRadius: "4px" }}
                    />
                  ))}
                </div>
              </td>
              <td>{formatDuration(player.totalPlaytimeInSeconds)}</td>
              <td>{player.matchesPlayed}</td>
              <td>
                {formatDuration(
                  Number(
                    (
                      player.totalPlaytimeInSeconds / player.matchesPlayed
                    ).toFixed(0)
                  )
                )}
              </td>
              <td
                className={
                  player.isHighestGoalsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgGoalsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestGoalsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.goalsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestAssistsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgAssistsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestAssistsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.assistsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestSavesPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgSavesPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestSavesPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.savesPerMinute).toFixed(2)}
              </td>
              <td
                className={player.isHighestKOsPerMatch ? styles.highlight : ""}
              >
                {Number(player.avgKOsPerMatch).toFixed(2)}
              </td>
              <td
                className={player.isHighestKOsPerMinute ? styles.highlight : ""}
              >
                {Number(player.knockoutsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestDamagePerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgDamagePerMatch).toFixed(0)}
              </td>
              <td
                className={
                  player.isHighestDamagePerMinute ? styles.highlight : ""
                }
              >
                {Number(player.damagePerMinute).toFixed(0)}
              </td>
              <td
                className={
                  player.isHighestShotsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgShotsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestShotsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.shotsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestRedirectsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgRedirectsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestRedirectsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.redirectsPerMinute).toFixed(2)}
              </td>
              <td
                className={player.isHighestOrbsPerMatch ? styles.highlight : ""}
              >
                {Number(player.avgOrbsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestOrbsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.orbsPerMinute).toFixed(2)}
              </td>
            </tr>
          ))}
          {anonymousForwardStats && (
            <tr>
              <td>{anonymousForwardStats.name}</td>
              <td>
                <div style={{ display: "flex", gap: "4px" }}>
                  {anonymousForwardStats.topStrikers?.map(
                    (striker: any, i: number) => (
                      <img
                        key={i}
                        // @ts-ignore
                        src={`/strikers/${STRIKER_IMAGES[striker]}`} // Adjust path as needed
                        alt={striker}
                        width={24}
                        style={{ borderRadius: "4px" }}
                      />
                    )
                  )}
                </div>
              </td>
              <td>
                {formatDuration(anonymousForwardStats.totalPlaytimeInSeconds)}
              </td>
              <td>{anonymousForwardStats.matchesPlayed}</td>
              <td>
                {formatDuration(
                  Number(
                    (
                      anonymousForwardStats.totalPlaytimeInSeconds /
                      anonymousForwardStats.matchesPlayed
                    ).toFixed(0)
                  )
                )}
              </td>
              <td>
                {Number(anonymousForwardStats.avgGoalsPerMatch).toFixed(2)}
              </td>
              <td>{Number(anonymousForwardStats.goalsPerMinute).toFixed(2)}</td>
              <td>
                {Number(anonymousForwardStats.avgAssistsPerMatch).toFixed(2)}
              </td>
              <td>
                {Number(anonymousForwardStats.assistsPerMinute).toFixed(2)}
              </td>
              <td>
                {Number(anonymousForwardStats.avgSavesPerMatch).toFixed(2)}
              </td>
              <td>{Number(anonymousForwardStats.savesPerMinute).toFixed(2)}</td>
              <td>{Number(anonymousForwardStats.avgKOsPerMatch).toFixed(2)}</td>
              <td>
                {Number(anonymousForwardStats.knockoutsPerMinute).toFixed(2)}
              </td>
              <td>
                {Number(anonymousForwardStats.avgDamagePerMatch).toFixed(0)}
              </td>
              <td>
                {Number(anonymousForwardStats.damagePerMinute).toFixed(0)}
              </td>
              <td>
                {Number(anonymousForwardStats.avgShotsPerMatch).toFixed(2)}
              </td>
              <td>{Number(anonymousForwardStats.shotsPerMinute).toFixed(2)}</td>
              <td>
                {Number(anonymousForwardStats.avgRedirectsPerMatch).toFixed(2)}
              </td>
              <td>
                {Number(anonymousForwardStats.redirectsPerMinute).toFixed(2)}
              </td>
              <td>
                {Number(anonymousForwardStats.avgOrbsPerMatch).toFixed(2)}
              </td>
              <td>{Number(anonymousForwardStats.orbsPerMinute).toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        Goalie
        <img src="/icons/shield.svg" width={28} />
      </h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Strikers</th>
            <th>Playtime</th>
            <th>Matches</th>
            <th>Length</th>
            <th colSpan={2}>
              <center>Goals</center>
            </th>
            <th colSpan={2}>
              <center>Assists</center>
            </th>
            <th colSpan={2}>
              <center>Saves</center>
            </th>
            <th colSpan={2}>
              <center>KOs</center>
            </th>
            <th colSpan={2}>
              <center>Damage</center>
            </th>
            <th colSpan={2}>
              <center>Shots</center>
            </th>
            <th colSpan={2}>
              <center>Redirects</center>
            </th>
            <th colSpan={2}>
              <center>Orbs</center>
            </th>
          </tr>
          <tr>
            <th colSpan={5}></th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
            <th>Avg</th>
            <th>pM</th>
          </tr>
        </thead>
        <tbody>
          {goalieStats.map((player, index) => (
            <tr key={index}>
              <td>{player.name}</td>
              <td>
                <div style={{ display: "flex", gap: "4px" }}>
                  {player.topStrikers?.map((striker: any, i: number) => (
                    <img
                      key={i}
                      // @ts-ignore
                      src={`/strikers/${STRIKER_IMAGES[striker]}`} // Adjust path as needed
                      alt={striker}
                      width={24}
                      style={{ borderRadius: "4px" }}
                    />
                  ))}
                </div>
              </td>
              <td>{formatDuration(player.totalPlaytimeInSeconds)}</td>
              <td>{player.matchesPlayed}</td>
              <td>
                {formatDuration(
                  Number(
                    (
                      player.totalPlaytimeInSeconds / player.matchesPlayed
                    ).toFixed(0)
                  )
                )}
              </td>
              <td
                className={
                  player.isHighestGoalsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgGoalsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestGoalsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.goalsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestAssistsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgAssistsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestAssistsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.assistsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestSavesPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgSavesPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestSavesPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.savesPerMinute).toFixed(2)}
              </td>
              <td
                className={player.isHighestKOsPerMatch ? styles.highlight : ""}
              >
                {Number(player.avgKOsPerMatch).toFixed(2)}
              </td>
              <td
                className={player.isHighestKOsPerMinute ? styles.highlight : ""}
              >
                {Number(player.knockoutsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestDamagePerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgDamagePerMatch).toFixed(0)}
              </td>
              <td
                className={
                  player.isHighestDamagePerMinute ? styles.highlight : ""
                }
              >
                {Number(player.damagePerMinute).toFixed(0)}
              </td>
              <td
                className={
                  player.isHighestShotsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgShotsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestShotsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.shotsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestRedirectsPerMatch ? styles.highlight : ""
                }
              >
                {Number(player.avgRedirectsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestRedirectsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.redirectsPerMinute).toFixed(2)}
              </td>
              <td
                className={player.isHighestOrbsPerMatch ? styles.highlight : ""}
              >
                {Number(player.avgOrbsPerMatch).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestOrbsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.orbsPerMinute).toFixed(2)}
              </td>
            </tr>
          ))}

          {anonymousGoalieStats && (
            <tr>
              <td>{anonymousGoalieStats.name}</td>
              <td>
                <div style={{ display: "flex", gap: "4px" }}>
                  {anonymousGoalieStats.topStrikers?.map(
                    (striker: any, i: number) => (
                      <img
                        key={i}
                        // @ts-ignore
                        src={`/strikers/${STRIKER_IMAGES[striker]}`} // Adjust path as needed
                        alt={striker}
                        width={24}
                        style={{ borderRadius: "4px" }}
                      />
                    )
                  )}
                </div>
              </td>
              <td>
                {formatDuration(anonymousGoalieStats.totalPlaytimeInSeconds)}
              </td>
              <td>{anonymousGoalieStats.matchesPlayed}</td>
              <td>
                {formatDuration(
                  Number(
                    (
                      anonymousGoalieStats.totalPlaytimeInSeconds /
                      anonymousGoalieStats.matchesPlayed
                    ).toFixed(0)
                  )
                )}
              </td>
              <td>
                {Number(anonymousGoalieStats.avgGoalsPerMatch).toFixed(2)}
              </td>
              <td>{Number(anonymousGoalieStats.goalsPerMinute).toFixed(2)}</td>
              <td>
                {Number(anonymousGoalieStats.avgAssistsPerMatch).toFixed(2)}
              </td>
              <td>
                {Number(anonymousGoalieStats.assistsPerMinute).toFixed(2)}
              </td>
              <td>
                {Number(anonymousGoalieStats.avgSavesPerMatch).toFixed(2)}
              </td>
              <td>{Number(anonymousGoalieStats.savesPerMinute).toFixed(2)}</td>
              <td>{Number(anonymousGoalieStats.avgKOsPerMatch).toFixed(2)}</td>
              <td>
                {Number(anonymousGoalieStats.knockoutsPerMinute).toFixed(2)}
              </td>
              <td>
                {Number(anonymousGoalieStats.avgDamagePerMatch).toFixed(0)}
              </td>
              <td>{Number(anonymousGoalieStats.damagePerMinute).toFixed(0)}</td>
              <td>
                {Number(anonymousGoalieStats.avgShotsPerMatch).toFixed(2)}
              </td>
              <td>{Number(anonymousGoalieStats.shotsPerMinute).toFixed(2)}</td>
              <td>
                {Number(anonymousGoalieStats.avgRedirectsPerMatch).toFixed(2)}
              </td>
              <td>
                {Number(anonymousGoalieStats.redirectsPerMinute).toFixed(2)}
              </td>
              <td>{Number(anonymousGoalieStats.avgOrbsPerMatch).toFixed(2)}</td>
              <td>{Number(anonymousGoalieStats.orbsPerMinute).toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>All-Time Totals</h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Playtime</th>
            <th>Total Matches</th>
            <th>Total Wins</th>
            <th>Total Losses</th>
            <th>Win Rate (%)</th>
            <th>Total Goals</th>
            <th>Total Assists</th>
            <th>Total Saves</th>
            <th>Total KOs</th>
            <th>Total Damage</th>
            <th>Total Shots</th>
            <th>Total Redirects</th>
            <th>Total Orbs</th>
          </tr>
        </thead>
        <tbody>
          {allTimeStats &&
            allTimeStats.map((player, index) => (
              <tr key={index}>
                <td>{player.name}</td>
                <td
                  className={player.isHighestPlaytime ? styles.highlight : ""}
                >
                  {formatDuration(player.totalPlaytime)}
                </td>
                <td className={player.isHighestMatches ? styles.highlight : ""}>
                  {player.totalMatches}
                </td>
                <td className={player.isHighestWins ? styles.highlight : ""}>
                  {player.totalWins}
                </td>
                <td className={player.isHighestLosses ? styles.highlight : ""}>
                  {player.totalLosses}
                </td>
                <td className={player.isHighestWinRate ? styles.highlight : ""}>
                  {player.winRate}%
                </td>
                <td className={player.isHighestGoals ? styles.highlight : ""}>
                  {player.totalGoals}
                </td>
                <td className={player.isHighestAssists ? styles.highlight : ""}>
                  {player.totalAssists}
                </td>
                <td className={player.isHighestSaves ? styles.highlight : ""}>
                  {player.totalSaves}
                </td>
                <td
                  className={player.isHighestKnockouts ? styles.highlight : ""}
                >
                  {player.totalKnockouts}
                </td>
                <td className={player.isHighestDamage ? styles.highlight : ""}>
                  {player.totalDamage}
                </td>
                <td className={player.isHighestShots ? styles.highlight : ""}>
                  {player.totalShots}
                </td>
                <td
                  className={player.isHighestRedirects ? styles.highlight : ""}
                >
                  {player.totalRedirects}
                </td>
                <td className={player.isHighestOrbs ? styles.highlight : ""}>
                  {player.totalOrbs}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
