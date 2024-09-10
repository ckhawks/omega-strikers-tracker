import { db } from "@/util/db/db";
import { NextResponse } from "next/server";
export const revalidate = 1;

export async function GET(request: Request, { params }: { params: any }) {
  const players = await db(
    `SELECT * FROM "Player"
    WHERE "deletedAt" IS NULL
    `,
    []
  );

  if (players.length == 0) {
    return NextResponse.json({ players: [] });
  }

  return NextResponse.json({ players });
}
