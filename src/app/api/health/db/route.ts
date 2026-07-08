import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL not configured" },
      { status: 503 }
    );
  }

  try {
    const serverTime = await pingDb();
    return NextResponse.json({ ok: true, serverTime });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
