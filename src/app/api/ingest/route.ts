import { NextResponse } from "next/server";
import { db, withTransaction } from "@/util/db/db";

export const dynamic = "force-dynamic";

// Ingest endpoint for the OSCapture mod uploader.
// Auth: header `x-ingest-token` must equal env INGEST_TOKEN.
// Dedup: primary key is payload.game_id; if a Match already has it, we store the
// report for provenance and merge the reporter's own rank/MMR, but don't duplicate.

type IncomingPlayer = {
  account_id?: string;
  username?: string;
  team?: number;
  striker?: string;
  striker_code?: string;
  role?: string; // "forward" | "goalie"
  goals?: number;
  assists?: number;
  saves?: number;
  knockouts?: number;
  own_goals?: number;
  damage?: number;
  redirects?: number;
  shots?: number;
  orbs?: number;
  level?: number;
  rank?: {
    rating_change?: number;
    updated_rating?: number;
    previous_tier?: string | null;
    updated_tier?: string | null;
  };
  awakenings?: { round?: number; name?: string; code?: string; type?: number; order?: number }[];
};

type Payload = {
  schema_version?: number;
  game_id?: string;
  match_signature?: string;
  reporter_account_id?: string;
  captured_at?: string;
  mode?: string;
  map?: string;
  terrain?: string;
  duration?: number;
  winning_team?: number;
  mvp_account_id?: string;
  bans?: { team1?: string | null; team2?: string | null };
  sets?: { set?: number; winning_team?: number; team1_goals?: number; team2_goals?: number }[];
  players?: IncomingPlayer[];
};

const int = (v: any) => (Number.isFinite(+v) ? Math.trunc(+v) : 0);
const numOrNull = (v: any) => (v === undefined || v === null || v === "" ? null : +v);
const strOrNull = (v: any) => (v === undefined || v === null || v === "" || v === "nil" ? null : String(v));

// Resolve a game account id -> tracker Player id, creating a Player + PlayerAccount
// for unknown accounts so repeat opponents attribute to a stable record.
async function resolvePlayerId(
  q: (query: string, params?: any[]) => Promise<any[]>,
  accountId?: string,
  username?: string
): Promise<string | null> {
  const acct = strOrNull(accountId);
  if (!acct) return null;

  const existing = await q(`SELECT "playerId" FROM "PlayerAccount" WHERE "gameAccountId" = $1`, [acct]);
  if (existing.length) {
    await q(`UPDATE "PlayerAccount" SET username = COALESCE($2, username), "lastSeenAt" = now() WHERE "gameAccountId" = $1`, [acct, strOrNull(username)]);
    return existing[0].playerId;
  }

  const name = strOrNull(username) ?? `Unknown ${acct.slice(0, 8)}`;
  const player = await q(`INSERT INTO "Player" (name) VALUES ($1) RETURNING id`, [name]);
  const playerId = player[0].id;
  await q(
    `INSERT INTO "PlayerAccount" ("playerId", "gameAccountId", username, "lastSeenAt")
     VALUES ($1, $2, $3, now())
     ON CONFLICT ("gameAccountId") DO UPDATE SET "lastSeenAt" = now()`,
    [playerId, acct, strOrNull(username)]
  );
  return playerId;
}

export async function POST(request: Request) {
  if ((process.env.INGEST_TOKEN || "") === "" || request.headers.get("x-ingest-token") !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const gameId = strOrNull(payload.game_id);
  const signature = strOrNull(payload.match_signature);
  if (!gameId && !signature) {
    return NextResponse.json({ error: "missing game_id and match_signature" }, { status: 400 });
  }

  // Always record the raw report for provenance / reprocessing.
  await db(
    `INSERT INTO "MatchReport" ("gameId", "matchSignature", "reporterAccountId", "rawPayload")
     VALUES ($1, $2, $3, $4)`,
    [gameId, signature, strOrNull(payload.reporter_account_id), JSON.stringify(payload)]
  );

  // Dedup: does a match with this game_id / signature already exist?
  const dupe = await db(
    `SELECT id FROM "Match"
     WHERE "deletedAt" IS NULL AND (
       ($1::text IS NOT NULL AND "gameId" = $1) OR
       ($2::text IS NOT NULL AND "matchSignature" = $2))
     LIMIT 1`,
    [gameId, signature]
  );

  if (dupe.length) {
    const matchId = dupe[0].id;
    // Light merge: fill in this reporter's own rank/MMR if the match is missing it.
    const rp = (payload.players || []).find((p) => strOrNull(p.account_id) === strOrNull(payload.reporter_account_id));
    if (rp && rp.rank) {
      await db(
        `UPDATE "MatchPlayer"
         SET "ratingChange" = COALESCE("ratingChange", $3),
             "updatedRating" = COALESCE("updatedRating", $4),
             "previousTier" = COALESCE("previousTier", $5),
             "updatedTier" = COALESCE("updatedTier", $6)
         WHERE "matchId" = $1 AND "gameAccountId" = $2`,
        [matchId, strOrNull(rp.account_id), numOrNull(rp.rank.rating_change), numOrNull(rp.rank.updated_rating), strOrNull(rp.rank.previous_tier), strOrNull(rp.rank.updated_tier)]
      );
    }
    await db(`UPDATE "MatchReport" SET "matchId" = $1 WHERE "gameId" = $2 AND "matchId" IS NULL`, [matchId, gameId]);
    return NextResponse.json({ status: "duplicate", matchId });
  }

  // New match: insert everything in one transaction.
  const sets = payload.sets || [];
  const team1Sets = sets.filter((s) => int(s.winning_team) === 1).length;
  const team2Sets = sets.filter((s) => int(s.winning_team) === 2).length;
  const winningTeam = int(payload.winning_team);

  try {
    const matchId = await withTransaction(async (q) => {
      const season = await q(`SELECT id FROM "Season" WHERE "isActive" = true ORDER BY "createdAt" DESC LIMIT 1`);
      const seasonId = season.length ? season[0].id : null;

      const match = await q(
        `INSERT INTO "Match"
          (map, "team1Won", "team1Score", "team2Score", duration, source, "seasonId",
           "gameId", "matchSignature", mode, terrain, "winningTeam", "mvpAccountId",
           "team1BanStriker", "team2BanStriker", "capturedAt")
         VALUES ($1,$2,$3,$4,$5,'auto_capture',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING id`,
        [
          strOrNull(payload.map),
          winningTeam === 1,
          team1Sets,
          team2Sets,
          int(payload.duration), // total match seconds (from GameState world time)
          seasonId,
          gameId,
          signature,
          strOrNull(payload.mode),
          strOrNull(payload.terrain),
          winningTeam || null,
          strOrNull(payload.mvp_account_id),
          strOrNull(payload.bans?.team1),
          strOrNull(payload.bans?.team2),
          strOrNull(payload.captured_at),
        ]
      );
      const matchId = match[0].id;

      for (const s of sets) {
        await q(
          `INSERT INTO "MatchSet" ("matchId", "setNumber", "winningTeam", "team1Goals", "team2Goals")
           VALUES ($1,$2,$3,$4,$5)`,
          [matchId, int(s.set), int(s.winning_team) || null, int(s.team1_goals), int(s.team2_goals)]
        );
      }

      for (const p of payload.players || []) {
        const playerId = await resolvePlayerId(q, p.account_id, p.username);
        const isMvp = strOrNull(p.account_id) !== null && strOrNull(p.account_id) === strOrNull(payload.mvp_account_id);
        const mp = await q(
          `INSERT INTO "MatchPlayer"
            ("matchId","playerId","teamNumber",striker,rank,"wasGoalie",
             "statGoals","statAssists","statSaves","statKnockouts","statDamage","statShots","statRedirects","statOrbs",
             "gameAccountId",username,"strikerCode","isMvp","ownGoals",level,
             "ratingChange","updatedRating","previousTier","updatedTier")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
           RETURNING id`,
          [
            matchId,
            playerId,
            int(p.team),
            strOrNull(p.striker),
            null, // legacy rank enum: n/a for auto capture
            (p.role || "").toLowerCase() === "goalie",
            int(p.goals), int(p.assists), int(p.saves), int(p.knockouts),
            int(p.damage), int(p.shots), int(p.redirects), int(p.orbs),
            strOrNull(p.account_id), strOrNull(p.username), strOrNull(p.striker_code),
            isMvp, int(p.own_goals), int(p.level),
            numOrNull(p.rank?.rating_change), numOrNull(p.rank?.updated_rating),
            strOrNull(p.rank?.previous_tier), strOrNull(p.rank?.updated_tier),
          ]
        );
        const matchPlayerId = mp[0].id;

        for (const a of p.awakenings || []) {
          await q(
            `INSERT INTO "MatchPlayerAwakening" ("matchPlayerId", round, code, name, type, "pickOrder")
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [matchPlayerId, a.round ?? null, strOrNull(a.code), strOrNull(a.name), a.type ?? null, a.order ?? null]
          );
        }
      }

      return matchId;
    });

    await db(`UPDATE "MatchReport" SET "matchId" = $1 WHERE "gameId" = $2 AND "matchId" IS NULL`, [matchId, gameId]);
    return NextResponse.json({ status: "created", matchId });
  } catch (err: any) {
    console.error("ingest error", err);
    return NextResponse.json({ error: "ingest failed", detail: String(err?.message || err) }, { status: 500 });
  }
}
