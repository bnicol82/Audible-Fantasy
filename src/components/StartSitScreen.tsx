"use client";

import { useEffect, useState } from "react";
import { startSitComparison } from "@/lib/data";
import type { StartSitPayload } from "@/lib/fantasy/start-sit";
import { getOrCreateProfileId } from "@/lib/session";
import { AppHead, Card, Hash } from "./ui";

export function StartSitScreen({
  leagueId,
  onAskWhy,
}: {
  leagueId: string | null;
  onAskWhy: () => void;
}) {
  const [comparison, setComparison] = useState<StartSitPayload>({
    ...startSitComparison,
    source: "demo",
    week: 5,
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

        const res = await fetch(`/api/fantasy/start-sit?${params.toString()}`);
        const json = await res.json();
        if (!cancelled && res.ok && json.comparison) {
          setComparison(json.comparison);
        }
      } catch {
        // Keep demo comparison
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const { playerA, playerB, stats, verdict } = comparison;

  return (
    <div className="body">
      <AppHead title="Start / Sit" badge={`FLEX · WK ${comparison.week}`} />
      <Hash>
        DECISION 1 OF 1{comparison.source === "demo" ? " · DEMO" : ""}
      </Hash>

      {loading && <p className="connect-error">Loading comparison…</p>}

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
      <button type="button" className="askwhy" onClick={onAskWhy}>
        ASK AUDIBLE WHY →
      </button>
    </div>
  );
}
