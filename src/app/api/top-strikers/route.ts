import { ARENAS } from "@/constants/arenas";
import { db } from "@/util/db/db";
import { NextResponse } from "next/server";

export const revalidate = 1;

export async function GET(request: Request) {
  const url = new URL(request.url);
  console.log(url);
  const arena = url.searchParams.get("arena");
  // Split the "players" parameter by commas and map to array of IDs
  const playerIds =
    url.searchParams
      .get("players")
      ?.split(",")
      .map((id) => id.trim()) || [];

  if (!arena || !ARENAS.includes(arena) || playerIds.length === 0) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 401 });
  }

  const [topStrikersOnMap, playerMapStrikers] = await Promise.all([
    // First query: Top strikers on the map
    db(
      `
      WITH map_striker_stats AS (
        SELECT
            m."map",
            mp."striker",
            CASE WHEN mp."wasGoalie" THEN 'Goalie' ELSE 'Forward' END AS "role",
            COUNT(*) AS "matchesPlayed",
            SUM(CASE WHEN m."team1Won" = true AND mp."teamNumber" = 1 THEN 1
                     WHEN m."team1Won" = false AND mp."teamNumber" = 2 THEN 1
                     ELSE 0 END) AS "wins",
            ROUND(
                (SUM(CASE WHEN m."team1Won" = true AND mp."teamNumber" = 1 THEN 1
                          WHEN m."team1Won" = false AND mp."teamNumber" = 2 THEN 1
                          ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
            ) AS "winRate"
        FROM "MatchPlayer" mp
        JOIN "Match" m ON mp."matchId" = m."id"
        WHERE mp."playerId" IS NULL
        GROUP BY m."map", mp."striker", mp."wasGoalie"
      )
      SELECT "map", "striker", "role", "winRate", "matchesPlayed"
      FROM map_striker_stats
      WHERE "winRate" >= 50
      AND "map" = $1
      ORDER BY "map", "winRate" DESC, "matchesPlayed" DESC;
      `,
      [arena]
    ),

    // Second query: Player-specific data on a specific map
    db(
      `
      WITH player_matches AS (
        SELECT
            mp."playerId",
            mp."striker",
            mp."wasGoalie",
            m."map",
            CASE 
                WHEN mp."teamNumber" = 1 AND m."team1Won" = TRUE THEN 'Win'
                WHEN mp."teamNumber" = 2 AND m."team1Won" = FALSE THEN 'Win'
                ELSE 'Loss' 
            END AS "matchResult"
        FROM "MatchPlayer" mp
        JOIN "Match" m ON mp."matchId" = m."id"
        WHERE mp."playerId" = ANY($2::uuid[])
          AND m."map" = $1
          AND mp."deletedAt" IS NULL
    )
    SELECT 
        "playerId",
        "map",
        "matchResult",
        "striker",
        "wasGoalie",
        COUNT(*) AS "count"
    FROM player_matches
    GROUP BY "playerId", "map", "matchResult", "striker", "wasGoalie"
    ORDER BY "playerId", "map", "matchResult", "wasGoalie", "count" DESC;
    
      `,
      [arena, playerIds]
    ),
  ]);

  return NextResponse.json({ topStrikersOnMap, playerMapStrikers });
}
