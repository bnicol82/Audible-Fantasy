"use client";

import { useEffect, useState } from "react";
import { league, waiverTargets } from "@/lib/data";
import type { WaiversPayload } from "@/lib/fantasy/waivers";
import { getOrCreateProfileId } from "@/lib/session";
import { AppHead, Card, Hash, Pill } from "./ui";

export function WaiversScreen({ leagueId }: { leagueId: string | null }) {
  const [board, setBoard] = useState<WaiversPayload>({
    source: "demo",
    faabRemaining: league.faabRemaining,
    claimsSet: league.claimsSet,
    targets: waiverTargets,
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

        const res = await fetch(`/api/fantasy/waivers?${params.toString()}`);
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
        title="Waivers"
        badge={`FAAB $${board.faabRemaining} LEFT`}
      />
      <Hash>
        {board.source === "live" ? "SLEEPER TRENDING ADDS" : "DEMO TARGETS"}
      </Hash>
      <div className="deadline">
        <i />
        WAIVERS CLEAR WED 3:00 AM · {board.claimsSet} CLAIMS SET
      </div>

      {loading && <p className="connect-error">Loading waiver targets…</p>}

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
    </div>
  );
}
