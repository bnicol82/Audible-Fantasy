import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";

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

    const provider = getProvider(platform ?? "sleeper");
    const leagues = await provider.connectLeague({
      platform: "sleeper",
      username: username.trim(),
      season: season ?? new Date().getFullYear(),
    });

    return NextResponse.json({ leagues });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect league";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
