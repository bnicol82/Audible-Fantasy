import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/ai/tools";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  const { message, leagueContext } = await request.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const system = buildSystemPrompt(
    leagueContext ?? {
      leagueName: "The Gauntlet League",
      scoringFormat: "half-PPR",
      rosterSummary: "Josh Allen, Bijan Robinson, Jahmyr Gibbs (Q), Ja'Marr Chase, Puka Nacua, Trey McBride, Zay Flowers",
      week: 5,
      record: "3-1",
    }
  );

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: message }],
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
