import { NextResponse } from "next/server";
import { getDb, pingDb } from "@/lib/db";

// Tables/columns each migration should have created — lets us confirm from a browser
// whether the deploy-time migrations actually ran (they only run if DATABASE_URL is set
// for the Vercel BUILD, not just at runtime — a common gotcha).
const EXPECTED = [
  { migration: "001", table: "leagues", column: "scoring_settings" },
  { migration: "003", table: "leagues", column: "rules" },
  { migration: "003", table: "game_conditions", column: "weather" },
  { migration: "003", table: "league_transactions", column: "faab_spent" },
  { migration: "004", table: "recommendations", column: "updated_at" },
  { migration: "005", table: "insights", column: "dedupe_key" },
];

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL not configured" },
      { status: 503 }
    );
  }

  try {
    const serverTime = await pingDb();
    const db = getDb();

    const rows = (await db`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
    `) as Array<{ table_name: string; column_name: string }>;
    const present = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));

    const migrations = EXPECTED.map((e) => ({
      ...e,
      present: present.has(`${e.table}.${e.column}`),
    }));
    const allMigrationsApplied = migrations.every((m) => m.present);

    return NextResponse.json({
      ok: true,
      serverTime,
      allMigrationsApplied,
      migrations,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
