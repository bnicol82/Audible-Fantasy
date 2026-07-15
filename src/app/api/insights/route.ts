import { NextResponse } from "next/server";
import { listInsights, updateInsightStatuses } from "@/lib/insights/store";

export async function GET(request: Request) {
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
    const insights = await listInsights(profileId, leagueId);
    const newCount = insights.filter((insight) => insight.status === "new").length;
    return NextResponse.json({ insights, newCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Status transitions: mark a batch seen (feed opened) or dismiss a single alert.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      profileId?: string;
      insightIds?: string[];
      status?: string;
    };

    if (
      !body.profileId ||
      !Array.isArray(body.insightIds) ||
      !body.insightIds.length ||
      (body.status !== "seen" && body.status !== "dismissed")
    ) {
      return NextResponse.json(
        { error: "profileId, insightIds, and status (seen|dismissed) are required" },
        { status: 400 }
      );
    }

    const updated = await updateInsightStatuses({
      profileId: body.profileId,
      insightIds: body.insightIds,
      status: body.status,
    });
    return NextResponse.json({ updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
