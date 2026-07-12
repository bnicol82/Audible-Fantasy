// Server-side conversation persistence — the first real writer for the conversations/
// messages tables that have existed in the schema since 001. Every function degrades to a
// no-op when DATABASE_URL is absent so demo mode keeps working, and callers treat all
// failures as non-fatal (chat must never break because persistence hiccuped).

import { getDb } from "@/lib/db";

function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

// Chat can happen before any league is synced, and conversations.user_id has a FK to
// profiles — make sure a minimal row exists for the client-minted profile id.
export async function ensureProfile(profileId: string): Promise<void> {
  if (!hasDb()) return;
  const db = getDb();
  await db`
    insert into profiles (id)
    values (${profileId}::uuid)
    on conflict (id) do nothing
  `;
}

export async function getOrCreateConversation(input: {
  profileId: string;
  leagueId: string | null;
  conversationId?: string | null;
  title: string;
}): Promise<string | null> {
  if (!hasDb()) return null;
  const db = getDb();

  if (input.conversationId) {
    // Ownership check doubles as staleness handling: a conversation id from another
    // profile's localStorage (or one that was deleted) just falls through to create.
    const existing = (await db`
      select id from conversations
      where id = ${input.conversationId}::uuid
        and user_id = ${input.profileId}::uuid
      limit 1
    `) as Array<{ id: string }>;
    if (existing[0]?.id) return existing[0].id;
  }

  const inserted = (await db`
    insert into conversations (user_id, league_id, title)
    values (
      ${input.profileId}::uuid,
      ${input.leagueId ? input.leagueId : null}::uuid,
      ${input.title.slice(0, 80)}
    )
    returning id
  `) as Array<{ id: string }>;

  return inserted[0]?.id ?? null;
}

export async function insertChatMessage(input: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: string[];
  tokensUsed?: number;
}): Promise<void> {
  if (!hasDb()) return;
  const db = getDb();
  await db`
    insert into messages (conversation_id, role, content, tool_calls, tokens_used)
    values (
      ${input.conversationId}::uuid,
      ${input.role},
      ${input.content},
      ${input.toolCalls?.length ? JSON.stringify(input.toolCalls) : null}::jsonb,
      ${input.tokensUsed ?? null}
    )
  `;
}

export type StoredChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function loadConversationMessages(
  conversationId: string,
  profileId: string,
  limit = 40
): Promise<StoredChatMessage[]> {
  if (!hasDb()) return [];
  const db = getDb();
  const rows = (await db`
    select m.role, m.content
    from messages m
    join conversations c on c.id = m.conversation_id
    where m.conversation_id = ${conversationId}::uuid
      and c.user_id = ${profileId}::uuid
      and m.role in ('user', 'assistant')
    order by m.created_at asc
    limit ${limit}
  `) as Array<{ role: "user" | "assistant"; content: string }>;

  return rows.map((row) => ({ role: row.role, content: row.content }));
}
