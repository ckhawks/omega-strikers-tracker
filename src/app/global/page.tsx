import styles from "../main.module.scss";
import Link from "next/link";
import NavigationBar from "@/components/NavigationBar";
import { db } from "@/util/db/db";
import { AVATAR_IMAGES } from "@/constants/avatars";
import StrikerAvatar from "@/components/StrikerAvatar";
import Tooltip from "@/components/Tooltip";

export const revalidate = 1;

export default async function GlobalStats() {
  const globalMapStrikers = await db(
    `
      WITH global_player_matches AS (
        -- Retrieve relevant data for each match, categorizing by map, striker, role, match result, and registered status
        SELECT
          mp."striker",
          mp."wasGoalie",
          m."map",
          mp."playerId" IS NOT NULL AS "isRegistered", -- Check if playerId is non-null
          CASE 
              WHEN mp."teamNumber" = 1 AND m."team1Won" = TRUE THEN 'Win'
              WHEN mp."teamNumber" = 2 AND m."team1Won" = FALSE THEN 'Win'
              ELSE 'Loss' 
          END AS "matchResult"
        FROM "MatchPlayer" mp
        JOIN "Match" m ON mp."matchId" = m."id"
        WHERE mp."deletedAt" IS NULL
      ),
      map_total_matches AS (
        -- Calculate the total matches played on each map
        SELECT 
          "map", 
          COUNT(*) AS "totalMatches"
        FROM global_player_matches
        GROUP BY "map"
      )
      SELECT 
        gpm."map",
        gpm."wasGoalie" AS "role",
        gpm."striker",
        COUNT(*) AS "matchesPlayed",
        SUM(CASE WHEN gpm."matchResult" = 'Win' THEN 1 ELSE 0 END) AS "wins",
        ROUND(
          (SUM(CASE WHEN gpm."matchResult" = 'Win' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
        ) AS "winRate",
        ROUND(
          (SUM(CASE WHEN gpm."isRegistered" = TRUE THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
        ) AS "friendlyRate", -- Calculate "Friendly %" as percentage of non-null playerId
        mtm."totalMatches" -- Include total matches per map
      FROM global_player_matches gpm
      JOIN map_total_matches mtm ON gpm."map" = mtm."map"
      GROUP BY gpm."map", "role", "striker", mtm."totalMatches"
      ORDER BY gpm."map", "role", "winRate" DESC, "matchesPlayed" DESC;
    `
  );

  // Process the results as before
  const globalMapStats = Object.entries(
    globalMapStrikers.reduce((acc, curr) => {
      const {
        map,
        role,
        striker,
        matchesPlayed,
        wins,
        winRate,
        friendlyRate,
        totalMatches,
      } = curr;
      if (!acc[map]) acc[map] = { totalMatches, Forwards: [], Goalies: [] };
      acc[map][role ? "Goalies" : "Forwards"].push({
        striker,
        matchesPlayed,
        wins,
        winRate,
        friendlyRate, // Include friendlyRate in the data
      });
      return acc;
    }, {})
  );

  return (
    <>
      <NavigationBar />
      <div className={styles.main}>
        <h1>Global Stats</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h3>Global Map Stats - Win Rate by Striker and Role</h3>
          <table style={{ maxWidth: "900px" }}>
            <thead>
              <tr>
                <th>Map</th>
                <th>Role</th>
                <th>Striker</th>
                <th>Win Rate (%)</th>
                <th>Matches</th>
                <th>
                  <Tooltip
                    text={"Percent of the matches played by a registered user"}
                  >
                    <span className={styles["tooltippable"]}>Friendly (%)</span>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {globalMapStats.map(
                ([mapName, { totalMatches, Forwards, Goalies }]) => (
                  <>
                    {/* Forwards */}
                    {Forwards.map(
                      (
                        {
                          striker,
                          matchesPlayed,
                          wins,
                          winRate,
                          friendlyRate,
                        }: {
                          striker: any;
                          matchesPlayed: number;
                          wins: number;
                          winRate: number;
                          friendlyRate: number;
                        },
                        index: number
                      ) => (
                        <tr key={`${mapName}-forward-${index}`}>
                          <td>
                            {index === 0
                              ? `${mapName} - ${totalMatches / 6} matches`
                              : ""}
                          </td>
                          <td>Forward</td>
                          <td>
                            <StrikerAvatar striker={striker} />
                            {striker}
                          </td>
                          <td>{winRate}%</td>
                          <td>{matchesPlayed}</td>
                          <td>{friendlyRate}%</td>
                        </tr>
                      )
                    )}

                    {/* Goalies */}
                    {Goalies.map(
                      (
                        {
                          striker,
                          matchesPlayed,
                          wins,
                          winRate,
                          friendlyRate,
                        }: {
                          striker: any;
                          matchesPlayed: number;
                          wins: number;
                          winRate: number;
                          friendlyRate: number;
                        },
                        index: number
                      ) => (
                        <tr key={`${mapName}-goalie-${index}`}>
                          <td>
                            {index === 0 && Forwards.length === 0
                              ? `${mapName} - ${totalMatches / 6} matches`
                              : ""}
                          </td>
                          <td>Goalie</td>
                          <td>
                            <StrikerAvatar striker={striker} />
                            {striker}
                          </td>
                          <td>{winRate}%</td>
                          <td>{matchesPlayed}</td>
                          <td>{friendlyRate}%</td>
                        </tr>
                      )
                    )}
                  </>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
