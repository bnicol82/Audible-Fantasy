import { NextResponse } from "next/server";
import { getWaiversBoard } from "@/lib/fantasy/waivers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") ?? undefined;
  const leagueId = searchParams.get("leagueId") ?? undefined;

  try {
    const board = await getWaiversBoard({ profileId, leagueId });
    return NextResponse.json({ board });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load waivers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
