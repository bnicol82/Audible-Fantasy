import { NextResponse } from "next/server";
import { getSleeperNflState } from "@/lib/providers/sleeper";
import { syncInjuryReports } from "@/lib/data-sources/sync";

// Higher-frequency injury sync (hourly, in-season) — separate from the general 3x/day
// /api/cache/sync run since injury news is time-sensitive (Wed/Thu/Fri practice reports).

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { season, week } = body as { season?: number; week?: number };
    const nflState = await getSleeperNflState().catch(() => null);
    const resolvedSeason = season ?? Number(nflState?.season ?? new Date().getFullYear());
    const resolvedWeek = week ?? nflState?.week ?? 1;

    const result = await syncInjuryReports(resolvedSeason, resolvedWeek);
    return NextResponse.json({ ok: true, season: resolvedSeason, week: resolvedWeek, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
