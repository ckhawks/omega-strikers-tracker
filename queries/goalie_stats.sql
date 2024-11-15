WITH GoaliesMatches AS (
  -- Select all matches where each player was a goalie, the team they were on, and the opposing team number
  SELECT 
    mp.striker AS goalie,
    m.id AS match_id,
    mp."teamNumber" AS goalie_team,
    mp."statSaves" AS saves,  -- Include saves per match
    (m."team1Score" + m."team2Score") AS sets_in_match,  -- Total sets in this match
    CASE 
      WHEN mp."teamNumber" = 1 THEN 2
      WHEN mp."teamNumber" = 2 THEN 1
    END AS opponent_team,
    CASE 
      WHEN mp."teamNumber" = 1 AND m."team1Score" > m."team2Score" THEN 1  -- Win for team 1
      WHEN mp."teamNumber" = 2 AND m."team2Score" > m."team1Score" THEN 1  -- Win for team 2
      ELSE 0  -- Loss or tie
    END AS win
  FROM "Match" m
  JOIN "MatchPlayer" mp ON m.id = mp."matchId"
  WHERE mp."wasGoalie" = true  -- Only include goalies
),

OpponentGoals AS (
  -- Sum the goals scored by all players in the opposing team for each match
  SELECT 
    gm.goalie,
    gm.match_id,
    gm.win,
    gm.saves,  -- Pass saves to the next level
    gm.sets_in_match,  -- Pass sets to the next level
    SUM(mp."statGoals") AS goals_against
  FROM GoaliesMatches gm
  JOIN "MatchPlayer" mp ON gm.match_id = mp."matchId" AND gm.opponent_team = mp."teamNumber"
  GROUP BY gm.goalie, gm.match_id, gm.win, gm.saves, gm.sets_in_match
)

-- Calculate the average goals against, match count, win rate, average saves, and average sets per win/loss for each goalie
SELECT 
  goalie,
  ROUND(100.0 * SUM(win) / COUNT(match_id), 2) AS win_rate_percentage,  -- Calculate win rate as a percentage
  AVG(CASE WHEN win = 1 THEN sets_in_match END) AS average_sets_per_win,   -- Average sets per win
  AVG(CASE WHEN win = 0 THEN sets_in_match END) AS average_sets_per_loss,  -- Average sets per loss
  AVG(goals_against) AS avg_goals_against,  -- Average goals scored against the goalie
  AVG(saves) AS avg_saves,                  -- Average saves per match
  AVG(saves) / NULLIF(AVG(goals_against), 0) AS saves_per_goal,  -- Avoid division by zero
  COUNT(match_id) AS matches_played         -- Number of matches played
FROM OpponentGoals
GROUP BY goalie
HAVING COUNT(match_id) > 4  -- Filter goalies with more than 4 matches
ORDER BY "win_rate_percentage" DESC;
