import styles from "../../main.module.scss";
import { db } from "@/util/db/db";
import NavigationBar from "@/components/NavigationBar";
import StrikerAvatar from "@/components/StrikerAvatar";
import { RANKS } from "@/constants/ranks";
import { getRankBalanceLabel } from "@/constants/rankBalance";

export const revalidate = 1;

export default async function MatchDetails({
  params,
}: {
  params: { matchId: string };
}) {
  if (params.matchId === null) {
    return <>Could not find match with that id.</>;
  }

  // Query to get the match details including player stats for that match
  const matchSearch = await db(
    `
      WITH match_players AS (
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
        mp."rank",
        p."name",
        m."map",
        m."team1Score",
        m."team2Score",
        m."createdAt",
        m."duration"
    FROM "MatchPlayer" mp
    LEFT JOIN "Player" p ON mp."playerId" = p."id"
    JOIN "Match" m ON mp."matchId" = m."id"
    WHERE mp."matchId" = $1
      AND mp."deletedAt" IS NULL
    ORDER BY mp."teamNumber"
),
team_ranks AS (
    SELECT
        "teamNumber",
        AVG(CASE WHEN "rank" > 0 THEN "rank" END) AS avg_rank,
        COUNT(CASE WHEN "rank" > 0 THEN 1 END) AS ranked_players
    FROM match_players
    GROUP BY "teamNumber"
),
rank_comparison AS (
    SELECT
        MIN(avg_rank) FILTER (WHERE "teamNumber" = 1) AS team1_avg_rank,
        MIN(avg_rank) FILTER (WHERE "teamNumber" = 2) AS team2_avg_rank,
        COALESCE(SUM(ranked_players), 0) AS total_ranked_players,
        CASE 
            WHEN COALESCE(SUM(ranked_players), 0) < 3 THEN NULL
            ELSE ABS(MIN(avg_rank) FILTER (WHERE "teamNumber" = 1) - MIN(avg_rank) FILTER (WHERE "teamNumber" = 2))
        END AS rank_diff
    FROM team_ranks
)
SELECT 
    mp.*,
    team_ranks.avg_rank AS team_avg_rank,
    rank_comparison.total_ranked_players AS ranked_players,
    rank_comparison.team1_avg_rank,
    rank_comparison.team2_avg_rank,
    rank_comparison.rank_diff
FROM match_players mp
JOIN team_ranks ON mp."teamNumber" = team_ranks."teamNumber"
JOIN rank_comparison ON true
ORDER BY mp."teamNumber";




    `,
    [params.matchId]
  );

  if (matchSearch.length === 0) {
    return <>Could not find match with that id.</>;
  }

  const match = matchSearch[0]; // Assuming all rows contain the same map and team score info
  const players = matchSearch; // List of players and their stats

  const options = { year: "numeric", month: "long", day: "numeric" };
  const formattedDate = match.createdAt.toLocaleDateString("en-US", options);

  return (
    <div className={styles.main}>
      <NavigationBar />
      {/* <h1>Match Details</h1> */}
      <h1>
        Match: {match.map} on {formattedDate}
      </h1>
      {/* Display balance details */}
      <div className={styles.balanceInfo}>
        <h3>Match Balance Details</h3>
        <p>
          <strong>Team 1 Avg Rank: </strong>{" "}
          {match.team1_avg_rank ? (
            <>
              <img
                src={`/rank_images/${
                  // @ts-ignore
                  RANKS[Math.round(match.team1_avg_rank)].imagePath
                }`}
                width={32}
                style={{ marginRight: "8px" }}
              />
              {
                // @ts-ignore
                RANKS[Math.round(match.team1_avg_rank)].name ?? "N/A"
              }{" "}
              ({Number(match.team1_avg_rank).toFixed(2)})
            </>
          ) : (
            "N/A"
          )}
        </p>
        <p>
          <strong>Team 2 Avg Rank: </strong>{" "}
          {match.team2_avg_rank ? (
            <>
              <img
                src={`/rank_images/${
                  // @ts-ignore
                  RANKS[Math.round(match.team2_avg_rank)].imagePath
                }`}
                width={32}
                style={{ marginRight: "8px" }}
              />
              {
                // @ts-ignore
                RANKS[Math.round(match.team2_avg_rank)].name ?? "N/A"
              }{" "}
              ({Number(match.team2_avg_rank).toFixed(2)})
            </>
          ) : (
            "N/A"
          )}
        </p>
        <p>
          <strong>Rank Difference: </strong>{" "}
          {match.rank_diff ? Number(match.rank_diff).toFixed(2) : "N/A"}
        </p>
        <p>
          <strong>Balance Level: </strong>
          {(match.rank_diff && getRankBalanceLabel(match.rank_diff)) ??
            "Not enough data"}
        </p>
      </div>
      <div>
        {/* <div>
          <strong>Match ID:</strong> {params.matchId}
        </div> */}
        <div>
          <strong>Map:</strong> {match.map}
        </div>
        <div>
          <strong>Team 1 Score:</strong> {match.team1Score}
        </div>
        <div>
          <strong>Team 2 Score:</strong> {match.team2Score}
        </div>
        <div>
          <strong>Duration: </strong>
          {match.duration !== 0
            ? `${Math.floor(match.duration / 60)}:${match.duration % 60}`
            : "Unknown"}
        </div>
      </div>

      <h3>Player Stats</h3>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>Player</th>
            <th>Striker</th>
            <th>Role</th>
            <th>Goals</th>
            <th>Assists</th>
            <th>Saves</th>
            <th>KOs</th>
            <th>Damage</th>
            <th>Dmg per KO</th>
            <th>Shots</th>
            <th>Redirects</th>
            <th>Orbs</th>
            <th>Rank</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player: any, index: number) => (
            <tr key={index}>
              <td>{player.teamNumber}</td>
              <td>{player.name ? player.name : "Anonymous"}</td>

              <td>
                <StrikerAvatar striker={player.striker as string} />

                {player.striker}
              </td>
              <td>{player.wasGoalie ? "Goalie" : "Forward"}</td>
              <td>{player.statGoals}</td>
              <td>{player.statAssists}</td>
              <td>{player.statSaves}</td>
              <td>{player.statKnockouts}</td>
              <td>{player.statDamage}</td>
              <td>
                {isFinite(Math.round(player.statDamage / player.statKnockouts))
                  ? Math.round(player.statDamage / player.statKnockouts)
                  : "N/A"}
              </td>
              <td>{player.statShots}</td>
              <td>{player.statRedirects}</td>
              <td>{player.statOrbs}</td>
              <td>
                <img
                  src={`/rank_images/${
                    // @ts-ignore
                    RANKS[Math.round(player.rank)].imagePath
                  }`}
                  width={32}
                  style={{ marginRight: "8px" }}
                />
                {
                  // @ts-ignore
                  RANKS[Math.round(player.rank)].name ?? "N/A"
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
