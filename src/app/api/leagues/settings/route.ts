import { NextResponse } from "next/server";
import { getLeagueSettings } from "@/lib/leagues/settings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") ?? undefined;
  const leagueId = searchParams.get("leagueId") ?? undefined;

  try {
    const settings = await getLeagueSettings({ profileId, leagueId });
    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
