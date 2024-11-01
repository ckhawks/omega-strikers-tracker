import NavigationBar from "@/components/NavigationBar";
import StrikerAvatar from "@/components/StrikerAvatar";
import { db } from "@/util/db/db";
import styles from "../main.module.scss";
import DuoWinRatesAccordion from "./DuoWinRatesAccordion";
import TrioCompsAccordion from "./TrioCompsAccordion";

export const revalidate = 1;

// Helper function to group duos by map
const groupByMap = (duos: any) => {
  return duos.reduce((acc: any, duo: any) => {
    if (!acc[duo.map]) {
      acc[duo.map] = [];
    }
    acc[duo.map].push(duo);
    return acc;
  }, {});
};

export default async function TeamCompositions({
  searchParams,
}: {
  searchParams: { excludeNonRegistered?: string };
}) {
  const excludeNonRegistered = searchParams.excludeNonRegistered === "true";

  const registeredPlayersFilterTrio = excludeNonRegistered
    ? 'AND (mp1."playerId" IS NOT NULL AND mp2."playerId" IS NOT NULL AND mp3."playerId" IS NOT NULL)'
    : "";

  const duos = await db(
    `
      WITH duo_stats AS (
    SELECT 
        m."map",
        LEAST(mp1."striker", mp2."striker") AS "striker1",
        GREATEST(mp1."striker", mp2."striker") AS "striker2",
        mp1."wasGoalie" AS "role1",
        mp2."wasGoalie" AS "role2",
        COUNT(*) AS "matchesPlayed",
        SUM(
            CASE 
                WHEN m."team1Won" = true AND mp1."teamNumber" = 1 THEN 1
                WHEN m."team1Won" = false AND mp1."teamNumber" = 2 THEN 1
                ELSE 0 
            END
        ) AS "wins"
    FROM "MatchPlayer" mp1
    JOIN "MatchPlayer" mp2 
        ON mp1."matchId" = mp2."matchId" 
        AND mp1."teamNumber" = mp2."teamNumber" 
        AND (mp1."playerId" IS DISTINCT FROM mp2."playerId" OR (mp1."playerId" IS NULL AND mp2."playerId" IS NULL))
    JOIN "Match" m 
        ON mp1."matchId" = m."id"
    GROUP BY m."map", "striker1", "striker2", mp1."wasGoalie", mp2."wasGoalie"
),
all_maps_duo_stats AS (
    SELECT 
        'All Maps' AS "map",
        "striker1",
        "striker2",
        "role1",
        "role2",
        SUM("matchesPlayed") AS "matchesPlayed",
        SUM("wins") AS "wins"
    FROM duo_stats
    WHERE "matchesPlayed" > 1
    GROUP BY "striker1", "striker2", "role1", "role2"
)
SELECT 
    "map",
    "striker1",
    "striker2",
    "role1",
    "role2",
    "matchesPlayed",
    ROUND(("wins"::numeric / NULLIF("matchesPlayed", 0)) * 100, 2) AS "winRate"
FROM (
    SELECT * FROM duo_stats
    UNION ALL
    SELECT * FROM all_maps_duo_stats
) AS combined_duo_stats
WHERE "matchesPlayed" > 0 
ORDER BY "map", "winRate" DESC, "matchesPlayed" DESC;
  
    `,
    []
  );

  const soloCounters = await db(
    `
    WITH solo_counter_stats AS (
    SELECT 
        mp1."striker" AS "striker",
        mp2."striker" AS "opponent",
        COUNT(*) AS "matchesPlayed",
        SUM(
            CASE 
                WHEN (m."team1Won" = true AND mp1."teamNumber" = 1) OR (m."team1Won" = false AND mp1."teamNumber" = 2) THEN 1
                ELSE 0 
            END
        ) AS "wins"
    FROM "MatchPlayer" mp1
    JOIN "MatchPlayer" mp2 
        ON mp1."matchId" = mp2."matchId" 
        AND mp1."teamNumber" != mp2."teamNumber"
        AND (mp1."playerId" IS DISTINCT FROM mp2."playerId" OR (mp1."playerId" IS NULL AND mp2."playerId" IS NULL))
    JOIN "Match" m 
        ON mp1."matchId" = m."id"
    GROUP BY mp1."striker", mp2."striker"
)
SELECT 
    "striker",
    "opponent",
    "matchesPlayed",
    ROUND(("wins"::numeric / NULLIF("matchesPlayed", 0)) * 100, 2) AS "winRate"
FROM solo_counter_stats
ORDER BY "winRate" DESC, "matchesPlayed" DESC
LIMIT 100;
  
  `,
    []
  );

  const trioComps = await db(
    `
      WITH filtered_players AS (
    SELECT DISTINCT
        mp1."matchId",
        mp1."striker" AS striker1,
        mp2."striker" AS striker2,
        mp3."striker" AS goalie
    FROM "MatchPlayer" mp1
    JOIN "MatchPlayer" mp2 
        ON mp1."matchId" = mp2."matchId" 
        AND mp1."teamNumber" = mp2."teamNumber" 
        AND (mp1."playerId" IS DISTINCT FROM mp2."playerId" OR (mp1."playerId" IS NULL AND mp2."playerId" IS NULL))
    JOIN "MatchPlayer" mp3 
        ON mp1."matchId" = mp3."matchId" 
        AND mp1."teamNumber" = mp3."teamNumber"
        AND (mp1."playerId" IS DISTINCT FROM mp3."playerId" OR (mp1."playerId" IS NULL AND mp3."playerId" IS NULL))
        AND (mp2."playerId" IS DISTINCT FROM mp3."playerId" OR (mp2."playerId" IS NULL AND mp3."playerId" IS NULL))
    WHERE mp1."wasGoalie" = false 
      AND mp2."wasGoalie" = false
      AND mp3."wasGoalie" = true
      AND LEAST(mp1."striker", mp2."striker") = mp1."striker"
      AND mp1."striker" != mp2."striker"
      AND mp1."striker" != mp3."striker"
      AND mp2."striker" != mp3."striker"
      ${registeredPlayersFilterTrio}
),
trio_stats AS (
    SELECT 
        m."map",
        fp.striker1 AS "striker1",
        fp.striker2 AS "striker2",
        fp.goalie AS "goalie",
        COUNT(*) AS "matchesPlayed",
        SUM(
            CASE 
                WHEN (m."team1Won" = true AND mp1."teamNumber" = 1) OR (m."team1Won" = false AND mp1."teamNumber" = 2) THEN 1
                ELSE 0 
            END
        ) AS "wins"
    FROM filtered_players fp
    JOIN "Match" m ON fp."matchId" = m."id"
    JOIN "MatchPlayer" mp1 ON fp."matchId" = mp1."matchId" AND mp1."striker" = fp.striker1
    GROUP BY m."map", fp.striker1, fp.striker2, fp.goalie
),
all_maps_trio_stats AS (
    SELECT 
        'All Maps' AS "map",
        "striker1",
        "striker2",
        "goalie",
        SUM("matchesPlayed") AS "matchesPlayed",
        SUM("wins") AS "wins"
    FROM trio_stats
    GROUP BY "striker1", "striker2", "goalie"
)
SELECT 
    "map",
    "striker1",
    "striker2",
    "goalie",
    "matchesPlayed",
    ROUND(("wins"::numeric / NULLIF("matchesPlayed", 0)) * 100, 2) AS "winRate"
FROM (
    SELECT * FROM trio_stats
    UNION ALL
    SELECT * FROM all_maps_trio_stats
) AS combined_trio_stats
WHERE "matchesPlayed" > 0
ORDER BY "winRate" DESC, "matchesPlayed" DESC;


    `,
    []
  );

  const triosByMap = groupByMap(
    trioComps.filter((trio: any) => trio.map !== "All Maps")
  );
  const allMapsTrios = trioComps.filter((trio: any) => trio.map === "All Maps");

  const duosByMap = groupByMap(
    duos.filter((duo: any) => duo.map !== "All Maps")
  );
  const allMapsDuos = duos.filter((duo: any) => duo.map === "All Maps");

  return (
    <div className={styles.main}>
      <NavigationBar />
      <div>
        <h1>Team Compositions</h1>
      </div>
      <div>
        <h2>Trio Compositions</h2>
      </div>
      <TrioCompsAccordion
        allMapsTrios={allMapsTrios}
        triosByMap={triosByMap}
        excludeNonRegistered={excludeNonRegistered}
      />

      <h2>Top Duo Win Rates</h2>
      <DuoWinRatesAccordion duosByMap={duosByMap} allMapsDuos={allMapsDuos} />

      <div>
        <h2>Solo Counter Win Rates</h2>
        <table>
          <thead>
            <tr>
              <th>Striker</th>
              <th>Countered Opponent</th>
              <th>Win Rate (%)</th>
              <th>Matches Played</th>
            </tr>
          </thead>
          <tbody>
            {soloCounters.map((counter) => (
              <tr key={`${counter.striker}-${counter.opponent}`}>
                <td>
                  <StrikerAvatar striker={counter.striker} />
                  {counter.striker}
                </td>
                <td>
                  <StrikerAvatar striker={counter.opponent} />
                  {counter.opponent}
                </td>
                <td>{counter.winRate}%</td>
                <td>{counter.matchesPlayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
