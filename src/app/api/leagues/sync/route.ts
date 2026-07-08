import { NextResponse } from "next/server";
import { syncSleeperLeague } from "@/lib/leagues/sync";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { profileId, username, externalLeagueId, season } = body as {
      profileId?: string;
      username?: string;
      externalLeagueId?: string;
      season?: number;
    };

    if (!profileId?.trim()) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    if (!username?.trim()) {
      return NextResponse.json({ error: "Sleeper username is required" }, { status: 400 });
    }

    if (!externalLeagueId?.trim()) {
      return NextResponse.json(
        { error: "externalLeagueId is required" },
        { status: 400 }
      );
    }

    const league = await syncSleeperLeague({
      profileId: profileId.trim(),
      username: username.trim(),
      externalLeagueId: externalLeagueId.trim(),
      season,
    });

    return NextResponse.json({ league });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync league";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
