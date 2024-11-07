import { db } from "@/util/db/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const enemyStriker = searchParams.get("enemyStriker");
  const selectedArena = searchParams.get("arena");

  // Validate required parameters
  if (!enemyStriker || !selectedArena) {
    return NextResponse.json(
      { error: "Both 'enemyStriker' and 'arena' are required parameters." },
      { status: 400 }
    );
  }

  try {
    const topCounterStrikers = await db(
      `
      WITH solo_counter_stats AS (
        -- Global win rate of striker vs opponent striker
        SELECT 
            mp1."striker" AS "striker",
            mp2."striker" AS "opponent",
            COUNT(*) AS "matchesPlayed",
            SUM(
                CASE 
                    WHEN (m."team1Won" = true AND mp1."teamNumber" = 1) 
                      OR (m."team1Won" = false AND mp1."teamNumber" = 2) THEN 1
                    ELSE 0 
                END
            ) AS "wins"
        FROM "MatchPlayer" mp1
        JOIN "MatchPlayer" mp2 
            ON mp1."matchId" = mp2."matchId" 
            AND mp1."teamNumber" != mp2."teamNumber"
        JOIN "Match" m 
            ON mp1."matchId" = m."id"
        WHERE mp1."striker" = $1
        GROUP BY mp1."striker", mp2."striker"
    ),
    
    arena_specific_counter_stats AS (
        -- Win rate of striker vs opponent striker on the selected arena
        SELECT 
            mp1."striker" AS "striker",
            mp2."striker" AS "opponent",
            COUNT(*) AS "arenaMatchesPlayed",
            SUM(
                CASE 
                    WHEN (m."team1Won" = true AND mp1."teamNumber" = 1) 
                      OR (m."team1Won" = false AND mp1."teamNumber" = 2) THEN 1
                    ELSE 0 
                END
            ) AS "arenaWins"
        FROM "MatchPlayer" mp1
        JOIN "MatchPlayer" mp2 
            ON mp1."matchId" = mp2."matchId" 
            AND mp1."teamNumber" != mp2."teamNumber"
        JOIN "Match" m 
            ON mp1."matchId" = m."id"
        WHERE mp1."striker" = $1
          AND m."map" = $2
        GROUP BY mp1."striker", mp2."striker"
    ),
    
    opponent_arena_winrate AS (
        -- Win rate of opponent striker on selected arena, ignoring specified striker
        SELECT 
            mp2."striker" AS "opponent",
            COUNT(*) AS "opponentArenaMatchesPlayed",
            SUM(
                CASE 
                    WHEN (m."team1Won" = true AND mp2."teamNumber" = 1) 
                      OR (m."team1Won" = false AND mp2."teamNumber" = 2) THEN 1
                    ELSE 0 
                END
            ) AS "opponentArenaWins"
        FROM "MatchPlayer" mp1
        JOIN "MatchPlayer" mp2 
            ON mp1."matchId" = mp2."matchId" 
            AND mp1."teamNumber" != mp2."teamNumber"
        JOIN "Match" m 
            ON mp1."matchId" = m."id"
        WHERE mp1."striker" = $1
          AND m."map" = $2
        GROUP BY mp2."striker"
    )
    
    SELECT 
        scs."striker",
        scs."opponent",
        scs."matchesPlayed",
        ROUND((scs."wins"::numeric / NULLIF(scs."matchesPlayed", 0)) * 100, 2) AS "globalWinRate",
        asc_stats."arenaMatchesPlayed",
        ROUND((asc_stats."arenaWins"::numeric / NULLIF(asc_stats."arenaMatchesPlayed", 0)) * 100, 2) AS "arenaWinRate",
        oaw."opponentArenaMatchesPlayed",
        ROUND((oaw."opponentArenaWins"::numeric / NULLIF(oaw."opponentArenaMatchesPlayed", 0)) * 100, 2) AS "opponentArenaWinRate"
    FROM solo_counter_stats scs
    LEFT JOIN arena_specific_counter_stats asc_stats 
        ON scs."striker" = asc_stats."striker" 
        AND scs."opponent" = asc_stats."opponent"
    LEFT JOIN opponent_arena_winrate oaw 
        ON scs."opponent" = oaw."opponent"
    ORDER BY "globalWinRate" DESC, "arenaWinRate" DESC, "matchesPlayed" DESC;
    
    
      `,
      [enemyStriker, selectedArena]
    );

    // Return the fetched data
    return NextResponse.json({ topCounterStrikers });
  } catch (error) {
    console.error("Error fetching counter strikers:", error);
    return NextResponse.json(
      { error: "Failed to fetch counter strikers." },
      { status: 500 }
    );
  }
}
