import styles from "../../main.module.scss";
import { db } from "@/util/db/db";
import NavigationBar from "@/components/NavigationBar";
import StrikerAvatar from "@/components/StrikerAvatar";

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
        -- Retrieve the relevant stats for each player in the match
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
            p."name", -- Include player name
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
      )
      -- Fetch match stats and aggregate player stats
      SELECT
        mp."name",
        mp.striker,
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
        mp."map",
        mp."team1Score",
        mp."team2Score",
        mp."createdAt",
        mp."duration"
      FROM match_players mp
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

  console.log(match.duration);

  return (
    <div className={styles.main}>
      <NavigationBar />
      {/* <h1>Match Details</h1> */}
      <h1>
        Match: {match.map} on {formattedDate}
      </h1>
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
            <th>Player</th>
            <th>Striker</th>
            <th>Team</th>
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
          </tr>
        </thead>
        <tbody>
          {players.map((player: any, index: number) => (
            <tr key={index}>
              <td>{player.name ? player.name : "Anonymous"}</td>
              <td>
                <StrikerAvatar striker={player.striker as string} />

                {player.striker}
              </td>
              <td>{player.teamNumber}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
