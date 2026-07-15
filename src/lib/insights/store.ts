// Read/update layer for the insights feed. Writes happen in generate-insights.ts.

import { getDb } from "@/lib/db";
import type { InsightKind } from "./signals";

export type InsightSeverity = "info" | "warning" | "urgent";
export type InsightStatus = "new" | "seen" | "dismissed";

export type StoredInsight = {
  id: string;
  week: number;
  kind: InsightKind;
  severity: InsightSeverity;
  headline: string;
  body: string;
  status: InsightStatus;
  createdAt: string;
};

export async function listInsights(
  profileId: string,
  leagueId: string
): Promise<StoredInsight[]> {
  if (!process.env.DATABASE_URL) return [];
  const db = getDb();
  const rows = (await db`
    select id, week, kind, severity, headline, body, status, created_at
    from insights
    where user_id = ${profileId}::uuid
      and league_id = ${leagueId}::uuid
      and status != 'dismissed'
    order by
      case status when 'new' then 0 else 1 end,
      case severity when 'urgent' then 0 when 'warning' then 1 else 2 end,
      created_at desc
    limit 50
  `) as Array<{
    id: string;
    week: number;
    kind: InsightKind;
    severity: InsightSeverity;
    headline: string;
    body: string;
    status: InsightStatus;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    week: row.week,
    kind: row.kind,
    severity: row.severity,
    headline: row.headline,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function updateInsightStatuses(input: {
  profileId: string;
  insightIds: string[];
  status: Exclude<InsightStatus, "new">;
}): Promise<number> {
  if (!process.env.DATABASE_URL || !input.insightIds.length) return 0;
  const db = getDb();
  // "seen" must never resurrect a dismissed insight; "dismissed" is always allowed.
  const rows = (await db`
    update insights
    set status = ${input.status}, updated_at = now()
    where id = any(${input.insightIds}::uuid[])
      and user_id = ${input.profileId}::uuid
      and status != 'dismissed'
    returning id
  `) as Array<{ id: string }>;
  return rows.length;
}

export async function existingDedupeKeys(
  profileId: string,
  leagueId: string,
  keys: string[]
): Promise<Set<string>> {
  if (!process.env.DATABASE_URL || !keys.length) return new Set();
  const db = getDb();
  const rows = (await db`
    select dedupe_key from insights
    where user_id = ${profileId}::uuid
      and league_id = ${leagueId}::uuid
      and dedupe_key = any(${keys})
  `) as Array<{ dedupe_key: string }>;
  return new Set(rows.map((row) => row.dedupe_key));
}
