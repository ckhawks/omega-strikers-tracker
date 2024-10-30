import styles from "../main.module.scss";
import Link from "next/link";
import NavigationBar from "@/components/NavigationBar";
import { db } from "@/util/db/db";
import { STRIKER_IMAGES } from "@/constants/strikers";
import { AVATAR_IMAGES } from "@/constants/avatars";

export const revalidate = 1;

export default async function GlobalStats() {
  const globalMapStrikers = await db(
    `
      WITH global_player_matches AS (
        -- Retrieve relevant data for each match, categorizing by map, striker, role, and match result
        SELECT
          mp."striker",
          mp."wasGoalie",
          m."map",
          CASE 
              WHEN mp."teamNumber" = 1 AND m."team1Won" = TRUE THEN 'Win'
              WHEN mp."teamNumber" = 2 AND m."team1Won" = FALSE THEN 'Win'
              ELSE 'Loss' 
          END AS "matchResult"
        FROM "MatchPlayer" mp
        JOIN "Match" m ON mp."matchId" = m."id"
        WHERE mp."deletedAt" IS NULL
      )
      SELECT 
        "map",
        "wasGoalie" AS "role",
        "striker",
        COUNT(*) AS "matchesPlayed",
        SUM(CASE WHEN "matchResult" = 'Win' THEN 1 ELSE 0 END) AS "wins",
        ROUND(
          (SUM(CASE WHEN "matchResult" = 'Win' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
        ) AS "winRate"
      FROM global_player_matches
      GROUP BY "map", "role", "striker"
      ORDER BY "map", "role", "winRate" DESC, "matchesPlayed" DESC;
    `
  );

  const globalMapStats = Object.entries(
    globalMapStrikers.reduce((acc, curr) => {
      const { map, role, striker, matchesPlayed, wins, winRate } = curr;
      if (!acc[map]) acc[map] = { Forwards: [], Goalies: [] };
      acc[map][role ? "Goalies" : "Forwards"].push({
        striker,
        matchesPlayed,
        wins,
        winRate,
      });
      return acc;
    }, {})
  );

  return (
    <div className={styles.main}>
      <NavigationBar />
      <h1>Global Stats</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h3>Global Map Stats - Win Rate by Striker and Role</h3>
        <table>
          <thead>
            <tr>
              <th>Map</th>
              <th>Role</th>
              <th>Striker</th>
              <th>Win Rate (%)</th>
              <th>Matches Played</th>
              <th>Wins</th>
            </tr>
          </thead>
          <tbody>
            {globalMapStats.map(([mapName, roles]) => (
              <>
                {/* Forwards */}
                {roles.Forwards.length > 0 &&
                  roles.Forwards.map(
                    ({ striker, matchesPlayed, wins, winRate }, index) => (
                      <tr key={`${mapName}-forward-${index}`}>
                        <td>{index === 0 ? mapName : ""}</td>{" "}
                        {/* Only show map name once per section */}
                        <td>Forward</td>
                        <td>{striker}</td>
                        <td>{winRate}%</td>
                        <td>{matchesPlayed}</td>
                        <td>{wins}</td>
                      </tr>
                    )
                  )}

                {/* Goalies */}
                {roles.Goalies.length > 0 &&
                  roles.Goalies.map(
                    ({ striker, matchesPlayed, wins, winRate }, index) => (
                      <tr key={`${mapName}-goalie-${index}`}>
                        <td>
                          {index === 0 && roles.Forwards.length === 0
                            ? mapName
                            : ""}
                        </td>
                        <td>Goalie</td>
                        <td>{striker}</td>
                        <td>{winRate}%</td>
                        <td>{matchesPlayed}</td>
                        <td>{wins}</td>
                      </tr>
                    )
                  )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
