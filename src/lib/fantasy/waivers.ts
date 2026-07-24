import { league, waiverTargets, type WaiverTarget } from "@/lib/data";
import { getActiveLeague, type SyncedLeagueSummary } from "@/lib/leagues/sync";
import { computeFaabRemaining, syncLeagueTransactions } from "@/lib/leagues/transactions";
import {
  getSleeperPlayers,
  getSleeperTrendingAdds,
} from "@/lib/providers/sleeper";

export type WaiversPayload = {
  source: "live" | "demo" | "ai" | "ai-cached";
  faabRemaining: number;
  claimsSet: number;
  targets: WaiverTarget[];
  generatedAt?: string;
  strategy?: string;
  // Diagnostic surface: set when loading real data failed, so the UI explains why
  // instead of silently showing demo targets.
  error?: string;
};

function demoPayload(error?: string): WaiversPayload {
  return {
    source: "demo",
    faabRemaining: league.faabRemaining,
    claimsSet: league.claimsSet,
    targets: waiverTargets,
    error,
  };
}

function suggestBid(addCount: number, index: number) {
  return Math.max(1, Math.min(25, Math.round(addCount / 4) + (3 - index)));
}

export type WaiverCandidate = {
  sleeperId: string;
  name: string;
  position: string;
  team: string;
  addCount: number;
};

export type WaiverFacts = {
  candidates: WaiverCandidate[];
  faabRemaining: number;
};

// Deterministic inputs shared by the heuristic and AI paths: the unowned trending
// player pool and this roster's real FAAB position. The AI ranks and explains; it
// never invents candidates or budgets.
export async function buildWaiverFacts(
  activeLeague: SyncedLeagueSummary | null,
  limit = 15
): Promise<WaiverFacts> {
  const players = await getSleeperPlayers();
  const trending = await getSleeperTrendingAdds(48, 50);

  let owned = new Set<string>();
  let faabRemaining = league.faabRemaining;

  if (activeLeague) {
    owned = new Set(activeLeague.roster.map((player) => player.playerExternalId));

    if (activeLeague.rules.waiverType === "faab" && activeLeague.externalRosterId) {
      try {
        await syncLeagueTransactions({
          leagueId: activeLeague.leagueId,
          externalLeagueId: activeLeague.externalLeagueId,
          weeks: Array.from({ length: activeLeague.week }, (_, i) => i + 1),
        });
        faabRemaining = await computeFaabRemaining({
          leagueId: activeLeague.leagueId,
          faabBudget: activeLeague.rules.faabBudget ?? 100,
          rosterId: activeLeague.externalRosterId,
        });
      } catch {
        // Fall back to the demo constant if transaction sync fails.
      }
    }
  }

  const candidates: WaiverCandidate[] = trending
    .filter((entry) => {
      const player = players[entry.player_id];
      return player && !owned.has(entry.player_id);
    })
    .slice(0, limit)
    .map((entry) => {
      const player = players[entry.player_id]!;
      return {
        sleeperId: entry.player_id,
        name: player.full_name ?? "Unknown",
        position: player.position ?? "UNK",
        team: player.team ?? "—",
        addCount: entry.count,
      };
    });

  return { candidates, faabRemaining };
}

function heuristicTargets(facts: WaiverFacts): WaiverTarget[] {
  return facts.candidates.slice(0, 3).map((candidate, index) => ({
    name: candidate.name,
    position: candidate.position,
    team: candidate.team,
    rostered: `${Math.min(99, candidate.addCount)} adds`,
    suggestedBid: suggestBid(candidate.addCount, index),
    why: `${candidate.addCount} recent adds on Sleeper. Good stash candidate while you finalize your league setup.`,
    tags: [{ label: "TRENDING ADD", variant: "gold" as const }],
  }));
}

export async function getWaiversBoard(input: {
  profileId?: string;
  leagueId?: string;
  refresh?: boolean;
}) {
  try {
    let activeLeague: SyncedLeagueSummary | null = null;
    if (input.profileId && input.leagueId && process.env.DATABASE_URL) {
      activeLeague = await getActiveLeague(input.profileId, input.leagueId);
    }

    if (
      activeLeague &&
      activeLeague.phase !== "draft" &&
      input.profileId &&
      input.leagueId &&
      process.env.ANTHROPIC_API_KEY
    ) {
      const { getOrGenerateWaivers } = await import("@/lib/ai/generate-recommendations");
      const aiPayload = await getOrGenerateWaivers({
        profileId: input.profileId,
        leagueId: input.leagueId,
        league: activeLeague,
        refresh: input.refresh ?? false,
        apiKey: process.env.ANTHROPIC_API_KEY,
      }).catch((error) => {
        console.error("Waiver AI generation failed, using heuristic:", error);
        return null;
      });
      if (aiPayload) return aiPayload;
    }

    const facts = await buildWaiverFacts(activeLeague);
    const targets = heuristicTargets(facts);

    if (!targets.length) {
      return demoPayload(
        "No waiver targets available right now (Sleeper's trending list came back empty). Showing sample data."
      );
    }

    return {
      source: "live" as const,
      faabRemaining: facts.faabRemaining,
      claimsSet: league.claimsSet,
      targets,
    };
  } catch (error) {
    return demoPayload(
      error instanceof Error ? error.message : "Failed to load waivers."
    );
  }
}
