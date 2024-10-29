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
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
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
            COALESCE(ROUND(AVG(mp."statDamage")::numeric / AVG(mp."statKnockouts")::numeric, 2), 0) as "averageDamagePerKnockout",
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
            WHEN ps."averageDamagePerKnockout" = MIN(ps."averageDamagePerKnockout") OVER () THEN TRUE ELSE FALSE 
          END AS "isLowestDamagePerKnockout",
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
            ROUND(AVG(mp."statDamage")::numeric, 0) AS "averageDamage",
            ROUND(AVG(mp."statDamage")::numeric / AVG(mp."statKnockouts")::numeric, 0) as "averageDamagePerKnockout",
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
            ps."averageDamagePerKnockout",
            ps."averageShots",
            ps."averageRedirects",
            ps."averageOrbs",
            -- Add CASE for highlighting the highest stat for each column
            CASE WHEN ps."averageGoals" = MAX(ps."averageGoals") OVER () THEN 'highest' ELSE '' END AS "isHighestGoals",
            CASE WHEN ps."averageAssists" = MAX(ps."averageAssists") OVER () THEN 'highest' ELSE '' END AS "isHighestAssists",
            CASE WHEN ps."averageSaves" = MAX(ps."averageSaves") OVER () THEN 'highest' ELSE '' END AS "isHighestSaves",
            CASE WHEN ps."averageKnockouts" = MAX(ps."averageKnockouts") OVER () THEN 'highest' ELSE '' END AS "isHighestKnockouts",
            CASE WHEN ps."averageDamage" = MAX(ps."averageDamage") OVER () THEN 'highest' ELSE '' END AS "isHighestDamage",
            CASE WHEN ps."averageDamagePerKnockout" = MIN(ps."averageDamagePerKnockout") OVER () THEN 'lowest' ELSE '' END AS "isLowestDamagePerKnockout",
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
            ps."averageDamagePerKnockout",
            ps."averageShots",
            ps."averageRedirects",
            ps."averageOrbs",
            -- Add CASE for highlighting the highest stat for each column
            CASE WHEN ps."averageGoals" = MAX(ps."averageGoals") OVER () THEN 'highest' ELSE '' END AS "isHighestGoals",
            CASE WHEN ps."averageAssists" = MAX(ps."averageAssists") OVER () THEN 'highest' ELSE '' END AS "isHighestAssists",
            CASE WHEN ps."averageSaves" = MAX(ps."averageSaves") OVER () THEN 'highest' ELSE '' END AS "isHighestSaves",
            CASE WHEN ps."averageKnockouts" = MAX(ps."averageKnockouts") OVER () THEN 'highest' ELSE '' END AS "isHighestKnockouts",
            CASE WHEN ps."averageDamage" = MAX(ps."averageDamage") OVER () THEN 'highest' ELSE '' END AS "isHighestDamage",
            CASE WHEN ps."averageDamagePerKnockout" = MIN(ps."averageDamagePerKnockout") OVER () THEN 'lowest' ELSE '' END AS "isLowestDamagePerKnockout",
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

  const perMinuteStats = await db(
    `
    WITH player_playtime AS (
      SELECT 
          p."id",
          p."name",
          COALESCE(SUM(m."duration") / 60.0, 0) AS "totalPlaytimeInMinutes"
      FROM "Player" p
      LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
      LEFT JOIN "Match" m ON mp."matchId" = m."id"
      WHERE p."deletedAt" IS NULL
      GROUP BY p."id", p."name"
  ),
  per_minute_stats AS (
      SELECT
          p."id",
          p."name",
          COALESCE(SUM(mp."statGoals") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "goalsPerMinute",
          COALESCE(SUM(mp."statAssists") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "assistsPerMinute",
          COALESCE(SUM(mp."statSaves") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "savesPerMinute",
          COALESCE(SUM(mp."statKnockouts") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "knockoutsPerMinute",
          COALESCE(SUM(mp."statDamage") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "damagePerMinute",
          COALESCE(SUM(mp."statShots") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "shotsPerMinute",
          COALESCE(SUM(mp."statRedirects") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "redirectsPerMinute",
          COALESCE(SUM(mp."statOrbs") / NULLIF(playtime."totalPlaytimeInMinutes", 0), 0) AS "orbsPerMinute"
      FROM "Player" p
      LEFT JOIN "MatchPlayer" mp ON p."id" = mp."playerId"
      LEFT JOIN player_playtime playtime ON p."id" = playtime."id"
      WHERE p."deletedAt" IS NULL
      GROUP BY p."id", p."name", playtime."totalPlaytimeInMinutes"
  ),
  highlighted_per_minute_stats AS (
      SELECT *,
          CASE WHEN "goalsPerMinute" = MAX("goalsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestGoalsPerMinute",
          CASE WHEN "assistsPerMinute" = MAX("assistsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestAssistsPerMinute",
          CASE WHEN "savesPerMinute" = MAX("savesPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestSavesPerMinute",
          CASE WHEN "knockoutsPerMinute" = MAX("knockoutsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestKnockoutsPerMinute",
          CASE WHEN "damagePerMinute" = MAX("damagePerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestDamagePerMinute",
          CASE WHEN "shotsPerMinute" = MAX("shotsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestShotsPerMinute",
          CASE WHEN "redirectsPerMinute" = MAX("redirectsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestRedirectsPerMinute",
          CASE WHEN "orbsPerMinute" = MAX("orbsPerMinute") OVER () THEN TRUE ELSE FALSE END AS "isHighestOrbsPerMinute"
      FROM per_minute_stats
  )
  SELECT * FROM highlighted_per_minute_stats
  ORDER BY "goalsPerMinute" DESC;
  
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
      <h3>Forward & Goalie</h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Matches</th>
            <th>Avg Goals</th>
            <th>Avg Assists</th>
            <th>Avg Saves</th>
            <th>Avg KOs</th>
            <th>Avg Damage</th>
            <th>Avg Dmg per KO</th>
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
                      {Math.round(player.averageDamage)}
                    </td>
                    <td
                      className={
                        player.isLowestDamagePerKnockout ? styles.highlight : ""
                      }
                    >
                      {/* {isFinite(player.averageDamagePerKnockout)
                        ? player.averageDamagePerKnockout
                        : "N/A"} */}
                      {Math.round(player.averageDamagePerKnockout)}
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
      <h3>Forward</h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Matches</th>
            <th>Avg Goals</th>
            <th>Avg Assists</th>
            <th>Avg Saves</th>
            <th>Avg KOs</th>
            <th>Avg Damage</th>
            <th>Avg Dmg per KO</th>
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
                      {Math.round(player.averageDamage)}
                    </td>
                    <td
                      className={
                        player.isLowestDamagePerKnockout ? styles.highlight : ""
                      }
                    >
                      {Math.round(player.averageDamagePerKnockout)}
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
      <h3>Goalie</h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Matches</th>
            <th>Avg Goals</th>
            <th>Avg Assists</th>
            <th>Avg Saves</th>
            <th>Avg KOs</th>
            <th>Avg Damage</th>
            <th>Avg Dmg per KO</th>
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
                      {Math.round(player.averageDamage)}
                    </td>
                    <td
                      className={
                        player.isLowestDamagePerKnockout ? styles.highlight : ""
                      }
                    >
                      {Math.round(player.averageDamagePerKnockout)}
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
      <h3>Per-Minute Stats</h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Goals/Min</th>
            <th>Assists/Min</th>
            <th>Saves/Min</th>
            <th>KOs/Min</th>
            <th>Damage/Min</th>
            <th>Shots/Min</th>
            <th>Redirects/Min</th>
            <th>Orbs/Min</th>
          </tr>
        </thead>
        <tbody>
          {perMinuteStats.map((player, index) => (
            <tr key={index}>
              <td>{player.name}</td>
              <td
                className={
                  player.isHighestGoalsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.goalsPerMinute).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestAssistsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.assistsPerMinute ?? 0).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestSavesPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.savesPerMinute ?? 0).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestKnockoutsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.knockoutsPerMinute ?? 0).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestDamagePerMinute ? styles.highlight : ""
                }
              >
                {Number(player.damagePerMinute ?? 0).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestShotsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.shotsPerMinute ?? 0).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestRedirectsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.redirectsPerMinute ?? 0).toFixed(2)}
              </td>
              <td
                className={
                  player.isHighestOrbsPerMinute ? styles.highlight : ""
                }
              >
                {Number(player.orbsPerMinute ?? 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>All-Time Stats</h3>
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
