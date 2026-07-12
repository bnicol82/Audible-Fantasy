import { NextResponse } from "next/server";
import { getWaiversBoard } from "@/lib/fantasy/waivers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") ?? undefined;
  const leagueId = searchParams.get("leagueId") ?? undefined;
  const refresh = searchParams.get("refresh") === "1";

  try {
    const board = await getWaiversBoard({ profileId, leagueId, refresh });
    return NextResponse.json({ board });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load waivers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Manual refresh: regenerate the AI targets instead of serving this week's cache.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      profileId?: string;
      leagueId?: string;
    };
    const board = await getWaiversBoard({
      profileId: body.profileId,
      leagueId: body.leagueId,
      refresh: true,
    });
    return NextResponse.json({ board });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to refresh waivers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
