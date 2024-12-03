import { db } from "@/util/db/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const firstStriker = searchParams.get("firstStriker");
  const secondStriker = searchParams.get("secondStriker");
  const firstRole = searchParams.get("firstRole"); // "goalie" or "forward" or undefined
  const secondRole = searchParams.get("secondRole"); // "goalie" or "forward" or undefined

  // Validate required parameters
  if (!firstStriker || !secondStriker) {
    return NextResponse.json(
      {
        error:
          "Both 'firstStriker' and 'secondStriker' are required parameters.",
      },
      { status: 400 }
    );
  }

  // Convert roles to boolean (true for goalie, false for forward) if provided
  const firstRoleBool: boolean | null =
    firstRole === "goalie" ? true : firstRole === "forward" ? false : null;
  const secondRoleBool: boolean | null =
    secondRole === "goalie" ? true : secondRole === "forward" ? false : null;

  try {
    const counterStrikers = await db(
      `
      WITH individual_win_rates AS (
        -- Calculate win rates and matches played by each opposing striker against each specified striker individually, with optional role filtering
        SELECT 
            mp3."striker" AS "opponentStriker",
            mp3."wasGoalie" AS "opponentRole",
            mp1."striker" AS "targetStriker",
            COUNT(*) AS "matchesPlayed",
            SUM(
                CASE 
                    WHEN (m."team1Won" = true AND mp3."teamNumber" = 1)
                         OR (m."team1Won" = false AND mp3."teamNumber" = 2) THEN 1
                    ELSE 0 
                END
            ) AS "wins"
        FROM "MatchPlayer" mp1
        JOIN "MatchPlayer" mp3 
            ON mp1."matchId" = mp3."matchId" 
            AND mp1."teamNumber" != mp3."teamNumber"
        JOIN "Match" m 
            ON mp1."matchId" = m."id"
        WHERE 
            (mp1."striker" = $1 AND ($3::boolean IS NULL OR mp1."wasGoalie" = $3::boolean)) 
            OR (mp1."striker" = $2 AND ($4::boolean IS NULL OR mp1."wasGoalie" = $4::boolean))
        GROUP BY mp3."striker", mp3."wasGoalie", mp1."striker"
    ),
    
    aggregated_win_rates AS (
        -- Calculate average win rate against both strikers and separate win rates and matches against each specified striker
        SELECT 
            "opponentStriker",
            "opponentRole",
            
            -- Average win rate against both specified strikers
            AVG(ROUND(("wins"::numeric / NULLIF("matchesPlayed", 0)) * 100, 2)) AS "averageWinRate",
            
            -- Total matches played against each specified striker
            SUM("matchesPlayed") AS "totalMatches",
            NULLIF(SUM(CASE WHEN "targetStriker" = $1 THEN "matchesPlayed" ELSE 0 END), 0) AS "matchesAgainstStrikerA",
            NULLIF(SUM(CASE WHEN "targetStriker" = $2 THEN "matchesPlayed" ELSE 0 END), 0) AS "matchesAgainstStrikerB",
            
            -- Separate win rates against each specified striker
            MAX(CASE WHEN "targetStriker" = $1 THEN ROUND(("wins"::numeric / NULLIF("matchesPlayed", 0)) * 100, 2) END) AS "winRateAgainstStrikerA",
            MAX(CASE WHEN "targetStriker" = $2 THEN ROUND(("wins"::numeric / NULLIF("matchesPlayed", 0)) * 100, 2) END) AS "winRateAgainstStrikerB"
            
        FROM individual_win_rates
        WHERE "targetStriker" IN ($1, $2)
          AND "opponentStriker" NOT IN ($1, $2)  -- Exclude striker A and striker B from the results
        GROUP BY "opponentStriker", "opponentRole"
    )
    
    SELECT 
        "opponentStriker",
        "opponentRole",
        "averageWinRate",
        "totalMatches",
        "matchesAgainstStrikerA",
        "matchesAgainstStrikerB",
        "winRateAgainstStrikerA",
        "winRateAgainstStrikerB"
    FROM aggregated_win_rates
    ORDER BY "averageWinRate" DESC, "totalMatches" DESC;
    
       
    
      `,
      [firstStriker, secondStriker, firstRoleBool, secondRoleBool]
    );

    // Return the fetched data
    return NextResponse.json({ counterStrikers });
  } catch (error) {
    console.error("Error fetching counter strikers:", error);
    return NextResponse.json(
      { error: "Failed to fetch counter strikers." },
      { status: 500 }
    );
  }
}
