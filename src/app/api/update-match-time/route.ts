import { db } from "@/util/db/db";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: any }) {
  if (request.method !== "POST") {
    return NextResponse.json(
      { message: "Only POST requests are allowed" },
      { status: 405 }
    );
  }

  const body = await request.json();

  const {
    matchDurationSeconds,
    matchDurationMinutes,
    map,
    setScoreA,
    setScoreB,
    playerId,
    statGoals,
    statAssists,
    statSaves,
    statKnockouts,
  } = body;

  const durationInSeconds = +matchDurationMinutes * 60 + +matchDurationSeconds; // this is stupid javascript moment

  try {
    // Look up the match based on criteria
    const matchSearch = await db(
      `
      UPDATE "Match"
      SET "duration" = $1
      WHERE "map" = $2
      AND "team1Score" = $3
      AND "team2Score" = $4
      AND EXISTS (
        SELECT 1 FROM "MatchPlayer"
        WHERE "MatchPlayer"."matchId" = "Match"."id"
        AND "MatchPlayer"."playerId" = $5
        AND "MatchPlayer"."statGoals" = $6
        AND "MatchPlayer"."statAssists" = $7
        AND "MatchPlayer"."statSaves" = $8
        AND "MatchPlayer"."statKnockouts" = $9
      )
      RETURNING *;
      `,
      [
        durationInSeconds,
        map,
        setScoreA,
        setScoreB,
        playerId,
        statGoals,
        statAssists,
        statSaves,
        statKnockouts,
      ]
    );

    if (matchSearch.length === 0) {
      return NextResponse.json(
        { message: "No match found with provided criteria." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Match time updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating match time:", error);
    return NextResponse.json(
      { message: "An error occurred while updating match time." },
      { status: 500 }
    );
  }
}
