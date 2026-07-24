import { NextResponse } from "next/server";
import { generateInsightsForLeague } from "@/lib/ai/generate-insights";

// On-demand "check now" — same engine as the daily cron, scoped to one league. The
// dedupe gate makes repeated calls cheap: no new signals, no model call.
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      profileId?: string;
      leagueId?: string;
    };
    if (!body.profileId || !body.leagueId) {
      return NextResponse.json(
        { error: "profileId and leagueId are required" },
        { status: 400 }
      );
    }

    const result = await generateInsightsForLeague({
      profileId: body.profileId,
      leagueId: body.leagueId,
      apiKey,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
