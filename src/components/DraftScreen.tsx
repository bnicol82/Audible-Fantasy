"use client";

import { useEffect, useState } from "react";
import { draftBoard } from "@/lib/data";
import type { DraftBoardPayload } from "@/lib/fantasy/draft";
import { getOrCreateProfileId } from "@/lib/session";
import { AppHead, Card, Hash, Pill } from "./ui";

function statusLabel(status: string) {
  switch (status) {
    case "pre_draft":
      return "PRE-DRAFT";
    case "drafting":
      return "LIVE DRAFT";
    case "complete":
      return "COMPLETE";
    default:
      return status.toUpperCase();
  }
}

export function DraftScreen({
  leagueId,
  onAskDraft,
}: {
  leagueId: string | null;
  onAskDraft: () => void;
}) {
  const [board, setBoard] = useState<DraftBoardPayload>({
    source: "demo",
    ...draftBoard,
    draftedPlayerIds: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const profileId = getOrCreateProfileId();
        const params = new URLSearchParams({ profileId });
        if (leagueId) params.set("leagueId", leagueId);

        const res = await fetch(`/api/fantasy/draft?${params.toString()}`);
        const json = await res.json();
        if (!cancelled && res.ok && json.board) {
          setBoard(json.board);
        }
      } catch {
        // Keep demo board
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  return (
    <div className="body">
      <AppHead
        title="Draft Room"
        badge={`${statusLabel(board.status)} · ${board.draftType.toUpperCase()}`}
      />
      <Hash>
        {board.leagueName} · {board.scoring}
        {board.source === "demo" ? " · DEMO" : ""}
      </Hash>

      {loading && <p className="connect-error">Loading draft board…</p>}

      <Card>
        <div className="matchbar">
          <div className="team">
            {board.teamName}
            <small>YOUR TEAM</small>
          </div>
          <div className="score">
            {board.draftSlot ? (
              <>
                <b>#{board.draftSlot}</b>
                <small style={{ display: "block", fontSize: 10 }}>DRAFT SLOT</small>
              </>
            ) : (
              <b>—</b>
            )}
          </div>
          <div className="team" style={{ textAlign: "right" }}>
            {board.picksUntilYou !== null ? `${board.picksUntilYou} picks` : "TBD"}
            <small>UNTIL YOU</small>
          </div>
        </div>
        {board.nextPick && (
          <div className="winprob-lab">
            <span>NEXT PICK #{board.nextPick}</span>
            <span>
              {board.teams} teams · {board.rounds} rds
            </span>
          </div>
        )}
      </Card>

      <Card>
        <div className="hash" style={{ marginBottom: 8 }}>
          ROSTER NEEDS
        </div>
        {board.rosterNeeds.length ? (
          board.rosterNeeds.map((need) => (
            <div key={need.slot} className="slotrow">
              <span className="slot">{need.slot}</span>
              <div className="pname">{need.label}</div>
            </div>
          ))
        ) : (
          <p className="connect-error" style={{ margin: 0 }}>
            Roster looks balanced — take best available.
          </p>
        )}
      </Card>

      <Card>
        <div className="hash" style={{ marginBottom: 8 }}>
          YOUR ROSTER / KEEPERS
        </div>
        <p className="more-note" style={{ marginTop: 0 }}>
          {board.carryoverNote}
        </p>
        {board.yourPicks.map((pick) => (
          <div key={`${pick.playerName}-${pick.pickNo}`} className="slotrow">
            <span className="slot">{pick.isKeeper ? "K" : pick.round || "—"}</span>
            <div>
              <div className="pname">
                {pick.playerName}
                {pick.isKeeper && <span className="q">K</span>}
              </div>
              <div className="pmeta">
                {pick.position}
                {pick.team ? ` · ${pick.team}` : ""}
                {pick.pickNo ? ` · Pick ${pick.pickNo}` : " · Carryover"}
              </div>
            </div>
          </div>
        ))}
      </Card>

      {board.recentPicks.length > 0 && (
        <Card>
          <div className="hash" style={{ marginBottom: 8 }}>
            RECENT PICKS
          </div>
          {board.recentPicks.map((pick) => (
            <div key={`${pick.pickNo}-${pick.playerName}`} className="slotrow">
              <span className="slot">{pick.pickNo}</span>
              <div>
                <div className="pname">
                  {pick.playerName}
                  {pick.isYours && <Pill variant="gold">YOU</Pill>}
                </div>
                <div className="pmeta">
                  {pick.position}
                  {pick.team ? ` · ${pick.team}` : ""} · Rd {pick.round}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <div className="hash" style={{ marginBottom: 8 }}>
          TARGET BOARD
        </div>
        {board.targets.map((target) => (
          <div key={target.playerExternalId} className="slotrow">
            <span className="slot">{target.adp}</span>
            <div>
              <div className="pname">{target.name}</div>
              <div className="pmeta">
                {target.position} · {target.team ?? "FA"} · {target.tier}
              </div>
              <div className="rec">{target.note}</div>
            </div>
          </div>
        ))}
      </Card>

      <button type="button" className="lineup-cta" onClick={onAskDraft}>
        <Pill variant="gold">⚑ ASK AUDIBLE — WHO SHOULD I DRAFT?</Pill>
      </button>
    </div>
  );
}
