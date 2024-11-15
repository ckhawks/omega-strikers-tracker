import { NextRequest } from "next/server";

const { db } = require("@/util/db/db");
const { NextResponse } = require("next/server");

export async function POST(request: NextRequest) {
  const { arena, teamA, teamB } = await request.json();
  const params = [];
  let whereClause = "WHERE 1=1";

  if (arena && arena != "Any") {
    whereClause += ` AND m."map" = $${params.length + 1}`;
    params.push(arena);
  }

  const addStrikersConditions = (team: any, teamNumber: number) => {
    if (!team || team.length === 0) return "TRUE"; // Return a valid condition if team data is missing or empty

    return team
      .map(({ striker, role }: { striker: any; role: any }) => {
        const conditions = [];
        if (striker) {
          conditions.push(`mp.striker = $${params.length + 1}`);
          params.push(striker);
        }
        if (role) {
          conditions.push(`mp."wasGoalie" = ${role === "goalie"}`);
        }

        // If conditions array is empty, return "TRUE" to avoid empty parentheses
        return conditions.length > 0
          ? `EXISTS (
              SELECT 1 FROM "MatchPlayer" mp
              WHERE mp."matchId" = m.id AND mp."teamNumber" = ${teamNumber}
              AND ${conditions.join(" AND ")}
            )`
          : "TRUE";
      })
      .join(" AND ");
  };

  // Generate reversible team conditions
  const teamAConditionsOn1 = addStrikersConditions(teamA, 1);
  const teamBConditionsOn2 = addStrikersConditions(teamB, 2);
  const teamAConditionsOn2 = addStrikersConditions(teamA, 2);
  const teamBConditionsOn1 = addStrikersConditions(teamB, 1);

  // Ensure only one arrangement is satisfied
  whereClause += ` AND (
    ((${teamAConditionsOn1}) AND (${teamBConditionsOn2}))
    OR
    ((${teamAConditionsOn2}) AND (${teamBConditionsOn1}))
  )`;

  const query = `
    SELECT 
      m.id AS match_id,
      m."map" AS arena,
      m."team1Score",
      m."team2Score",
      COALESCE(
        ARRAY_AGG(CASE WHEN mp."teamNumber" = 1 THEN mp."striker" END ORDER BY mp."wasGoalie" ASC),
        '{}'
      ) AS "teamA_strikers",
      COALESCE(
        ARRAY_AGG(CASE WHEN mp."teamNumber" = 2 THEN mp."striker" END ORDER BY mp."wasGoalie" ASC),
        '{}'
      ) AS "teamB_strikers",
      AVG(mp.rank) FILTER (WHERE mp.rank > 0) AS "averageRank",
      m."createdAt",
      CASE 
        WHEN (${teamAConditionsOn1}) AND (${teamBConditionsOn2}) THEN false
        WHEN (${teamAConditionsOn2}) AND (${teamBConditionsOn1}) THEN true
        ELSE false 
      END AS is_reversed
    FROM "Match" m
    JOIN "MatchPlayer" mp ON m.id = mp."matchId"
    ${whereClause}
    GROUP BY m.id
    ORDER BY m."createdAt" DESC
  `;

  const matches = await db(query, params);

  return NextResponse.json({
    matches: matches.map((match: any) => {
      const teamA = (match.teamA_strikers || []).filter(Boolean);
      const teamB = (match.teamB_strikers || []).filter(Boolean);

      return {
        id: match.match_id,
        arena: match.arena,
        team1Score: match.is_reversed ? match.team2Score : match.team1Score,
        team2Score: match.is_reversed ? match.team1Score : match.team2Score,
        averageRank: match.averageRank,
        teamA: match.is_reversed ? teamB : teamA,
        teamB: match.is_reversed ? teamA : teamB,
        createdAt: match.createdAt,
      };
    }),
  });
}
