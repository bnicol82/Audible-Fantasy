"use client";

import { useEffect, useState } from "react";
import {
  league as demoLeague,
  matchup as demoMatchup,
  roster as demoRoster,
} from "@/lib/data";
import type { SyncedLeagueSummary } from "@/lib/leagues/sync";
import { getOrCreateProfileId } from "@/lib/session";
import { AppHead, Card, Hash, Pill } from "./ui";

type RosterRow = {
  slot: string;
  name: string;
  team: string;
  injury?: string | null;
  points: number | null;
};

function demoRows(): RosterRow[] {
  return demoRoster.map((player) => ({
    slot: player.slot,
    name: player.name,
    team: player.team,
    injury: player.injury,
    points: player.projection,
  }));
}

function syncedRows(league: SyncedLeagueSummary): RosterRow[] {
  return league.roster.map((player) => ({
    slot: player.slot,
    name: player.playerName,
    team: player.nflTeam ?? "—",
    injury: player.injuryStatus,
    points: player.projectedPoints ?? null,
  }));
}

export function MyTeamScreen({
  leagueId,
  isDraftMode = false,
  onStartSit,
  onOpenDraft,
}: {
  leagueId: string | null;
  isDraftMode?: boolean;
  onStartSit: () => void;
  onOpenDraft?: () => void;
}) {
  const [data, setData] = useState<SyncedLeagueSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(leagueId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leagueId) {
      setLoading(false);
      return;
    }

    const activeLeagueId = leagueId;
    if (!activeLeagueId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const profileId = getOrCreateProfileId();
        const res = await fetch(
          `/api/leagues/active?profileId=${encodeURIComponent(profileId)}&leagueId=${encodeURIComponent(activeLeagueId)}`
        );
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? "Failed to load team");
        }

        if (!cancelled) {
          setData(json.league);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load team");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const usingDemo = !data;
  const league = data ?? {
    name: demoLeague.name,
    scoring: demoLeague.scoring,
    week: demoLeague.week,
    record: demoLeague.record,
    matchup: {
      yourTeam: demoMatchup.yourTeam,
      opponent: demoMatchup.opponent,
      yourPoints: demoMatchup.yourProjection,
      opponentPoints: demoMatchup.opponentProjection,
      winProbability: demoMatchup.winProbability,
      kickoff: demoMatchup.kickoff,
    },
  };

  const rows = data ? syncedRows(data) : demoRows();

  return (
    <div className="body">
      <AppHead
        title="My Team"
        badge={
          isDraftMode
            ? "PRE-DRAFT · CARRYOVER ROSTER"
            : `WK ${league.week ?? demoLeague.week} · ${league.record ?? demoLeague.record}`
        }
      />
      <Hash>
        {league.name} · {league.scoring ?? demoLeague.scoring}
        {usingDemo && !leagueId ? " · DEMO" : ""}
        {isDraftMode ? " · DRAFT PREP" : ""}
      </Hash>

      {isDraftMode && (
        <Card>
          <p className="rec" style={{ margin: 0 }}>
            This is your carryover roster until your league drafts. Use the Draft tab
            and Ask AI to plan your picks around these keepers.
          </p>
          {onOpenDraft && (
            <button
              type="button"
              className="btn primary"
              style={{ marginTop: 12 }}
              onClick={onOpenDraft}
            >
              Open Draft Board
            </button>
          )}
        </Card>
      )}

      {loading && <p className="connect-error">Loading your roster…</p>}
      {error && <p className="connect-error">{error}</p>}

      {league.matchup && (
        <Card>
          <div className="matchbar">
            <div className="team">
              {league.matchup.yourTeam}
              <small>YOU · PTS</small>
            </div>
            <div className="score">
              <b>{league.matchup.yourPoints.toFixed(1)}</b> –{" "}
              {league.matchup.opponentPoints.toFixed(1)}
            </div>
            <div className="team" style={{ textAlign: "right" }}>
              {league.matchup.opponent}
              <small>OPP · PTS</small>
            </div>
          </div>
          <div className="winprob">
            <i style={{ width: `${league.matchup.winProbability}%` }} />
          </div>
          <div className="winprob-lab">
            <span>WIN PROB {league.matchup.winProbability}%</span>
            <span>{league.matchup.kickoff}</span>
          </div>
        </Card>
      )}

      <Card className="roster-card">
        {rows.map((player) => (
          <div key={`${player.slot}-${player.name}`} className="slotrow">
            <span className="slot">{player.slot}</span>
            <div>
              <div className="pname">
                {player.name}
                {player.injury && <span className="q">Q</span>}
              </div>
              <div className="pmeta">
                {player.team}
                {player.injury ? ` · ${player.injury.toUpperCase()}` : ""}
              </div>
            </div>
            <div className="proj">
              {player.points !== null ? player.points.toFixed(1) : "—"}
              <small>{player.points !== null ? "PROJ" : "PTS"}</small>
            </div>
          </div>
        ))}
      </Card>

      {!isDraftMode && (
        <button type="button" className="lineup-cta" onClick={onStartSit}>
          <Pill variant="gold">⚑ 1 LINEUP QUESTION — ASK AUDIBLE</Pill>
        </button>
      )}
    </div>
  );
}
