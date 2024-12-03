import styles from "./main.module.scss";
import { db } from "../util/db/db";
import Link from "next/link";
import NavigationBar from "@/components/NavigationBar";
import { RANKS } from "@/constants/ranks";
import { RANK_BALANCE_RANGES } from "@/constants/rankBalance";

export const revalidate = 1;

export const metadata = {
  title: "Matches - OS Tracker",
};

export default async function Home() {
  const matches = await db(
    ` 
      WITH match_player_ranks AS (
    SELECT 
        m.id AS match_id,
        m."map",
        m."team1Won",
        m."team1Score",
        m."team2Score",
        m."createdAt",
        m."deletedAt",
        m."duration",
        mp."teamNumber",
        mp."rank",
        CASE 
            WHEN mp."rank" = 0 THEN NULL 
            ELSE mp."rank" 
        END AS valid_rank
    FROM "Match" m
    JOIN "MatchPlayer" mp ON m.id = mp."matchId"
),
match_ranks AS (
    SELECT 
        match_id,
        "map",
        "team1Won",
        "team1Score",
        "team2Score",
        "createdAt",
        "deletedAt",
        "duration",
        COUNT(valid_rank) AS ranked_player_count,
        AVG(valid_rank) AS avg_match_rank,
        AVG(CASE WHEN "teamNumber" = 1 THEN valid_rank END) AS team1_avg_rank,
        AVG(CASE WHEN "teamNumber" = 2 THEN valid_rank END) AS team2_avg_rank
    FROM match_player_ranks
    GROUP BY match_id, "map", "team1Won", "team1Score", "team2Score", "createdAt", "deletedAt", "duration"
)
SELECT 
    match_id AS id,
    "map",
    "team1Won",
    "team1Score",
    "team2Score",
    "createdAt",
    "deletedAt",
    "duration",
    avg_match_rank,
    ranked_player_count,
    CASE 
        WHEN ranked_player_count <= 3 THEN 'Not enough data'
        WHEN ABS(team1_avg_rank - team2_avg_rank) <= 0.34 THEN 'Perfectly Balanced'
        WHEN ABS(team1_avg_rank - team2_avg_rank) <= 1 THEN 'Slightly Uneven'
        WHEN ABS(team1_avg_rank - team2_avg_rank) <= 1.5 THEN 'Moderately Uneven'
        ELSE 'Very Uneven'
    END AS balance_level
FROM match_ranks
ORDER BY "createdAt" DESC;

    `,
    []
  );

  const matchRankData = await db(
    `
      WITH match_ranks AS (
    SELECT 
        m.id AS match_id,
        COUNT(CASE WHEN mp.rank > 0 THEN 1 END) AS ranked_players,
        COUNT(mp.rank) AS total_players,
        COUNT(CASE WHEN mp.rank = 0 THEN 1 END) AS unranked_players,
        AVG(CASE WHEN mp."teamNumber" = 1 AND mp.rank > 0 THEN mp.rank ELSE NULL END) AS team1_avg_rank,
        AVG(CASE WHEN mp."teamNumber" = 2 AND mp.rank > 0 THEN mp.rank ELSE NULL END) AS team2_avg_rank
    FROM "Match" m
    JOIN "MatchPlayer" mp ON m.id = mp."matchId"
    GROUP BY m.id
),
rank_availability AS (
    SELECT 
        COUNT(*) AS total_matches,
        COUNT(CASE WHEN ranked_players = 0 THEN 1 END) AS no_rank_data,
        COUNT(CASE WHEN ranked_players >= 3 AND ranked_players < total_players THEN 1 END) AS partial_rank_data,
        COUNT(CASE WHEN ranked_players = total_players THEN 1 END) AS complete_rank_data
    FROM match_ranks
),
rank_balance AS (
    SELECT 
        COUNT(*) AS total_balanced_matches,
        COUNT(CASE WHEN ABS(team1_avg_rank - team2_avg_rank) <= 0.34 THEN 1 END) AS perfectly_balanced,
        COUNT(CASE WHEN ABS(team1_avg_rank - team2_avg_rank) BETWEEN 0.33 AND 1 THEN 1 END) AS slightly_uneven,
        COUNT(CASE WHEN ABS(team1_avg_rank - team2_avg_rank) BETWEEN 1 AND 1.5 THEN 1 END) AS moderately_uneven,
        COUNT(CASE WHEN ABS(team1_avg_rank - team2_avg_rank) > 1.5 THEN 1 END) AS highly_uneven
    FROM match_ranks
    WHERE ranked_players = total_players -- Only matches with complete rank data
)
SELECT 
    -- Data Availability
    no_rank_data * 100.0 / total_matches AS no_data_percent,
    partial_rank_data * 100.0 / total_matches AS partial_data_percent,
    complete_rank_data * 100.0 / total_matches AS complete_data_percent,
    -- Match Balance
    perfectly_balanced * 100.0 / total_balanced_matches AS perfectly_balanced_percent,
    slightly_uneven * 100.0 / total_balanced_matches AS slightly_uneven_percent,
    moderately_uneven * 100.0 / total_balanced_matches AS moderately_uneven_percent,
    highly_uneven * 100.0 / total_balanced_matches AS highly_uneven_percent
FROM rank_availability, rank_balance;



    `,
    []
  );

  const {
    no_data_percent,
    partial_data_percent,
    complete_data_percent,
    perfectly_balanced_percent,
    slightly_uneven_percent,
    moderately_uneven_percent,
    highly_uneven_percent,
  } = matchRankData[0];

  const winLossData = await db(
    `WITH match_player_ranks AS (
    SELECT 
        m.id AS match_id,
        m."team1Won",
        AVG(CASE WHEN mp."teamNumber" = 1 AND mp."rank" > 0 THEN mp."rank" END) AS team1_avg_rank,
        AVG(CASE WHEN mp."teamNumber" = 2 AND mp."rank" > 0 THEN mp."rank" END) AS team2_avg_rank
    FROM "Match" m
    JOIN "MatchPlayer" mp ON m.id = mp."matchId"
    WHERE mp."rank" > 0  -- Only consider players with valid ranks
    GROUP BY m.id, m."team1Won"
),
match_results AS (
    SELECT
        match_id,
        "team1Won",
        team1_avg_rank,
        team2_avg_rank,
        CASE 
            WHEN team1_avg_rank > team2_avg_rank THEN 'favored'
            WHEN team1_avg_rank < team2_avg_rank THEN 'underdog'
            ELSE 'balanced'
        END AS team1_status
    FROM match_player_ranks
),
win_loss_stats AS (
    SELECT
        team1_status,
        COUNT(*) AS total_matches,
        SUM(CASE WHEN "team1Won" = TRUE THEN 1 ELSE 0 END) AS team1_wins,
        SUM(CASE WHEN "team1Won" = FALSE THEN 1 ELSE 0 END) AS team1_losses
    FROM match_results
    WHERE team1_status IN ('favored', 'underdog')  -- Only interested in favored/underdog cases
    GROUP BY team1_status
)
SELECT 
    team1_status,
    total_matches,
    team1_wins * 100.0 / NULLIF(total_matches, 0) AS team1_win_percent,
    team1_losses * 100.0 / NULLIF(total_matches, 0) AS team1_loss_percent
FROM win_loss_stats;`,
    []
  );

  return (
    <>
      <NavigationBar />
      <div className={styles.main}>
        <h1>Match List</h1>
        <div className={styles.matchRankSummary}>
          <h3>Rank Data Availability</h3>
          <div className={styles.dataAvailability}>
            <div className={styles.availabilityItem}>
              <span className={styles.noDataBox}></span>
              <span>No Data: {Number(no_data_percent).toFixed(2)}%</span>
            </div>
            <div className={styles.availabilityItem}>
              <span className={styles.partialDataBox}></span>
              <span>
                Partial Data: {Number(partial_data_percent).toFixed(2)}%
              </span>
            </div>
            <div className={styles.availabilityItem}>
              <span className={styles.completeDataBox}></span>
              <span>
                Complete Data: {Number(complete_data_percent).toFixed(2)}%
              </span>
            </div>
          </div>
          <br />
          <h3>Match Balance for Ranked Matches</h3>
          <div className={styles.matchBalance}>
            {RANK_BALANCE_RANGES.map((range, index) => {
              const percentage = (() => {
                switch (range.label) {
                  case "Perfectly Balanced":
                    return Number(perfectly_balanced_percent).toFixed(2);
                  case "Slightly Uneven":
                    return Number(slightly_uneven_percent).toFixed(2);
                  case "Moderately Uneven":
                    return Number(moderately_uneven_percent).toFixed(2);
                  case "Very Uneven":
                    return Number(highly_uneven_percent).toFixed(2);
                  default:
                    return "0.00";
                }
              })();

              const className = (() => {
                switch (range.label) {
                  case "Perfectly Balanced":
                    return styles.perfectBalanceBox;
                  case "Slightly Uneven":
                    return styles.slightlyUnevenBox;
                  case "Moderately Uneven":
                    return styles.moderatelyUnevenBox;
                  case "Very Uneven":
                    return styles.highlyUnevenBox;
                  default:
                    return "";
                }
              })();

              return (
                <div className={styles.balanceItem} key={index}>
                  <span className={className}></span>
                  <span>
                    {range.label}: {percentage}% (team ranks differ by{" "}
                    {range.min} -{" "}
                    {range.max === Infinity ? "more than 3" : range.max})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2>Team 1 Performance by Favorability</h2>
          <p>Based on rank</p>

          <div className={styles.performanceStats}>
            {winLossData.map((data, index) => (
              <div key={index} className={styles.performanceCard}>
                <h3>
                  {data.team1_status === "favored"
                    ? "Favored Matches"
                    : "Underdog Matches"}
                </h3>
                <p>
                  <strong>Total Matches:</strong> {data.total_matches}
                </p>
                <p>
                  <strong>Win Percentage:</strong>{" "}
                  {Number(data.team1_win_percent)?.toFixed(2)}%
                </p>
                <p>
                  <strong>Loss Percentage:</strong>{" "}
                  {Number(data.team1_loss_percent)?.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          {matches &&
            matches.map((match, index) => {
              return (
                <div key={match.id} className={styles["match-item"]}>
                  <span>Match {matches.length - index}</span>
                  <b>{match.map}</b>
                  <span>
                    {match.team1Score} - {match.team2Score}
                  </span>
                  <span>
                    {match.duration !== 0
                      ? `${Math.floor(match.duration / 60).toLocaleString(
                          "en-US",
                          { minimumIntegerDigits: 2, useGrouping: false }
                        )}:${(match.duration % 60).toLocaleString("en-US", {
                          minimumIntegerDigits: 2,
                          useGrouping: false,
                        })}`
                      : "Unknown"}
                  </span>
                  {match.createdAt.toString()}
                  <span>
                    {match.avg_match_rank ? (
                      <img
                        src={`/rank_images/${
                          // @ts-ignore
                          RANKS[Math.round(match.avg_match_rank)].imagePath
                        }`}
                        width={32}
                        style={{ marginRight: "8px" }}
                      />
                    ) : (
                      ""
                    )}
                    {
                      // @ts-ignore
                      RANKS[Math.round(match.avg_match_rank)].name ?? "N/A"
                    }
                  </span>
                  <span>{match.balance_level}</span>
                  {/* <p>
                  <strong>Average Rank:</strong>{" "}
                  {match.avg_match_rank
                    ? Number(match.avg_match_rank).toFixed(2)
                    : "N/A"}
                </p>
                <p>
                  <strong>Ranked Player Count:</strong>{" "}
                  {match.ranked_player_count}
                </p>
                <p>
                  <strong>Balance Level:</strong> {match.balance_level}
                </p> */}
                  <Link href={"/match/" + match.id}>View</Link>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
