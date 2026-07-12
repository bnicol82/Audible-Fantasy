// Wires Sleeper's transactions endpoint (previously fetched by getSleeperTransactions but
// never called from anywhere — dead code) into a real sync, so waiver/trade history
// persists instead of being recomputed live (or, in the waiver screen's case, faked with a
// demo constant even on the "live" data path).

import { getDb } from "@/lib/db";
import { getSleeperTransactions, type SleeperTransaction } from "@/lib/providers/sleeper";

function mapTransactionType(type: SleeperTransaction["type"]): "waiver" | "free_agent" | "trade" {
  if (type === "trade") return "trade";
  if (type === "free_agent") return "free_agent";
  return "waiver";
}

export async function syncLeagueTransactions(input: {
  leagueId: string; // internal uuid
  externalLeagueId: string;
  weeks: number[];
}) {
  const db = getDb();
  let synced = 0;

  for (const week of input.weeks) {
    const transactions = await getSleeperTransactions(input.externalLeagueId, week).catch(
      () => [] as SleeperTransaction[]
    );

    for (const tx of transactions) {
      if (tx.status !== "complete") continue;

      const type = mapTransactionType(tx.type);
      const faabSpent = tx.settings?.waiver_bid ?? null;
      const rosterId = tx.roster_ids?.[0] != null ? String(tx.roster_ids[0]) : null;

      await db`
        insert into league_transactions (
          league_id, external_transaction_id, type, week, roster_id, faab_spent, adds, drops, metadata
        )
        values (
          ${input.leagueId}::uuid, ${tx.transaction_id}, ${type}, ${week}, ${rosterId}, ${faabSpent},
          ${JSON.stringify(tx.adds ?? {})}::jsonb, ${JSON.stringify(tx.drops ?? {})}::jsonb,
          ${JSON.stringify(tx.metadata ?? {})}::jsonb
        )
        on conflict (league_id, external_transaction_id) do update set
          faab_spent = excluded.faab_spent,
          adds = excluded.adds,
          drops = excluded.drops,
          metadata = excluded.metadata
      `;
      synced += 1;
    }
  }

  return { synced };
}

// Real FAAB-remaining computation: league's total budget minus every dollar this roster
// has actually spent on waivers, per the transaction history synced above. Replaces the
// hardcoded demo constant that was previously returned even on the waiver screen's "live"
// data path.
export async function computeFaabRemaining(input: {
  leagueId: string;
  faabBudget: number;
  rosterId: string;
}): Promise<number> {
  const db = getDb();
  const rows = (await db`
    select coalesce(sum(faab_spent), 0)::int as spent
    from league_transactions
    where league_id = ${input.leagueId}::uuid
      and type = 'waiver'
      and roster_id = ${input.rosterId}
  `) as Array<{ spent: number }>;

  return Math.max(0, input.faabBudget - (rows[0]?.spent ?? 0));
}
