import { neon } from "@neondatabase/serverless";

let sql: ReturnType<typeof neon> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!sql) {
    sql = neon(url);
  }

  return sql;
}

export async function pingDb() {
  const db = getDb();
  const rows = (await db`select now() as server_time`) as { server_time: string }[];
  return rows[0]?.server_time ?? "";
}
