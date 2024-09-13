import styles from "../main.module.scss";
import Link from "next/link";
import NavigationBar from "@/components/NavigationBar";
import { db } from "@/util/db/db";
import { STRIKER_IMAGES } from "@/constants/strikers";
import { AVATAR_IMAGES } from "@/constants/avatars";

export const revalidate = 1;

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

  const playersStats = await db(
    `
      WITH player_stats AS (
          SELECT 
            p."id",
            p."name",
            COUNT(mp."matchId") AS "matchesPlayed",
            COALESCE(ROUND(AVG(mp."statGoals")::numeric, 2), 0) AS "averageGoals",
            COALESCE(ROUND(AVG(mp."statAssists")::numeric, 2), 0) AS "averageAssists",
            COALESCE(ROUND(AVG(mp."statSaves")::numeric, 2), 0) AS "averageSaves",
            COALESCE(ROUND(AVG(mp."statKnockouts")::numeric, 2), 0) AS "averageKnockouts",
            COALESCE(ROUND(AVG(mp."statDamage")::numeric, 2), 0) AS "averageDamage",
            COALESCE(ROUND(AVG(mp."statShots")::numeric, 2), 0) AS "averageShots",
            COALESCE(ROUND(AVG(mp."statRedirects")::numeric, 2), 0) AS "averageRedirects",
            COALESCE(ROUND(AVG(mp."statOrbs")::numeric, 2), 0) AS "averageOrbs"
          FROM "Player" p
          LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
          WHERE p."deletedAt" IS NULL
          GROUP BY p."id", p."name"
      )
      SELECT 
          ps.*,
          CASE 
            WHEN ps."averageGoals" = MAX(ps."averageGoals") OVER () THEN TRUE ELSE FALSE 
          END AS "isHighestGoals",
          CASE 
            WHEN ps."averageAssists" = MAX(ps."averageAssists") OVER () THEN TRUE ELSE FALSE 
          END AS "isHighestAssists",
          CASE 
            WHEN ps."averageSaves" = MAX(ps."averageSaves") OVER () THEN TRUE ELSE FALSE 
          END AS "isHighestSaves",
          CASE 
            WHEN ps."averageKnockouts" = MAX(ps."averageKnockouts") OVER () THEN TRUE ELSE FALSE 
          END AS "isHighestKnockouts",
          CASE 
            WHEN ps."averageDamage" = MAX(ps."averageDamage") OVER () THEN TRUE ELSE FALSE 
          END AS "isHighestDamage",
          CASE 
            WHEN ps."averageShots" = MAX(ps."averageShots") OVER () THEN TRUE ELSE FALSE 
          END AS "isHighestShots",
          CASE 
            WHEN ps."averageRedirects" = MAX(ps."averageRedirects") OVER () THEN TRUE ELSE FALSE 
          END AS "isHighestRedirects",
          CASE 
            WHEN ps."averageOrbs" = MAX(ps."averageOrbs") OVER () THEN TRUE ELSE FALSE 
          END AS "isHighestOrbs"
      FROM player_stats ps
      ORDER BY ps."matchesPlayed" DESC;
    `,
    []
  );

  const playerStatsSplit = await db(
    `
      WITH player_stats AS (
          SELECT 
            p."id",
            p."name",
            mp."wasGoalie",  -- true = goalie, false = forward
            COUNT(mp."matchId") AS "matchesPlayed",
            ROUND(AVG(mp."statGoals")::numeric, 2) AS "averageGoals",
            ROUND(AVG(mp."statAssists")::numeric, 2) AS "averageAssists",
            ROUND(AVG(mp."statSaves")::numeric, 2) AS "averageSaves",
            ROUND(AVG(mp."statKnockouts")::numeric, 2) AS "averageKnockouts",
            ROUND(AVG(mp."statDamage")::numeric, 2) AS "averageDamage",
            ROUND(AVG(mp."statShots")::numeric, 2) AS "averageShots",
            ROUND(AVG(mp."statRedirects")::numeric, 2) AS "averageRedirects",
            ROUND(AVG(mp."statOrbs")::numeric, 2) AS "averageOrbs"
          FROM "Player" p
          LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
          WHERE p."deletedAt" IS NULL
          GROUP BY p."id", p."name", mp."wasGoalie"
      ),
      forward_stats AS (
          SELECT 
            ps."id",
            ps."name",
            'Forward' AS role,
            ps."matchesPlayed",
            ps."averageGoals",
            ps."averageAssists",
            ps."averageSaves",
            ps."averageKnockouts",
            ps."averageDamage",
            ps."averageShots",
            ps."averageRedirects",
            ps."averageOrbs",
            -- Add CASE for highlighting the highest stat for each column
            CASE WHEN ps."averageGoals" = MAX(ps."averageGoals") OVER () THEN 'highest' ELSE '' END AS "isHighestGoals",
            CASE WHEN ps."averageAssists" = MAX(ps."averageAssists") OVER () THEN 'highest' ELSE '' END AS "isHighestAssists",
            CASE WHEN ps."averageSaves" = MAX(ps."averageSaves") OVER () THEN 'highest' ELSE '' END AS "isHighestSaves",
            CASE WHEN ps."averageKnockouts" = MAX(ps."averageKnockouts") OVER () THEN 'highest' ELSE '' END AS "isHighestKnockouts",
            CASE WHEN ps."averageDamage" = MAX(ps."averageDamage") OVER () THEN 'highest' ELSE '' END AS "isHighestDamage",
            CASE WHEN ps."averageShots" = MAX(ps."averageShots") OVER () THEN 'highest' ELSE '' END AS "isHighestShots",
            CASE WHEN ps."averageRedirects" = MAX(ps."averageRedirects") OVER () THEN 'highest' ELSE '' END AS "isHighestRedirects",
            CASE WHEN ps."averageOrbs" = MAX(ps."averageOrbs") OVER () THEN 'highest' ELSE '' END AS "isHighestOrbs"
          FROM player_stats ps
          WHERE ps."wasGoalie" = false -- Only forward stats
      ),
      goalie_stats AS (
          SELECT 
            ps."id",
            ps."name",
            'Goalie' AS role,
            ps."matchesPlayed",
            ps."averageGoals",
            ps."averageAssists",
            ps."averageSaves",
            ps."averageKnockouts",
            ps."averageDamage",
            ps."averageShots",
            ps."averageRedirects",
            ps."averageOrbs",
            -- Add CASE for highlighting the highest stat for each column
            CASE WHEN ps."averageGoals" = MAX(ps."averageGoals") OVER () THEN 'highest' ELSE '' END AS "isHighestGoals",
            CASE WHEN ps."averageAssists" = MAX(ps."averageAssists") OVER () THEN 'highest' ELSE '' END AS "isHighestAssists",
            CASE WHEN ps."averageSaves" = MAX(ps."averageSaves") OVER () THEN 'highest' ELSE '' END AS "isHighestSaves",
            CASE WHEN ps."averageKnockouts" = MAX(ps."averageKnockouts") OVER () THEN 'highest' ELSE '' END AS "isHighestKnockouts",
            CASE WHEN ps."averageDamage" = MAX(ps."averageDamage") OVER () THEN 'highest' ELSE '' END AS "isHighestDamage",
            CASE WHEN ps."averageShots" = MAX(ps."averageShots") OVER () THEN 'highest' ELSE '' END AS "isHighestShots",
            CASE WHEN ps."averageRedirects" = MAX(ps."averageRedirects") OVER () THEN 'highest' ELSE '' END AS "isHighestRedirects",
            CASE WHEN ps."averageOrbs" = MAX(ps."averageOrbs") OVER () THEN 'highest' ELSE '' END AS "isHighestOrbs"
          FROM player_stats ps
          WHERE ps."wasGoalie" = true -- Only goalie stats
      )
      SELECT * FROM forward_stats
      UNION ALL
      SELECT * FROM goalie_stats;
    `,
    []
  );

  // console.log(playersStats);
  const forwardStats = playerStatsSplit.filter(
    (player) => player.role === "Forward"
  );
  const goalieStats = playerStatsSplit.filter(
    (player) => player.role === "Goalie"
  );

  // console.log("forwardStats", forwardStats);

  // console.log(players);

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
      <h2>Average Stats Per Match, Combined</h2>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Matches Played</th>
            <th>Avg Goals</th>
            <th>Avg Assists</th>
            <th>Avg Saves</th>
            <th>Avg KOs</th>
            <th>Avg Damage</th>
            <th>Avg Shots</th>
            <th>Avg Redirects</th>
            <th>Avg Orbs</th>
          </tr>
        </thead>
        <tbody>
          {playersStats &&
            playersStats.map((player: any, index: number) => (
              <>
                {player.matchesPlayed > 0 && (
                  <tr key={index}>
                    <td>{player.name}</td>
                    <td>{player.matchesPlayed}</td>
                    <td
                      className={player.isHighestGoals ? styles.highlight : ""}
                    >
                      {player.averageGoals}
                    </td>
                    <td
                      className={
                        player.isHighestAssists ? styles.highlight : ""
                      }
                    >
                      {player.averageAssists}
                    </td>
                    <td
                      className={player.isHighestSaves ? styles.highlight : ""}
                    >
                      {player.averageSaves}
                    </td>
                    <td
                      className={
                        player.isHighestKnockouts ? styles.highlight : ""
                      }
                    >
                      {player.averageKnockouts}
                    </td>
                    <td
                      className={player.isHighestDamage ? styles.highlight : ""}
                    >
                      {player.averageDamage}
                    </td>
                    <td
                      className={player.isHighestShots ? styles.highlight : ""}
                    >
                      {player.averageShots}
                    </td>
                    <td
                      className={
                        player.isHighestRedirects ? styles.highlight : ""
                      }
                    >
                      {player.averageRedirects}
                    </td>
                    <td
                      className={player.isHighestOrbs ? styles.highlight : ""}
                    >
                      {player.averageOrbs}
                    </td>
                  </tr>
                )}
              </>
            ))}
        </tbody>
      </table>
      <h3>Average Stats Per Match, Forward</h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Matches Played</th>
            <th>Avg Goals</th>
            <th>Avg Assists</th>
            <th>Avg Saves</th>
            <th>Avg KOs</th>
            <th>Avg Damage</th>
            <th>Avg Shots</th>
            <th>Avg Redirects</th>
            <th>Avg Orbs</th>
          </tr>
        </thead>
        <tbody>
          {forwardStats &&
            forwardStats.map((player: any, index: number) => (
              <>
                {player.matchesPlayed > 0 && (
                  <tr key={index}>
                    <td>{player.name}</td>
                    <td>{player.matchesPlayed}</td>
                    <td
                      className={player.isHighestGoals ? styles.highlight : ""}
                    >
                      {player.averageGoals}
                    </td>
                    <td
                      className={
                        player.isHighestAssists ? styles.highlight : ""
                      }
                    >
                      {player.averageAssists}
                    </td>
                    <td
                      className={player.isHighestSaves ? styles.highlight : ""}
                    >
                      {player.averageSaves}
                    </td>
                    <td
                      className={
                        player.isHighestKnockouts ? styles.highlight : ""
                      }
                    >
                      {player.averageKnockouts}
                    </td>
                    <td
                      className={player.isHighestDamage ? styles.highlight : ""}
                    >
                      {player.averageDamage}
                    </td>
                    <td
                      className={player.isHighestShots ? styles.highlight : ""}
                    >
                      {player.averageShots}
                    </td>
                    <td
                      className={
                        player.isHighestRedirects ? styles.highlight : ""
                      }
                    >
                      {player.averageRedirects}
                    </td>
                    <td
                      className={player.isHighestOrbs ? styles.highlight : ""}
                    >
                      {player.averageOrbs}
                    </td>
                  </tr>
                )}
              </>
            ))}
        </tbody>
      </table>
      <h3>Average Stats Per Match, Goalie</h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Matches Played</th>
            <th>Avg Goals</th>
            <th>Avg Assists</th>
            <th>Avg Saves</th>
            <th>Avg KOs</th>
            <th>Avg Damage</th>
            <th>Avg Shots</th>
            <th>Avg Redirects</th>
            <th>Avg Orbs</th>
          </tr>
        </thead>
        <tbody>
          {goalieStats &&
            goalieStats.map((player: any, index: number) => (
              <>
                {player.matchesPlayed > 0 && (
                  <tr key={index}>
                    <td>{player.name}</td>
                    <td>{player.matchesPlayed}</td>
                    <td
                      className={player.isHighestGoals ? styles.highlight : ""}
                    >
                      {player.averageGoals}
                    </td>
                    <td
                      className={
                        player.isHighestAssists ? styles.highlight : ""
                      }
                    >
                      {player.averageAssists}
                    </td>
                    <td
                      className={player.isHighestSaves ? styles.highlight : ""}
                    >
                      {player.averageSaves}
                    </td>
                    <td
                      className={
                        player.isHighestKnockouts ? styles.highlight : ""
                      }
                    >
                      {player.averageKnockouts}
                    </td>
                    <td
                      className={player.isHighestDamage ? styles.highlight : ""}
                    >
                      {player.averageDamage}
                    </td>
                    <td
                      className={player.isHighestShots ? styles.highlight : ""}
                    >
                      {player.averageShots}
                    </td>
                    <td
                      className={
                        player.isHighestRedirects ? styles.highlight : ""
                      }
                    >
                      {player.averageRedirects}
                    </td>
                    <td
                      className={player.isHighestOrbs ? styles.highlight : ""}
                    >
                      {player.averageOrbs}
                    </td>
                  </tr>
                )}
              </>
            ))}
        </tbody>
      </table>
    </div>
  );
}
