// strikers/page.tsx

import { db } from "@/util/db/db";
import StrikersTable from "./StrikersTable"; // Client component
import NavigationBar from "@/components/NavigationBar";
import styles from "../main.module.scss";
import StrikerAvatar from "@/components/StrikerAvatar";
import StrikerWinRates from "./StrikersMapsTable";

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

  const strikerWinRates = await db(
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
  ),
  striker_total_data AS (
      SELECT 
          "striker",
          SUM(CASE WHEN role = true THEN matches_played ELSE 0 END) AS total_goalie_matches,
          SUM(CASE WHEN role = false THEN matches_played ELSE 0 END) AS total_forward_matches,
          SUM(matches_played) AS total_matches,
          ROUND(SUM(CASE WHEN role = true THEN wins ELSE 0 END)::numeric 
                / NULLIF(SUM(CASE WHEN role = true THEN matches_played ELSE 0 END), 0) * 100, 2) AS total_goalie_win_rate,
          ROUND(SUM(CASE WHEN role = false THEN wins ELSE 0 END)::numeric 
                / NULLIF(SUM(CASE WHEN role = false THEN matches_played ELSE 0 END), 0) * 100, 2) AS total_forward_win_rate,
          ROUND(SUM(wins)::numeric / NULLIF(SUM(matches_played), 0) * 100, 2) AS total_combined_win_rate
      FROM striker_map_data
      GROUP BY "striker"
  )
  SELECT 
      wr."striker",
      wr."map",
      MAX(wr.goalie_win_rate) AS goalie_win_rate,
      MAX(wr.goalie_matches_played) AS goalie_matches_played,
      MAX(wr.forward_win_rate) AS forward_win_rate,
      MAX(wr.forward_matches_played) AS forward_matches_played,
      st.total_goalie_win_rate,
      st.total_goalie_matches,
      st.total_forward_win_rate,
      st.total_forward_matches,
      st.total_combined_win_rate,
      st.total_matches
  FROM win_rates wr
  JOIN striker_total_data st ON wr."striker" = st."striker"
  GROUP BY wr."striker", wr."map", st.total_goalie_win_rate, st.total_goalie_matches, st.total_forward_win_rate, st.total_forward_matches, st.total_combined_win_rate, st.total_matches
  ORDER BY wr."striker", wr."map";
  
  
  
  
    `,
    []
  );

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
      <StrikerWinRates strikerWinRates={strikerWinRates} />
    </div>
  );
}
