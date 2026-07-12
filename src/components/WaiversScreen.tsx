"use client";

import { useCallback, useEffect, useState } from "react";
import { league, waiverTargets } from "@/lib/data";
import type { WaiversPayload } from "@/lib/fantasy/waivers";
import { getOrCreateProfileId } from "@/lib/session";
import { AppHead, Card, Hash, Pill } from "./ui";

function formatGeneratedAt(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WaiversScreen({ leagueId }: { leagueId: string | null }) {
  const [board, setBoard] = useState<WaiversPayload>({
    source: "demo",
    faabRemaining: league.faabRemaining,
    claimsSet: league.claimsSet,
    targets: waiverTargets,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (refresh: boolean) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const profileId = getOrCreateProfileId();
        if (refresh) {
          const res = await fetch("/api/fantasy/waivers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId, leagueId: leagueId ?? undefined }),
          });
          const json = await res.json();
          if (res.ok && json.board) setBoard(json.board);
        } else {
          const params = new URLSearchParams({ profileId });
          if (leagueId) params.set("leagueId", leagueId);
          const res = await fetch(`/api/fantasy/waivers?${params.toString()}`);
          const json = await res.json();
          if (res.ok && json.board) setBoard(json.board);
        }
      } catch {
        // Keep current board
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [leagueId]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const isAi = board.source === "ai" || board.source === "ai-cached";
  const generatedLabel = formatGeneratedAt(board.generatedAt);

  return (
    <div className="body">
      <AppHead
        title="Waivers"
        badge={`FAAB $${board.faabRemaining} LEFT`}
      />
      <Hash>
        {isAi
          ? `AI TARGETS${generatedLabel ? ` · ${generatedLabel}` : ""}`
          : board.source === "live"
            ? "SLEEPER TRENDING ADDS"
            : "DEMO TARGETS"}
      </Hash>
      <div className="deadline">
        <i />
        WAIVERS CLEAR WED 3:00 AM · {board.claimsSet} CLAIMS SET
      </div>

      {loading && <p className="connect-error">Loading waiver targets…</p>}
      {refreshing && <p className="connect-error">Generating fresh AI targets…</p>}

      {isAi && board.strategy && (
        <div className="deadline">
          <i />
          {board.strategy.toUpperCase()}
        </div>
      )}

      {board.targets.map((target) => (
        <Card key={target.name} className="wcard">
          <div className="top">
            <div>
              <div className="pname">{target.name}</div>
              <div className="pmeta">
                {target.position} · {target.team} · {target.rostered} ROSTERED
              </div>
            </div>
            <div className="faab">
              BID ${target.suggestedBid}
              <small>SUGGESTED</small>
            </div>
          </div>
          <div className="why">{target.why}</div>
          <div className="foot">
            {target.tags.map((tag) => (
              <Pill key={tag.label} variant={tag.variant}>
                {tag.label}
              </Pill>
            ))}
            {target.dropSuggestion && (
              <Pill>DROP: {target.dropSuggestion}</Pill>
            )}
          </div>
        </Card>
      ))}

      {board.source !== "demo" && (
        <button
          type="button"
          className="askwhy"
          onClick={() => load(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? "REGENERATING…" : "REFRESH AI TARGETS ↻"}
        </button>
      )}
    </div>
  );
}
