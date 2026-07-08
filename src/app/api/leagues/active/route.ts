import { NextResponse } from "next/server";
import { getActiveLeague } from "@/lib/leagues/sync";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId");
  const leagueId = searchParams.get("leagueId");

  if (!profileId || !leagueId) {
    return NextResponse.json(
      { error: "profileId and leagueId are required" },
      { status: 400 }
    );
  }

  try {
    const league = await getActiveLeague(profileId, leagueId);
    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    return NextResponse.json({ league });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load league";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
