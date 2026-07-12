import { NextResponse } from "next/server";
import { loadConversationMessages } from "@/lib/chat/persistence";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  const profileId = searchParams.get("profileId");

  if (!conversationId || !profileId) {
    return NextResponse.json(
      { error: "conversationId and profileId are required" },
      { status: 400 }
    );
  }

  try {
    const messages = await loadConversationMessages(conversationId, profileId);
    return NextResponse.json({ conversationId, messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
