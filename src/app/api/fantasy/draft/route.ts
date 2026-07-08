import { NextResponse } from "next/server";
import { getDraftBoard } from "@/lib/fantasy/draft";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profileId") ?? undefined;
  const leagueId = searchParams.get("leagueId") ?? undefined;

  try {
    const board = await getDraftBoard({ profileId, leagueId });
    return NextResponse.json({ board });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load draft board";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
