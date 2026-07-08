import { league, waiverTargets, type WaiverTarget } from "@/lib/data";
import { getActiveLeague } from "@/lib/leagues/sync";
import {
  getSleeperPlayers,
  getSleeperTrendingAdds,
} from "@/lib/providers/sleeper";

export type WaiversPayload = {
  source: "live" | "demo";
  faabRemaining: number;
  claimsSet: number;
  targets: WaiverTarget[];
};

function demoPayload(): WaiversPayload {
  return {
    source: "demo",
    faabRemaining: league.faabRemaining,
    claimsSet: league.claimsSet,
    targets: waiverTargets,
  };
}

function suggestBid(addCount: number, index: number) {
  return Math.max(1, Math.min(25, Math.round(addCount / 4) + (3 - index)));
}

export async function getWaiversBoard(input: {
  profileId?: string;
  leagueId?: string;
}) {
  try {
    const players = await getSleeperPlayers();
    const trending = await getSleeperTrendingAdds(48, 12);
    let owned = new Set<string>();

    if (input.profileId && input.leagueId && process.env.DATABASE_URL) {
      const active = await getActiveLeague(input.profileId, input.leagueId);
      if (active) {
        owned = new Set(active.roster.map((player) => player.playerExternalId));
      }
    }

    const targets: WaiverTarget[] = trending
      .map((entry, index) => {
        const player = players[entry.player_id];
        if (!player || owned.has(entry.player_id)) return null;

        return {
          name: player.full_name ?? "Unknown",
          position: player.position ?? "UNK",
          team: player.team ?? "—",
          rostered: `${Math.min(99, entry.count)} adds`,
          suggestedBid: suggestBid(entry.count, index),
          why: `${entry.count} recent adds on Sleeper. Good stash candidate while you finalize your league setup.`,
          tags: [{ label: "TRENDING ADD", variant: "gold" as const }],
        };
      })
      .filter(Boolean)
      .slice(0, 3) as WaiverTarget[];

    if (!targets.length) {
      return demoPayload();
    }

    return {
      source: "live" as const,
      faabRemaining: league.faabRemaining,
      claimsSet: league.claimsSet,
      targets,
    };
  } catch {
    return demoPayload();
  }
}
