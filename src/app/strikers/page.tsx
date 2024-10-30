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

export default async function StrikersList() {
  const strikersStats = await db(
    `
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
        GROUP BY mp."striker"
        ORDER BY "winRate" DESC, "timesPlayed" DESC
    )
    SELECT * FROM striker_stats;
    `,
    []
  );

  return (
    <div className={styles.main}>
      <NavigationBar />
      <div>
        <h3>Strikers - Combined</h3>
        {/* <div>Includes average per match and average per minute</div> */}
      </div>

      <table>
        <thead>
          <tr>
            <th>Striker</th>
            <th>Winrate</th>
            <th>Matches</th>
            <th>Goals</th>
            <th>Assists</th>
            <th>Saves</th>
            <th>KOs</th>
            <th>Damage</th>
            <th>Dmg per KO</th>
            <th>Shots</th>
            <th>Redirects</th>
            <th>Orbs</th>
          </tr>
        </thead>
        <tbody>
          {strikersStats &&
            strikersStats.map((striker: any) => (
              <tr key={striker.striker}>
                <td>
                  <img
                    width={32}
                    // @ts-ignore
                    src={`/strikers/${STRIKER_IMAGES[striker.striker]}`}
                    style={{ marginRight: "4px" }}
                    alt={striker.striker}
                  />{" "}
                  {striker.striker}
                </td>
                <td>{striker.winRate}%</td>
                <td>{striker.timesPlayed}</td>
                <td>{striker.averageGoals}</td>
                <td>{striker.averageAssists}</td>
                <td>{striker.averageSaves}</td>
                <td>{striker.averageKnockouts}</td>
                <td>{Math.round(striker.averageDamage)}</td>
                <td>{Math.round(striker.averageDamagePerKnockout)}</td>
                <td>{striker.averageShots}</td>
                <td>{striker.averageRedirects}</td>
                <td>{striker.averageOrbs}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
