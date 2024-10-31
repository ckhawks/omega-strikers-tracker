// pages/bans.tsx

import { db } from "@/util/db/db";
import styles from "../main.module.scss";
import NavigationBar from "@/components/NavigationBar";
import { STRIKER_IMAGES } from "@/constants/strikers";

export default async function Bans() {
  // Query for top strikers by win rate
  const bansByWinRate = await db(
    `
      WITH map_striker_stats AS (
          SELECT
              m."map",
              mp."striker",
              CASE WHEN mp."wasGoalie" THEN 'Goalie' ELSE 'Forward' END AS "role",
              COUNT(*) AS "matchesPlayed",
              SUM(CASE WHEN m."team1Won" = true AND mp."teamNumber" = 1 THEN 1
                       WHEN m."team1Won" = false AND mp."teamNumber" = 2 THEN 1
                       ELSE 0 END) AS "wins",
              ROUND(
                  (SUM(CASE WHEN m."team1Won" = true AND mp."teamNumber" = 1 THEN 1
                            WHEN m."team1Won" = false AND mp."teamNumber" = 2 THEN 1
                            ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
              ) AS "winRate"
          FROM "MatchPlayer" mp
          JOIN "Match" m ON mp."matchId" = m."id"
          WHERE mp."playerId" IS NULL
          GROUP BY m."map", mp."striker", mp."wasGoalie"
      )
      SELECT "map", "striker", "role", "winRate", "matchesPlayed"
      FROM map_striker_stats
      WHERE "winRate" >= 50
      ORDER BY "map", "winRate" DESC, "matchesPlayed" DESC;
    `,
    []
  );

  // Query for top strikers by average KOs
  const bansByKOs = await db(
    `
      WITH map_striker_stats AS (
          SELECT
              m."map",
              mp."striker",
              CASE WHEN mp."wasGoalie" THEN 'Goalie' ELSE 'Forward' END AS "role",
              COUNT(*) AS "matchesPlayed",
              ROUND(AVG(mp."statKnockouts")::numeric, 2) AS "averageKOs"
          FROM "MatchPlayer" mp
          JOIN "Match" m ON mp."matchId" = m."id"
          WHERE mp."playerId" IS NULL
          GROUP BY m."map", mp."striker", mp."wasGoalie"
      )
      SELECT "map", "striker", "role", "averageKOs", "matchesPlayed"
      FROM map_striker_stats
      WHERE "averageKOs" >= 2.0
      ORDER BY "map", "averageKOs" DESC, "matchesPlayed" DESC;
    `,
    []
  );

  // Organize bans by map
  const bansByMapWinRate = bansByWinRate.reduce((acc: any, ban: any) => {
    if (!acc[ban.map]) acc[ban.map] = [];
    acc[ban.map].push(ban);
    return acc;
  }, {});

  const bansByMapKOs = bansByKOs.reduce((acc: any, ban: any) => {
    if (!acc[ban.map]) acc[ban.map] = [];
    acc[ban.map].push(ban);
    return acc;
  }, {});

  return (
    <div className={styles.main}>
      <NavigationBar />

      {/* Section for Win Rate-Based Bans */}
      <div>
        <h1>Bans by Win Rate</h1>
        <p>
          Strikers with a win rate at 50% or higher on each map; excluding data
          from registered players (opponents/randoms only)
        </p>
      </div>
      <div className={styles["maps-container"]}>
        {Object.entries(bansByMapWinRate).map(([map, strikers]: any) => (
          <div key={map} className={styles["map-section"]}>
            <h2>{map}</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Striker</th>
                  <th>Role</th>
                  <th>Win Rate (%)</th>
                  <th>Matches</th>
                </tr>
              </thead>
              <tbody>
                {strikers.map((striker: any) => (
                  <tr key={striker.striker}>
                    <td>
                      <img
                        width={32}
                        // @ts-ignore
                        src={`/strikers/${STRIKER_IMAGES[striker.striker]}`}
                        alt={striker.striker}
                        style={{ marginRight: "4px" }}
                      />{" "}
                      {striker.striker}
                    </td>
                    <td>{striker.role}</td>
                    <td>{striker.winRate}%</td>
                    <td>{striker.matchesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Section for KO-Based Bans */}
      <br />
      <div>
        <h1>Bans by Average KOs</h1>
        <p>
          Strikers with an average KO rate of 2.0 or higher on each map;
          excluding data from registered players (opponents/randoms only)
        </p>
      </div>
      <div className={styles["maps-container"]}>
        {Object.entries(bansByMapKOs).map(([map, strikers]: any) => (
          <div key={map} className={styles["map-section"]}>
            <h2>{map}</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Striker</th>
                  <th>Role</th>
                  <th>Avg KOs</th>
                  <th>Matches</th>
                </tr>
              </thead>
              <tbody>
                {strikers.map((striker: any) => (
                  <tr key={striker.striker}>
                    <td>
                      <img
                        width={32}
                        // @ts-ignore
                        src={`/strikers/${STRIKER_IMAGES[striker.striker]}`}
                        alt={striker.striker}
                        style={{ marginRight: "4px" }}
                      />{" "}
                      {striker.striker}
                    </td>
                    <td>{striker.role}</td>
                    <td>{striker.averageKOs}</td>
                    <td>{striker.matchesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
