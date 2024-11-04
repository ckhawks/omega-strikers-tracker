// strikers/page.tsx

import { db } from "@/util/db/db";
import StrikersTable from "./StrikersTable"; // Client component
import NavigationBar from "@/components/NavigationBar";
import styles from "../main.module.scss";
import StrikerAvatar from "@/components/StrikerAvatar";

export const revalidate = 1;

// Server component
export default async function StrikersList({
  searchParams,
}: {
  searchParams: any;
}) {
  const excludeFriendlies = searchParams.excludeFriendlies === "true";

  const baseQuery = (goalieOnly: boolean | null) => `
    WITH striker_stats AS (
        SELECT
            mp."striker",
            COUNT(*) AS "timesPlayed",
            SUM(CASE WHEN m."team1Won" = true AND mp."teamNumber" = 1 THEN 1
                     WHEN m."team1Won" = false AND mp."teamNumber" = 2 THEN 1
                     ELSE 0 END) AS "wins",
            ROUND((SUM(CASE WHEN m."team1Won" = true AND mp."teamNumber" = 1 THEN 1
                           WHEN m."team1Won" = false AND mp."teamNumber" = 2 THEN 1
                           ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) AS "winRate",
            ROUND(AVG(mp."statGoals")::numeric, 2) AS "averageGoals",
            ROUND(AVG(mp."statAssists")::numeric, 2) AS "averageAssists",
            ROUND(AVG(mp."statSaves")::numeric, 2) AS "averageSaves",
            ROUND(AVG(mp."statKnockouts")::numeric, 2) AS "averageKnockouts",
            ROUND(AVG(mp."statDamage")::numeric, 2) AS "averageDamage",
            ROUND(AVG(mp."statDamage")::numeric / NULLIF(AVG(mp."statKnockouts")::numeric, 0), 2) AS "averageDamagePerKnockout",
            ROUND(AVG(mp."statShots")::numeric, 2) AS "averageShots",
            ROUND(AVG(mp."statRedirects")::numeric, 2) AS "averageRedirects",
            ROUND(AVG(mp."statOrbs")::numeric, 2) AS "averageOrbs"
        FROM "MatchPlayer" mp
        JOIN "Match" m ON mp."matchId" = m."id"
        WHERE mp."deletedAt" IS NULL
        ${excludeFriendlies ? 'AND mp."playerId" IS NULL' : ""}
        ${goalieOnly !== null ? `AND mp."wasGoalie" = ${goalieOnly}` : ""}
        GROUP BY mp."striker"
        ORDER BY "winRate" DESC, "timesPlayed" DESC
    )
    SELECT * FROM striker_stats;
  `;

  const [combinedStats, forwardStats, goalieStats] = await Promise.all([
    db(baseQuery(null), []), // Combined
    db(baseQuery(false), []), // Forward
    db(baseQuery(true), []), // Goalie
  ]);

  const strikerMapWinRates = await db(
    `
    WITH striker_map_data AS (
      SELECT 
          mp."striker",
          m."map",
          mp."wasGoalie" AS role,
          COUNT(*) AS matches_played,
          SUM(
              CASE 
                  WHEN (m."team1Won" = true AND mp."teamNumber" = 1) OR 
                       (m."team1Won" = false AND mp."teamNumber" = 2) THEN 1 
                  ELSE 0 
              END
          ) AS wins
      FROM "MatchPlayer" mp
      JOIN "Match" m ON mp."matchId" = m."id"
      WHERE mp."deletedAt" IS NULL
      GROUP BY mp."striker", m."map", mp."wasGoalie"
  ),
  win_rates AS (
      SELECT 
          "striker",
          "map",
          CASE WHEN role = true THEN 
              ROUND((wins::numeric / matches_played) * 100, 2) 
              ELSE NULL 
          END AS goalie_win_rate,
          CASE WHEN role = true THEN matches_played ELSE NULL END AS goalie_matches_played,
          CASE WHEN role = false THEN 
              ROUND((wins::numeric / matches_played) * 100, 2) 
              ELSE NULL 
          END AS forward_win_rate,
          CASE WHEN role = false THEN matches_played ELSE NULL END AS forward_matches_played
      FROM striker_map_data
  )
  SELECT 
      "striker",
      "map",
      MAX(goalie_win_rate) AS goalie_win_rate,
      MAX(goalie_matches_played) AS goalie_matches_played,
      MAX(forward_win_rate) AS forward_win_rate,
      MAX(forward_matches_played) AS forward_matches_played
  FROM win_rates
  GROUP BY "striker", "map"
  ORDER BY "striker", "map";
  
  
  
    `,
    []
  );

  const groupedData = strikerMapWinRates.reduce((acc, row) => {
    const {
      striker,
      map,
      goalie_win_rate,
      goalie_matches_played,
      forward_win_rate,
      forward_matches_played,
    } = row;
    if (!acc[striker]) acc[striker] = {};
    if (!acc[striker][map])
      acc[striker][map] = {
        forward: null,
        forwardMatches: 0,
        goalie: null,
        goalieMatches: 0,
      };

    acc[striker][map].goalie = goalie_win_rate;
    acc[striker][map].goalieMatches = goalie_matches_played;
    acc[striker][map].forward = forward_win_rate;
    acc[striker][map].forwardMatches = forward_matches_played;

    return acc;
  }, {});

  const maps = Array.from(new Set(strikerMapWinRates.map((row) => row.map)));

  return (
    <div className={styles.main}>
      <NavigationBar />
      <StrikersTable
        combinedStats={combinedStats}
        forwardStats={forwardStats}
        goalieStats={goalieStats}
        excludeFriendlies={excludeFriendlies}
      />
      <h2>Striker Win Rates by Map</h2>
      <table className={styles.winRateTable}>
        <thead>
          <tr>
            <th>Striker</th>
            {maps.map((map) => (
              <th key={map} colSpan={2}>
                <center>{map}</center>
              </th>
            ))}
          </tr>
          <tr>
            <th></th>
            {maps.map((map) => (
              <>
                <th key={`${map}-forward`}>Forward</th>
                <th key={`${map}-goalie`}>Goalie</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedData).map(([striker, mapData]) => (
            <tr key={striker}>
              <td>
                <StrikerAvatar striker={striker} />
                {striker}
              </td>
              {maps.map((map) => (
                <>
                  <td key={`${striker}-${map}-forward`}>
                    {mapData[map]?.forward ? (
                      <>
                        <span>{mapData[map]?.forward}%</span>{" "}
                        <span className={styles["small"]}>
                          {mapData[map].forwardMatches}
                        </span>
                      </>
                    ) : (
                      <span className={styles["subtext"]}>N/A</span>
                    )}
                  </td>
                  <td key={`${striker}-${map}-goalie`}>
                    {mapData[map]?.goalie ? (
                      <>
                        <span>{mapData[map]?.goalie}%</span>{" "}
                        <span className={styles["small"]}>
                          {mapData[map].goalieMatches}
                        </span>
                      </>
                    ) : (
                      <span className={styles["subtext"]}>N/A</span>
                    )}
                  </td>
                </>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
