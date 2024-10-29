import styles from "../../main.module.scss";
import { db } from "@/util/db/db";
import NavigationBar from "@/components/NavigationBar";
import { STRIKER_IMAGES } from "@/constants/strikers";
import BackButton from "@/components/BackButton";

export const revalidate = 1;

export default async function PlayerDetails({
  params,
}: {
  params: { playerId: string };
}) {
  if (params.playerId === null) {
    return <>Could not find player with that id.</>;
  }

  const playerSearch = await db(
    `
        WITH player_matches AS (
          -- Retrieve the relevant data for each match played by the player
          SELECT
              mp."playerId",
              mp."striker",
              mp."teamNumber",
              mp."wasGoalie",
              mp."statGoals",
              mp."statAssists",
              mp."statSaves",
              mp."statKnockouts",
              mp."statDamage",
              mp."statShots",
              mp."statRedirects",
              mp."statOrbs",
              m."map",
              m."id" AS "matchId",
              m."team1Won",
              CASE 
                  WHEN mp."teamNumber" = 1 AND m."team1Won" = true THEN 'Win'
                  WHEN mp."teamNumber" = 2 AND m."team1Won" = false THEN 'Win'
                  ELSE 'Loss' 
              END AS "matchResult"
          FROM "MatchPlayer" mp
          JOIN "Match" m ON mp."matchId" = m."id"
          WHERE mp."playerId" = $1 -- Player ID
          AND mp."deletedAt" IS NULL
      ),
      player_stats AS (
          -- Calculate overall stats (win rate, wins, losses)
          SELECT
              COUNT(*) AS "totalMatches",
              SUM(CASE WHEN "matchResult" = 'Win' THEN 1 ELSE 0 END) AS "totalWins",
              SUM(CASE WHEN "matchResult" = 'Loss' THEN 1 ELSE 0 END) AS "totalLosses",
              ROUND(
                  (SUM(CASE WHEN "matchResult" = 'Win' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
              ) AS "winRate"
          FROM player_matches
      ),
      striker_stats AS (
          -- Calculate top strikers by win rate and count of times played, including averages per striker
          SELECT
              mp."striker",
              COUNT(*) AS "timesPlayed",
              SUM(CASE WHEN mp."matchResult" = 'Win' THEN 1 ELSE 0 END) AS "wins",
              ROUND((SUM(CASE WHEN mp."matchResult" = 'Win' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) AS "winRate",
              ROUND(AVG(mp."statGoals")::numeric, 2) AS "averageGoals",
              ROUND(AVG(mp."statAssists")::numeric, 2) AS "averageAssists",
              ROUND(AVG(mp."statSaves")::numeric, 2) AS "averageSaves",
              ROUND(AVG(mp."statKnockouts")::numeric, 2) AS "averageKnockouts",
              ROUND(AVG(mp."statDamage")::numeric, 2) AS "averageDamage",
              ROUND(AVG(mp."statDamage")::numeric / NULLIF(AVG(mp."statKnockouts")::numeric, 0), 2) as "averageDamagePerKnockout",
              ROUND(AVG(mp."statShots")::numeric, 2) AS "averageShots",
              ROUND(AVG(mp."statRedirects")::numeric, 2) AS "averageRedirects",
              ROUND(AVG(mp."statOrbs")::numeric, 2) AS "averageOrbs"
          FROM player_matches mp
          GROUP BY mp."striker"
          ORDER BY "winRate" DESC, "timesPlayed" DESC
      ),
      map_stats AS (
          -- Calculate top maps by win rate
          SELECT
              pm."map", -- Use correct alias from player_matches
              COUNT(*) AS "matchesPlayed",
              SUM(CASE WHEN pm."matchResult" = 'Win' THEN 1 ELSE 0 END) AS "wins",
              ROUND(
                  (SUM(CASE WHEN pm."matchResult" = 'Win' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
              ) AS "winRate"
          FROM player_matches pm -- Correct alias
          GROUP BY pm."map"
          ORDER BY "winRate" DESC
      )
  -- First, join the player_stats to get total matches and overall stats
  SELECT
      p.id,
      p.name,
      ps."totalMatches",
      ps."totalWins",
      ps."totalLosses",
      ps."winRate",
      -- Aggregate the top strikers using json_agg()
      (SELECT json_agg(
          json_build_object(
              'striker', ss."striker",
              'timesPlayed', ss."timesPlayed",
              'wins', ss."wins",
              'winRate', ss."winRate",
              'averageGoals', ss."averageGoals",
              'averageAssists', ss."averageAssists",
              'averageSaves', ss."averageSaves",
              'averageKnockouts', ss."averageKnockouts",
              'averageDamage', ss."averageDamage",
              'averageDamagePerKnockout', ss."averageDamagePerKnockout",
              'averageShots', ss."averageShots",
              'averageRedirects', ss."averageRedirects",
              'averageOrbs', ss."averageOrbs"
          )
      ) FROM striker_stats ss) AS "topStrikers",
      -- Aggregate the top maps using json_agg()
      (SELECT json_agg(
          json_build_object(
              'map', ms."map",
              'matchesPlayed', ms."matchesPlayed",
              'wins', ms."wins",
              'winRate', ms."winRate"
          )
      ) FROM map_stats ms) AS "topMaps"
  FROM player_stats ps
  JOIN "Player" p ON p.id = $1 -- Ensure you pass the player ID
  GROUP BY ps."totalMatches", ps."totalWins", ps."totalLosses", ps."winRate", p.id;
      `,
    [params.playerId]
  );

  if (playerSearch.length != 1) {
    return <>Could not find player with that id.</>;
  }

  const player = playerSearch[0];

  // console.log(player);

  const playerStatsPerSearch = await db(
    `
      WITH player_match_stats AS (
        -- Retrieve all relevant stats for each match played by the player, and calculate sets played
        SELECT
            mp."playerId",
            mp."statGoals",
            mp."statAssists",
            mp."statSaves",
            mp."statKnockouts",
            mp."statDamage",
            mp."statShots",
            mp."statRedirects",
            mp."statOrbs",
            (m."team1Score" + m."team2Score") AS "setsPlayed" -- Calculate sets played as the sum of the scores
        FROM "MatchPlayer" mp
        JOIN "Match" m ON mp."matchId" = m."id"
        WHERE mp."playerId" = $1 -- Player ID
        AND mp."deletedAt" IS NULL
    )
    SELECT
        -- Total number of matches and sets played
        COUNT(*) AS "totalMatches",
        SUM(mp."setsPlayed") AS "totalSetsPlayed",

        -- Averages per match
        ROUND(AVG(mp."statGoals")::numeric, 2) AS "averageGoalsPerMatch",
        ROUND(AVG(mp."statAssists")::numeric, 2) AS "averageAssistsPerMatch",
        ROUND(AVG(mp."statSaves")::numeric, 2) AS "averageSavesPerMatch",
        ROUND(AVG(mp."statKnockouts")::numeric, 2) AS "averageKnockoutsPerMatch",
        ROUND(AVG(mp."statDamage")::numeric, 2) AS "averageDamagePerMatch",
        ROUND(AVG(mp."statShots")::numeric, 2) AS "averageShotsPerMatch",
        ROUND(AVG(mp."statRedirects")::numeric, 2) AS "averageRedirectsPerMatch",
        ROUND(AVG(mp."statOrbs")::numeric, 2) AS "averageOrbsPerMatch",

        -- Averages per set
        ROUND(SUM(mp."statGoals")::numeric / SUM(mp."setsPlayed"), 2) AS "averageGoalsPerSet",
        ROUND(SUM(mp."statAssists")::numeric / SUM(mp."setsPlayed"), 2) AS "averageAssistsPerSet",
        ROUND(SUM(mp."statSaves")::numeric / SUM(mp."setsPlayed"), 2) AS "averageSavesPerSet",
        ROUND(SUM(mp."statKnockouts")::numeric / SUM(mp."setsPlayed"), 2) AS "averageKnockoutsPerSet",
        ROUND(SUM(mp."statDamage")::numeric / SUM(mp."setsPlayed"), 2) AS "averageDamagePerSet",
        ROUND(SUM(mp."statShots")::numeric / SUM(mp."setsPlayed"), 2) AS "averageShotsPerSet",
        ROUND(SUM(mp."statRedirects")::numeric / SUM(mp."setsPlayed"), 2) AS "averageRedirectsPerSet",
        ROUND(SUM(mp."statOrbs")::numeric / SUM(mp."setsPlayed"), 2) AS "averageOrbsPerSet"
    FROM player_match_stats mp;
    `,
    [player.id]
  );

  const playerMapStrikers = await db(
    `
      WITH player_matches AS (
        SELECT
            mp."playerId",
            mp."striker",
            m."map",
            CASE 
                WHEN mp."teamNumber" = 1 AND m."team1Won" = TRUE THEN 'Win'
                WHEN mp."teamNumber" = 2 AND m."team1Won" = FALSE THEN 'Win'
                ELSE 'Loss' 
            END AS "matchResult"
        FROM "MatchPlayer" mp
        JOIN "Match" m ON mp."matchId" = m."id"
        WHERE mp."playerId" = $1
        AND mp."deletedAt" IS NULL
      )
      SELECT 
        "map",
        "matchResult",
        "striker",
        COUNT(*) AS "count"
      FROM player_matches
      GROUP BY "map", "matchResult", "striker"
      ORDER BY "map", "matchResult", "count" DESC;
    `,
    [params.playerId]
  );

  const mapStrikers = Object.entries(
    playerMapStrikers.reduce((acc, curr) => {
      const mapName = curr.map;
      const matchResult = curr.matchResult;
      const striker = curr.striker;
      const count = curr.count;

      if (!acc[mapName]) acc[mapName] = { Wins: [], Losses: [] };
      acc[mapName][matchResult === "Win" ? "Wins" : "Losses"].push({
        striker,
        count,
      });
      return acc;
    }, {})
  );
  // console.log(mapStrikers);

  const playerStatsPerMinuteResults = await db(
    `
      WITH player_match_stats AS (
        -- Retrieve relevant stats per match, ensuring non-zero duration
        SELECT
            mp."statGoals",
            mp."statAssists",
            mp."statSaves",
            mp."statKnockouts",
            mp."statDamage",
            mp."statShots",
            mp."statRedirects",
            mp."statOrbs",
            COALESCE(m."duration", 0) AS "duration"
        FROM "MatchPlayer" mp
        JOIN "Match" m ON mp."matchId" = m."id"
        WHERE mp."playerId" = $1
        AND mp."deletedAt" IS NULL
        AND m."duration" > 0 -- Only include matches with duration > 0
      )
      SELECT
        -- Calculate each stat per minute by dividing the total stat by total minutes
        ROUND(SUM(mp."statGoals")::numeric / NULLIF(SUM(mp."duration") / 60, 0), 2) AS "goalsPerMinute",
        ROUND(SUM(mp."statAssists")::numeric / NULLIF(SUM(mp."duration") / 60, 0), 2) AS "assistsPerMinute",
        ROUND(SUM(mp."statSaves")::numeric / NULLIF(SUM(mp."duration") / 60, 0), 2) AS "savesPerMinute",
        ROUND(SUM(mp."statKnockouts")::numeric / NULLIF(SUM(mp."duration") / 60, 0), 2) AS "knockoutsPerMinute",
        ROUND(SUM(mp."statDamage")::numeric / NULLIF(SUM(mp."duration") / 60, 0), 2) AS "damagePerMinute",
        ROUND(SUM(mp."statShots")::numeric / NULLIF(SUM(mp."duration") / 60, 0), 2) AS "shotsPerMinute",
        ROUND(SUM(mp."statRedirects")::numeric / NULLIF(SUM(mp."duration") / 60, 0), 2) AS "redirectsPerMinute",
        ROUND(SUM(mp."statOrbs")::numeric / NULLIF(SUM(mp."duration") / 60, 0), 2) AS "orbsPerMinute"
      FROM player_match_stats mp;
    `,
    [player.id]
  );

  const playerStatsPerMinute = playerStatsPerMinuteResults[0];

  const playerStats = playerStatsPerSearch[0];

  const playerRoleStats = await db(
    `
      SELECT
          SUM(CASE WHEN mp."wasGoalie" = true THEN 1 ELSE 0 END) AS "timesPlayedGoalie",
          SUM(CASE WHEN mp."wasGoalie" = false THEN 1 ELSE 0 END) AS "timesPlayedForward"
      FROM "MatchPlayer" mp
      WHERE mp."playerId" = $1 -- Player ID
      AND mp."deletedAt" IS NULL;
    `,
    [player.id]
  );
  // console.log(playerStats);
  // console.log(playerRoleStats);

  return (
    <div className={styles.main}>
      <NavigationBar />
      <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
        <BackButton to={"/players"} text={"All players"} />
        <h1>{player.name}</h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          Winrate: {player.winRate}% - {player.totalWins} W {player.totalLosses}{" "}
          L
        </div>
        <div>Matches played: {player.totalMatches}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h3>Strikers</h3>
        <div>
          <h6>Top Strikers</h6>
          <ol>
            {player.topStrikers &&
              player.topStrikers.map((striker: any) => {
                return (
                  <li key={striker.striker}>
                    <img
                      width={32}
                      src={
                        // @ts-ignore
                        "/strikers/" + STRIKER_IMAGES[striker.striker as string]
                      }
                      style={{ marginRight: "8px" }}
                    ></img>
                    {striker.striker}. Played {striker.timesPlayed} times,{" "}
                    {striker.wins} wins, {striker.winRate}% Winrate
                  </li>
                );
              })}
          </ol>
        </div>

        {playerRoleStats && (
          <div>
            <div>Played forward: {playerRoleStats[0].timesPlayedForward}</div>
            <div>Played goalie: {playerRoleStats[0].timesPlayedGoalie}</div>
          </div>
        )}
      </div>
      {playerMapStrikers && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h3>Maps</h3>
          <table>
            <tbody>
              <tr>
                <th>Map</th>
                <th>Winrate</th>
                <th>Matches</th>
                <th>Wins</th>
                <th>Strikers - Wins</th>
                <th>Strikers - Losses</th>
              </tr>

              {player.topMaps &&
                player.topMaps.map((map: any) => {
                  const mapStrikerData = mapStrikers.find(
                    ([mapName]) => mapName === map.map
                  );
                  const { Wins = [], Losses = [] } = mapStrikerData
                    ? mapStrikerData[1]
                    : {};

                  return (
                    <tr key={map.map}>
                      <td>{map.map}</td>
                      <td>{map.winRate}%</td>
                      <td>{map.matchesPlayed}</td>
                      <td>{map.wins}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {Wins.length > 0 ? (
                            Wins.map(
                              (
                                {
                                  striker,
                                  count,
                                }: { striker: any; count: number },
                                index: number
                              ) => (
                                <div
                                  key={index}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                  }}
                                >
                                  <img
                                    width={32}
                                    // @ts-ignore
                                    src={`/strikers/${STRIKER_IMAGES[striker]}`}
                                    alt={striker}
                                    style={{ borderRadius: "4px" }}
                                  />
                                  <span style={{ fontSize: "12px" }}>
                                    {count}x
                                  </span>
                                </div>
                              )
                            )
                          ) : (
                            <p>N/A</p>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          {Losses.length > 0 ? (
                            Losses.map(
                              (
                                {
                                  striker,
                                  count,
                                }: { striker: any; count: number },
                                index: number
                              ) => (
                                <div
                                  key={index}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                  }}
                                >
                                  <img
                                    width={32}
                                    // @ts-ignore
                                    src={`/strikers/${STRIKER_IMAGES[striker]}`}
                                    alt={striker}
                                    style={{ borderRadius: "4px" }}
                                  />
                                  <span style={{ fontSize: "12px" }}>
                                    {count}x
                                  </span>
                                </div>
                              )
                            )
                          ) : (
                            <p>N/A</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h3>Statistics</h3>
        {playerStats && (
          <div>
            <table>
              <tbody>
                <tr>
                  <th>Format</th>
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
                <tr>
                  <td>Average per match</td>
                  <td>{playerStats.averageGoalsPerMatch}</td>
                  <td>{playerStats.averageAssistsPerMatch}</td>
                  <td>{playerStats.averageSavesPerMatch}</td>
                  <td>{playerStats.averageKnockoutsPerMatch}</td>
                  <td>{Math.round(playerStats.averageDamagePerMatch)}</td>
                  <td>
                    {Math.round(
                      playerStats.averageDamagePerMatch /
                        playerStats.averageKnockoutsPerMatch
                    )}
                  </td>
                  <td>{playerStats.averageShotsPerMatch}</td>
                  <td>{playerStats.averageRedirectsPerMatch}</td>
                  <td>{playerStats.averageOrbsPerMatch}</td>
                </tr>
                <tr>
                  <td>Average per set</td>
                  <td>{playerStats.averageGoalsPerSet}</td>
                  <td>{playerStats.averageAssistsPerSet}</td>
                  <td>{playerStats.averageSavesPerSet}</td>
                  <td>{playerStats.averageKnockoutsPerSet}</td>
                  <td>{Math.round(playerStats.averageDamagePerSet)}</td>
                  <td>
                    {Math.round(
                      playerStats.averageDamagePerSet /
                        playerStats.averageKnockoutsPerSet
                    )}
                  </td>
                  <td>{playerStats.averageShotsPerSet}</td>
                  <td>{playerStats.averageRedirectsPerSet}</td>
                  <td>{playerStats.averageOrbsPerSet}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {playerStatsPerMinute && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h3>Statistics Per Minute</h3>
          <table>
            <tbody>
              <tr>
                <th>Goals</th>
                <th>Assists</th>
                <th>Saves</th>
                <th>KOs</th>
                <th>Damage</th>
                <th>Shots</th>
                <th>Redirects</th>
                <th>Orbs</th>
              </tr>
              <tr>
                <td>{playerStatsPerMinute.goalsPerMinute}</td>
                <td>{playerStatsPerMinute.assistsPerMinute}</td>
                <td>{playerStatsPerMinute.savesPerMinute}</td>
                <td>{playerStatsPerMinute.knockoutsPerMinute}</td>
                <td>{Math.round(playerStatsPerMinute.damagePerMinute)}</td>
                <td>{playerStatsPerMinute.shotsPerMinute}</td>
                <td>{playerStatsPerMinute.redirectsPerMinute}</td>
                <td>{playerStatsPerMinute.orbsPerMinute}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h3>Average Stats Per Striker</h3>
        <div>
          <table>
            <tbody>
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
              {player.topStrikers &&
                player.topStrikers.map((striker: any) => (
                  <tr key={striker.striker}>
                    <td>
                      <img
                        width={32}
                        // @ts-ignore
                        src={`/strikers/${STRIKER_IMAGES[striker.striker]}`}
                        style={{ marginRight: "4px" }}
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
      </div>
    </div>
  );
}
