import { neon } from "@neondatabase/serverless";

export async function db(query: string, params: any[] = []) {
  const sql = neon(process.env.DATABASE_URL || "");
  // const response = await sql`SELECT version()`;
  const response = await sql(query, params);
  // return response[0].version;
  return response;
}
