import { draftBoard, type DraftPickSummary, type DraftTarget } from "@/lib/data";
import { getActiveLeague } from "@/lib/leagues/sync";
import {
  countRosterNeeds,
  getSleeperDraft,
  getSleeperDraftPicks,
  getSleeperLeague,
  getSleeperLeagueDrafts,
  getSleeperPlayers,
  pickPlayerName,
} from "@/lib/providers/sleeper";

export type DraftBoardPayload = {
  source: "live" | "demo";
  leagueName: string;
  teamName: string;
  scoring: string;
  draftType: string;
  status: string;
  teams: number;
  rounds: number;
  draftSlot: number | null;
  nextPick: number | null;
  picksUntilYou: number | null;
  carryoverNote: string;
  rosterNeeds: Array<{ slot: string; needed: number; label: string }>;
  yourPicks: DraftPickSummary[];
  recentPicks: DraftPickSummary[];
  targets: DraftTarget[];
  draftedPlayerIds: string[];
};

function demoPayload(): DraftBoardPayload {
  return {
    source: "demo",
    ...draftBoard,
    draftedPlayerIds: draftBoard.yourPicks.map((pick) => pick.playerName),
  };
}

function formatNeedLabel(slot: string, needed: number) {
  return `Need ${needed} ${slot}`;
}

function adpTier(adp: number) {
  if (adp <= 12) return "Round 1";
  if (adp <= 24) return "Round 2";
  if (adp <= 36) return "Round 3";
  if (adp <= 48) return "Mid-round";
  if (adp <= 72) return "Value";
  return "Late-round";
}

function buildTargets(
  players: Awaited<ReturnType<typeof getSleeperPlayers>>,
  draftedIds: Set<string>,
  needs: Array<{ slot: string; needed: number }>,
  limit = 6
) {
  const prioritySlots = needs.map((need) => need.slot);
  const candidates = Object.entries(players)
    .map(([id, player]) => ({ id, ...player }))
    .filter(
      (player) =>
        player.full_name &&
        player.search_rank &&
        player.search_rank > 0 &&
        !draftedIds.has(player.id) &&
        ["QB", "RB", "WR", "TE"].includes(player.position ?? "")
    )
    .sort((a, b) => (a.search_rank ?? 9999) - (b.search_rank ?? 9999));

  const prioritized = candidates.filter((player) =>
    prioritySlots.includes(player.position ?? "")
  );
  const pool = [...prioritized, ...candidates].slice(0, limit * 3);
  const seen = new Set<string>();

  return pool
    .filter((player) => {
      if (seen.has(player.id)) return false;
      seen.add(player.id);
      return true;
    })
    .slice(0, limit)
    .map(
      (player): DraftTarget => ({
        playerExternalId: player.id,
        name: player.full_name ?? "Unknown",
        position: player.position ?? "UNK",
        team: player.team ?? null,
        adp: player.search_rank ?? 999,
        tier: adpTier(player.search_rank ?? 999),
        note:
          prioritySlots.includes(player.position ?? "") ?
            `Fills a roster need at ${player.position}.`
          : "Best player available by ADP.",
      })
    );
}

export async function getDraftBoard(input: {
  profileId?: string;
  leagueId?: string;
}) {
  if (!input.profileId || !input.leagueId || !process.env.DATABASE_URL) {
    return demoPayload();
  }

  try {
    const league = await getActiveLeague(input.profileId, input.leagueId);
    if (!league) return demoPayload();

    const [liveLeague, players] = await Promise.all([
      getSleeperLeague(league.externalLeagueId),
      getSleeperPlayers(),
    ]);

    const drafts = liveLeague.draft_id
      ? [{ draft_id: liveLeague.draft_id }]
      : await getSleeperLeagueDrafts(league.externalLeagueId);
    const draftId = drafts[0]?.draft_id ?? liveLeague.draft_id;

    let draft = draftId ? await getSleeperDraft(draftId).catch(() => null) : null;
    if (!draft && draftId) {
      draft = {
        draft_id: draftId,
        type: "snake",
        status: liveLeague.status === "drafting" ? "drafting" : "pre_draft",
        season: String(league.season),
        league_id: league.externalLeagueId,
        settings: { teams: liveLeague.total_rosters, rounds: 15 },
      };
    }

    const picks = draftId
      ? await getSleeperDraftPicks(draftId).catch(() => [])
      : [];

    const draftedIds = new Set(picks.map((pick) => pick.player_id));
    const userRosterIds = new Set(
      league.roster.map((entry) => entry.playerExternalId)
    );
    for (const id of userRosterIds) draftedIds.add(id);

    const ownedPositions = league.roster
      .filter((entry) => entry.slot !== "BN")
      .map((entry) => entry.position);

    const needs = countRosterNeeds(liveLeague.roster_positions, ownedPositions).map(
      (need) => ({
        ...need,
        label: formatNeedLabel(need.slot, need.needed),
      })
    );

    const userDraftSlot =
      draft?.draft_order && league.sleeperUserId
        ? draft.draft_order[league.sleeperUserId] ?? null
        : null;

    const teams = draft?.settings?.teams ?? liveLeague.total_rosters;
    const rounds = draft?.settings?.rounds ?? 15;
    const totalPicks = teams * rounds;
    const nextPickNo = picks.length + 1;

    let picksUntilYou: number | null = null;
    let nextPick: number | null = null;
    if (userDraftSlot) {
      for (let pickNo = nextPickNo; pickNo <= totalPicks; pickNo += 1) {
        const round = Math.ceil(pickNo / teams);
        const slotInRound = ((pickNo - 1) % teams) + 1;
        const isSnakeReverse = draft?.type === "snake" && round % 2 === 0;
        const slot =
          isSnakeReverse ? teams - slotInRound + 1 : slotInRound;
        if (slot === userDraftSlot) {
          nextPick = pickNo;
          picksUntilYou = pickNo - nextPickNo;
          break;
        }
      }
    }

    const yourDraftPicks: DraftPickSummary[] = picks
      .filter(
        (pick) =>
          pick.picked_by === league.sleeperUserId ||
          pick.roster_id === league.externalRosterId
      )
      .map((pick) => ({
        pickNo: pick.pick_no,
        round: pick.round,
        playerName: pickPlayerName(pick),
        position: pick.metadata?.position ?? "UNK",
        team: pick.metadata?.team ?? null,
        isYours: true,
        isKeeper: Boolean(pick.is_keeper),
      }));

    const carryoverPicks: DraftPickSummary[] = league.roster
      .filter((entry) => !yourDraftPicks.some((pick) => pick.playerName === entry.playerName))
      .map((entry) => ({
        pickNo: 0,
        round: 0,
        playerName: entry.playerName,
        position: entry.position,
        team: entry.nflTeam,
        isYours: true,
        isKeeper: true,
      }));

    const recentPicks: DraftPickSummary[] = picks.slice(-8).reverse().map((pick) => ({
      pickNo: pick.pick_no,
      round: pick.round,
      playerName: pickPlayerName(pick),
      position: pick.metadata?.position ?? "UNK",
      team: pick.metadata?.team ?? null,
      isYours:
        pick.picked_by === league.sleeperUserId ||
        pick.roster_id === league.externalRosterId,
      isKeeper: Boolean(pick.is_keeper),
    }));

    return {
      source: "live" as const,
      leagueName: league.name,
      teamName: league.teamName,
      scoring: league.scoring,
      draftType: draft?.type ?? "snake",
      status: draft?.status ?? liveLeague.status ?? "pre_draft",
      teams,
      rounds,
      draftSlot: userDraftSlot,
      nextPick,
      picksUntilYou,
      carryoverNote:
        league.phase === "draft"
          ? "Your imported roster carries over until the draft. Plan around these keepers when picking."
          : "Draft prep mode — roster shown as carryover until your league drafts.",
      rosterNeeds: needs,
      yourPicks: [...carryoverPicks, ...yourDraftPicks],
      recentPicks,
      targets: buildTargets(players, draftedIds, needs),
      draftedPlayerIds: Array.from(draftedIds),
    };
  } catch {
    return demoPayload();
  }
}
