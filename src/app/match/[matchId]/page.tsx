import styles from "../../main.module.scss";
import { db } from "@/util/db/db";
import NavigationBar from "@/components/NavigationBar";
import StrikerAvatar from "@/components/StrikerAvatar";
import { RANKS } from "@/constants/ranks";
import { getRankBalanceLabel } from "@/constants/rankBalance";
import SetTitle from "@/components/SetTitle";
import { AWAKENING_ICONS } from "@/constants/awakeningIcons";

export const revalidate = 1;

export default async function MatchDetails({
  params,
}: {
  params: { matchId: string };
}) {
  if (params.matchId === null) {
    return <>Could not find match with that id.</>;
  }

  // Player rows + match-level fields (legacy + auto-capture columns).
  const matchSearch = await db(
    `
      WITH match_players AS (
    SELECT
        mp."id" AS "matchPlayerId",
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
        mp."isMvp",
        mp."username",
        mp."updatedRating",
        mp."updatedTier",
        mp."previousTier",
        mp."ratingChange",
        p."name",
        m."map",
        m."mode",
        m."source",
        m."team1Score",
        m."team2Score",
        m."team1BanStriker",
        m."team2BanStriker",
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

  const match = matchSearch[0];
  const players = matchSearch;
  const isAuto = match.source === "auto_capture";

  // Per-set scores (auto-capture only) and per-player awakenings.
  const sets = await db(
    `SELECT "setNumber", "winningTeam", "team1Goals", "team2Goals"
     FROM "MatchSet" WHERE "matchId" = $1 ORDER BY "setNumber"`,
    [params.matchId]
  );
  const awakeningRows = await db(
    `SELECT a."matchPlayerId", a.name, a.type, a."pickOrder"
     FROM "MatchPlayerAwakening" a
     JOIN "MatchPlayer" mp ON a."matchPlayerId" = mp."id"
     WHERE mp."matchId" = $1
     ORDER BY a."pickOrder"`,
    [params.matchId]
  );
  const awakeningsByPlayer: Record<string, any[]> = {};
  for (const a of awakeningRows) {
    (awakeningsByPlayer[a.matchPlayerId] ||= []).push(a);
  }

  const options = { year: "numeric", month: "long", day: "numeric" } as const;
  const formattedDate = match.createdAt.toLocaleDateString("en-US", options);

  const legacyRank = (r: any) =>
    r !== null && r !== undefined && Number(r) > 0
      ? // @ts-ignore
        (RANKS[Math.round(r)] ?? null)
      : null;

  return (
    <>
      <NavigationBar />
      <SetTitle
        title={`${match.team1Score}-${match.team2Score} ${match.map} on ${formattedDate} - OS Tracker`}
      />
      <div className={styles.main}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span>
            Match: {match.map} on {formattedDate}
          </span>
          <span
            style={{
              fontSize: "0.5em",
              padding: "2px 10px",
              borderRadius: "999px",
              background: isAuto ? "#1f7a3f" : "#666",
              color: "white",
              verticalAlign: "middle",
            }}
          >
            {isAuto ? "Auto-captured" : "Manual"}
          </span>
        </h1>

        {/* Match summary */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", marginBottom: "1rem" }}>
          <div>
            <div>
              <strong>Score:</strong> {match.team1Score} – {match.team2Score}
            </div>
            <div>
              <strong>Map:</strong> {match.map}
            </div>
            {match.mode && (
              <div>
                <strong>Mode:</strong> {match.mode}
              </div>
            )}
            <div>
              <strong>Duration: </strong>
              {match.duration !== 0
                ? `${Math.floor(match.duration / 60)
                    .toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}:${(
                    match.duration % 60
                  ).toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false })}`
                : "Unknown"}
            </div>
          </div>

          {sets.length > 0 && (
            <div>
              <strong>Sets</strong>
              {sets.map((s: any) => (
                <div key={s.setNumber}>
                  Set {s.setNumber}: {s.team1Goals}–{s.team2Goals}
                  {s.winningTeam ? ` (Team ${s.winningTeam})` : ""}
                </div>
              ))}
            </div>
          )}

          {(match.team1BanStriker || match.team2BanStriker) && (
            <div>
              <strong>Bans</strong>
              <div>Team 1: {match.team1BanStriker || "—"}</div>
              <div>Team 2: {match.team2BanStriker || "—"}</div>
            </div>
          )}
        </div>

        {/* Balance details (legacy manual ranks only) */}
        {match.team1_avg_rank || match.team2_avg_rank ? (
          <div className={styles.balanceInfo}>
            <h3>Match Balance Details</h3>
            {[
              ["Team 1", match.team1_avg_rank],
              ["Team 2", match.team2_avg_rank],
            ].map(([label, avg]: any) => {
              const rankObj = legacyRank(avg);
              return (
                <p key={label}>
                  <strong>{label} Avg Rank: </strong>{" "}
                  {rankObj ? (
                    <>
                      <img
                        src={`/rank_images/${rankObj.imagePath}`}
                        width={32}
                        style={{ marginRight: "8px" }}
                      />
                      {rankObj.name} ({Number(avg).toFixed(2)})
                    </>
                  ) : (
                    "N/A"
                  )}
                </p>
              );
            })}
            <p>
              <strong>Rank Difference: </strong>{" "}
              {match.rank_diff ? Number(match.rank_diff).toFixed(2) : "N/A"}
            </p>
            <p>
              <strong>Balance Level: </strong>
              {(match.rank_diff && getRankBalanceLabel(match.rank_diff)) ?? "Not enough data"}
            </p>
          </div>
        ) : null}

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
              <th>Rank / MMR</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player: any, index: number) => {
              const rankObj = legacyRank(player.rank);
              const awakenings = awakeningsByPlayer[player.matchPlayerId] || [];
              return (
                <>
                  <tr key={index}>
                    <td>{player.teamNumber}</td>
                    <td>
                      {player.name || player.username || "Anonymous"}
                      {player.isMvp && (
                        <span title="MVP" style={{ marginLeft: 6 }}>
                          ⭐
                        </span>
                      )}
                    </td>
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
                      {rankObj ? (
                        <>
                          <img
                            src={`/rank_images/${rankObj.imagePath}`}
                            width={32}
                            style={{ marginRight: "8px" }}
                          />
                          {rankObj.name}
                        </>
                      ) : player.updatedTier ? (
                        <>
                          {player.updatedTier}
                          {player.updatedRating ? ` (${Math.round(player.updatedRating)})` : ""}
                          {player.ratingChange
                            ? ` ${player.ratingChange > 0 ? "+" : ""}${Math.round(
                                player.ratingChange
                              )}`
                            : ""}
                        </>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  </tr>
                  {awakenings.length > 0 && (
                    <tr key={`${index}-awak`}>
                      <td></td>
                      <td colSpan={13} style={{ fontSize: "0.85em", color: "#888" }}>
                        <strong style={{ marginRight: 8 }}>Awakenings:</strong>
                        <span
                          style={{
                            display: "inline-flex",
                            gap: 12,
                            flexWrap: "wrap",
                            verticalAlign: "middle",
                          }}
                        >
                          {awakenings.map((a: any, i: number) => (
                            <span
                              key={i}
                              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                              title={a.name || undefined}
                            >
                              {AWAKENING_ICONS[a.name] && (
                                <img
                                  src={AWAKENING_ICONS[a.name]}
                                  width={22}
                                  height={22}
                                  style={{ borderRadius: 4 }}
                                  alt=""
                                />
                              )}
                              {a.name || "(unknown)"}
                            </span>
                          ))}
                        </span>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
