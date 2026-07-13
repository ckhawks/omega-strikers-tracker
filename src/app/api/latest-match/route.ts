import { db } from "@/util/db/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lightweight endpoint the live indicator polls to detect newly-captured matches.
export async function GET() {
  const rows = await db(
    `SELECT id, "createdAt", map, source, mode
     FROM "Match"
     WHERE "deletedAt" IS NULL
     ORDER BY "createdAt" DESC
     LIMIT 1`,
    []
  );
  if (!rows.length) return NextResponse.json({ id: null });
  const m = rows[0];
  return NextResponse.json({
    id: m.id,
    createdAt: m.createdAt,
    map: m.map,
    mode: m.mode,
    source: m.source,
  });
}
