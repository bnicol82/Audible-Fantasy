"use client";

import { useCallback, useEffect, useState } from "react";
import { startSitComparison } from "@/lib/data";
import type { StartSitPayload } from "@/lib/fantasy/start-sit";
import { getOrCreateProfileId } from "@/lib/session";
import { AppHead, Card, Hash } from "./ui";

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

export function StartSitScreen({
  leagueId,
  onAskWhy,
}: {
  leagueId: string | null;
  onAskWhy: (question?: string) => void;
}) {
  const [comparison, setComparison] = useState<StartSitPayload>({
    ...startSitComparison,
    source: "demo",
    week: 5,
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
          const res = await fetch("/api/fantasy/start-sit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId, leagueId: leagueId ?? undefined }),
          });
          const json = await res.json();
          if (res.ok && json.comparison) setComparison(json.comparison);
        } else {
          const params = new URLSearchParams({ profileId });
          if (leagueId) params.set("leagueId", leagueId);
          const res = await fetch(`/api/fantasy/start-sit?${params.toString()}`);
          const json = await res.json();
          if (res.ok && json.comparison) setComparison(json.comparison);
        }
      } catch {
        // Keep current comparison
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

  const { playerA, playerB, stats, verdict } = comparison;
  const isAi = comparison.source === "ai" || comparison.source === "ai-cached";
  const generatedLabel = formatGeneratedAt(comparison.generatedAt);

  return (
    <div className="body">
      <AppHead title="Start / Sit" badge={`FLEX · WK ${comparison.week}`} />
      <Hash>
        DECISION 1 OF 1
        {comparison.source === "demo" ? " · DEMO" : ""}
        {isAi ? ` · AI ANALYSIS${generatedLabel ? ` · ${generatedLabel}` : ""}` : ""}
      </Hash>

      {loading && <p className="connect-error">Loading comparison…</p>}
      {refreshing && <p className="connect-error">Generating fresh AI analysis…</p>}
      {!loading && comparison.error && (
        <p className="connect-error">{comparison.error}</p>
      )}

      <Card>
        <div className="vs">
          <div className="pcard">
            <div className={`avatar${playerA.isWinner ? " win" : ""}`}>
              {playerA.initials}
            </div>
            <div className="nm">{playerA.name}</div>
            <div className="sub">
              {playerA.position} · {playerA.team} · {playerA.matchup}
            </div>
          </div>
          <div className="vsx">VS</div>
          <div className="pcard">
            <div className={`avatar${playerB.isWinner ? " win" : ""}`}>
              {playerB.initials}
            </div>
            <div className="nm">{playerB.name}</div>
            <div className="sub">
              {playerB.position} · {playerB.team} · {playerB.matchup}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        {stats.map((row) => (
          <div key={row.label} className="cmprow">
            <span className={`v${row.winner === "a" ? " hi" : ""}`}>{row.a}</span>
            <span className="lab">{row.label}</span>
            <span className={`v${row.winner === "b" ? " hi" : ""}`}>{row.b}</span>
          </div>
        ))}
      </Card>

      <div className="verdictbar">
        <b>⚑ {playerA.isWinner ? playerA.name.split(" ").pop() : playerB.name.split(" ").pop()}</b>
        <span>{verdict}</span>
      </div>

      {isAi && comparison.reasoning && comparison.reasoning.length > 0 && (
        <Card>
          {comparison.reasoning.map((bullet) => (
            <div key={bullet} className="cmprow">
              <span className="lab" style={{ textAlign: "left", flex: 1 }}>
                • {bullet}
              </span>
            </div>
          ))}
        </Card>
      )}

      <button
        type="button"
        className="askwhy"
        onClick={() => {
          const winner = playerA.isWinner ? playerA : playerB;
          const loser = playerA.isWinner ? playerB : playerA;
          onAskWhy(
            `Why should I start ${winner.name} over ${loser.name} in week ${comparison.week}?`
          );
        }}
      >
        ASK AUDIBLE WHY →
      </button>

      {comparison.source !== "demo" && (
        <button
          type="button"
          className="askwhy"
          onClick={() => load(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? "REGENERATING…" : "REFRESH AI ANALYSIS ↻"}
        </button>
      )}
    </div>
  );
}
