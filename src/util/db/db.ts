import { Pool, PoolClient } from "pg";

// Single shared pool for the process (VPS Postgres, migrated off Neon).
// DATABASE_URL drives host/port/db/user/password (and sslmode if present).
let pool: Pool | undefined;

// The VPS Postgres uses a self-signed cert. In newer pg, `sslmode=require` in the
// connection string means full verification (rejects self-signed) and overrides an
// explicit `ssl` option. So we STRIP sslmode from the string and drive SSL only via
// the config object: encrypted transport, no CA verification for require/no-verify/prefer.
function buildConfig(): { connectionString: string; ssl: any } {
  const raw = process.env.DATABASE_URL || "";
  let ssl: any = undefined;
  let connectionString = raw;
  try {
    const u = new URL(raw);
    const mode = u.searchParams.get("sslmode");
    if (mode === "disable") ssl = false;
    else if (mode === "verify-full" || mode === "verify-ca") ssl = { rejectUnauthorized: true };
    else if (mode) ssl = { rejectUnauthorized: false }; // require | no-verify | prefer
    u.searchParams.delete("sslmode");
    connectionString = u.toString();
  } catch {
    // leave connectionString as-is if it isn't a parseable URL
  }
  return { connectionString, ssl };
}

export function getPool(): Pool {
  if (!pool) {
    const { connectionString, ssl } = buildConfig();
    pool = new Pool({ connectionString, ssl, max: 10 });
  }
  return pool;
}

// Backwards-compatible with the old neon() wrapper: returns the rows array,
// typed loosely as `any` (like neon) so existing callers that read fields off
// the result keep compiling.
export async function db(query: string, params: any[] = []): Promise<Record<string, any>[]> {
  const res = await getPool().query(query, params);
  return res.rows;
}

// Run a set of statements in a single transaction. The callback receives a
// client whose .query() is used exactly like db() but on one connection.
export async function withTransaction<T>(
  fn: (q: (query: string, params?: any[]) => Promise<any[]>) => Promise<T>
): Promise<T> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query("BEGIN");
    const q = async (query: string, params: any[] = []) =>
      (await client.query(query, params)).rows;
    const result = await fn(q);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
