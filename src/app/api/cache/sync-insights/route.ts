import { NextResponse } from "next/server";
import { generateInsightsForAllLeagues } from "@/lib/ai/generate-insights";

// Daily proactive-insights sweep across all recently-synced leagues. Runs after the
// morning data sync so signals see fresh injuries/weather/odds. Per-league cost is
// bounded: at most one deep-tier model call, and zero when nothing new happened.

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateInsightsForAllLeagues(apiKey);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Insight sweep failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
