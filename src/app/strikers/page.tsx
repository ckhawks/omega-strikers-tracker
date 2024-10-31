import { db } from "@/util/db/db";
import StrikersTable from "./StrikersTable"; // Client component
import NavigationBar from "@/components/NavigationBar";
import styles from "../main.module.scss";

// Server component
export default async function StrikersList({
  searchParams,
}: {
  searchParams: any;
}) {
  const excludeFriendlies = searchParams.excludeFriendlies === "true";

  const query = `
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
        GROUP BY mp."striker"
        ORDER BY "winRate" DESC, "timesPlayed" DESC
    )
    SELECT * FROM striker_stats;
  `;

  const strikersStats = await db(query, []);

  return (
    <div className={styles.main}>
      <NavigationBar />
      <StrikersTable
        strikersStats={strikersStats}
        excludeFriendlies={excludeFriendlies}
      />
    </div>
  );
}
