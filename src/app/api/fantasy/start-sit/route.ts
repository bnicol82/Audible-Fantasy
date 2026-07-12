import { NextResponse } from "next/server";
import { getStartSitComparison } from "@/lib/fantasy/start-sit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") ?? undefined;
  const leagueId = searchParams.get("leagueId") ?? undefined;
  const refresh = searchParams.get("refresh") === "1";

  try {
    const comparison = await getStartSitComparison({ profileId, leagueId, refresh });
    return NextResponse.json({ comparison });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load start/sit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Manual refresh: regenerate the AI analysis instead of serving this week's cache.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      profileId?: string;
      leagueId?: string;
    };
    const comparison = await getStartSitComparison({
      profileId: body.profileId,
      leagueId: body.leagueId,
      refresh: true,
    });
    return NextResponse.json({ comparison });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to refresh start/sit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
