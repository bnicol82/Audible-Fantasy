import { NextResponse } from "next/server";
import { connectSleeperLeaguesAcrossSeasons } from "@/lib/providers/sleeper";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { platform, username, season } = body as {
      platform: "sleeper";
      username: string;
      season?: number;
    };

    if (!username?.trim()) {
      return NextResponse.json(
        { error: "Sleeper username is required" },
        { status: 400 }
      );
    }

    if (platform && platform !== "sleeper") {
      return NextResponse.json({ error: "Only Sleeper is supported" }, { status: 400 });
    }

    const currentSeason = new Date().getFullYear();
    const seasons =
      typeof season === "number"
        ? [season]
        : [currentSeason, currentSeason - 1];

    const leagues = await connectSleeperLeaguesAcrossSeasons(
      username.trim(),
      seasons
    );

    return NextResponse.json({ leagues, seasonsTried: seasons });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect league";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
