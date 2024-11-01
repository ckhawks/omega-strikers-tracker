import { db } from "@/util/db/db";
import { NextRequest, NextResponse } from "next/server";

// Helper function to calculate win rate
function calculateWinRate(totalMatches: number, totalWins: number): number {
  return totalMatches > 0 ? (totalWins / totalMatches) * 100 : 50; // 50% default if no data
}

export async function POST(request: NextRequest) {
  const { teamA, teamB } = await request.json();
  const params = [...teamA, ...teamB];

  console.log([...teamA, ...teamB]);

  // Solo Comparisons
  const soloStats = await db(
    `
    WITH solo_stats AS (
      SELECT 
          mp1."striker" AS "strikerA",
          mp1."wasGoalie" AS "roleA",
          mp2."striker" AS "strikerB",
          mp2."wasGoalie" AS "roleB",
          COUNT(*) AS "matchesPlayed",
          SUM(
              CASE 
                  WHEN (m."team1Won" = true AND mp1."teamNumber" = 1) OR 
                       (m."team1Won" = false AND mp1."teamNumber" = 2) THEN 1
                  ELSE 0 
              END
          ) AS "wins"
      FROM "MatchPlayer" mp1
      JOIN "MatchPlayer" mp2 
          ON mp1."matchId" = mp2."matchId" 
          AND mp1."teamNumber" != mp2."teamNumber"
          AND (
              -- Team A forwards: Strikers 1 and 2
              (mp1."striker" IN ($1, $2) AND mp1."wasGoalie" = false) 
              OR
              -- Team A goalie: Striker 3
              (mp1."striker" = $3 AND mp1."wasGoalie" = true)
          )
          AND (
              -- Team B forwards: Strikers 4 and 5
              (mp2."striker" IN ($4, $5) AND mp2."wasGoalie" = false) 
              OR
              -- Team B goalie: Striker 6
              (mp2."striker" = $6 AND mp2."wasGoalie" = true)
          )
      JOIN "Match" m ON mp1."matchId" = m."id"
      GROUP BY mp1."striker", mp1."wasGoalie", mp2."striker", mp2."wasGoalie"
    )
    SELECT * FROM solo_stats
    WHERE "matchesPlayed" > 0;
    `,
    [...teamA, ...teamB]
  );

  // Duo Comparisons
  // const duoStats = await db(
  //   `
  //   WITH duo_stats AS (
  //     SELECT
  //         LEAST(mp1."striker", mp2."striker") AS "striker1",
  //         GREATEST(mp1."striker", mp2."striker") AS "striker2",
  //         mp1."wasGoalie" AS "role1",
  //         mp2."wasGoalie" AS "role2",
  //         COUNT(*) AS "matchesPlayed",
  //         SUM(
  //             CASE
  //                 WHEN m."team1Won" = true AND mp1."teamNumber" = 1 THEN 1
  //                 WHEN m."team1Won" = false AND mp1."teamNumber" = 2 THEN 1
  //                 ELSE 0
  //             END
  //         ) AS "wins"
  //     FROM "MatchPlayer" mp1
  //     JOIN "MatchPlayer" mp2
  //         ON mp1."matchId" = mp2."matchId"
  //         AND mp1."teamNumber" = mp2."teamNumber"
  //         AND COALESCE(mp1."playerId"::text, '-1') IS DISTINCT FROM COALESCE(mp2."playerId"::text, '-1')
  //         AND mp1."striker" IN ($1, $2, $3)     -- Only strikers from Team A
  //         AND mp2."striker" IN ($4, $5, $6)     -- Only strikers from Team B
  //         AND mp1."wasGoalie" = false           -- Forward from Team A
  //         AND mp2."wasGoalie" = true            -- Goalie from Team B
  //     JOIN "Match" m ON mp1."matchId" = m."id"
  //     GROUP BY "striker1", "striker2", mp1."wasGoalie", mp2."wasGoalie"
  //   )
  //   SELECT * FROM duo_stats
  //   `,
  //   [...teamA, ...teamB]
  // );

  // // Trio Comparisons
  // const trioStats = await db(
  //   `
  //   WITH trio_stats AS (
  //     SELECT
  //         LEAST(mp1."striker", mp2."striker", mp3."striker") AS "striker1",
  //         GREATEST(LEAST(mp1."striker", mp2."striker"), mp3."striker") AS "striker2",
  //         GREATEST(mp1."striker", mp2."striker", mp3."striker") AS "striker3",
  //         mp1."wasGoalie" AS "role1",
  //         mp2."wasGoalie" AS "role2",
  //         mp3."wasGoalie" AS "role3",
  //         COUNT(*) AS "matchesPlayed",
  //         SUM(
  //             CASE
  //                 WHEN (m."team1Won" = true AND mp1."teamNumber" = 1) OR
  //                      (m."team1Won" = false AND mp1."teamNumber" = 2) THEN 1
  //                 ELSE 0
  //             END
  //         ) AS "wins"
  //     FROM "MatchPlayer" mp1
  //     JOIN "MatchPlayer" mp2
  //         ON mp1."matchId" = mp2."matchId"
  //         AND mp1."teamNumber" = mp2."teamNumber"
  //         AND COALESCE(mp1."playerId"::text, '-1') IS DISTINCT FROM COALESCE(mp2."playerId"::text, '-1')
  //         AND mp1."striker" IN ($1, $2, $3)     -- Team A strikers
  //         AND mp2."striker" IN ($4, $5, $6)     -- Team B strikers
  //     JOIN "MatchPlayer" mp3
  //         ON mp1."matchId" = mp3."matchId"
  //         AND mp1."teamNumber" = mp3."teamNumber"
  //         AND COALESCE(mp1."playerId"::text, '-1') IS DISTINCT FROM COALESCE(mp3."playerId"::text, '-1')
  //         AND COALESCE(mp2."playerId"::text, '-1') IS DISTINCT FROM COALESCE(mp3."playerId"::text, '-1')
  //         AND mp3."striker" IN ($1, $2, $3, $4, $5, $6)
  //     JOIN "Match" m ON mp1."matchId" = m."id"
  //     GROUP BY "striker1", "striker2", "striker3", mp1."wasGoalie", mp2."wasGoalie", mp3."wasGoalie"
  //   )
  //   SELECT * FROM trio_stats
  //   `,
  //   [...teamA, ...teamB]
  // );

  // Win Rate Calculation
  let totalMatches = 0;
  let totalWins = 0;

  // Solo calculations
  soloStats.forEach(({ matchesPlayed, wins }) => {
    totalMatches += Number(matchesPlayed);
    totalWins += Number(wins);
  });

  // Duo calculations
  // duoStats.forEach(({ matchesPlayed, wins }) => {
  //   totalMatches += Number(matchesPlayed);
  //   totalWins += Number(wins);
  // });

  // Trio calculations
  // trioStats.forEach(({ matchesPlayed, wins }) => {
  //   totalMatches += Number(matchesPlayed);
  //   totalWins += Number(wins);
  // });

  // Calculate average win rate based on solo, duo, and trio matchups
  const winRate = calculateWinRate(totalMatches, totalWins);

  return NextResponse.json({ winRate: winRate.toFixed(2) });
}
