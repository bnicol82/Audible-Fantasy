import { NextResponse } from "next/server";
import { getStartSitComparison } from "@/lib/fantasy/start-sit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") ?? undefined;
  const leagueId = searchParams.get("leagueId") ?? undefined;

  try {
    const comparison = await getStartSitComparison({ profileId, leagueId });
    return NextResponse.json({ comparison });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load start/sit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
