"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredInsight } from "@/lib/insights/store";
import { getOrCreateProfileId } from "@/lib/session";
import { AppHead, Card, Hash, Pill } from "./ui";

const KIND_LABELS: Record<StoredInsight["kind"], string> = {
  injury: "INJURY",
  weather: "WEATHER",
  lineup: "LINEUP",
  waiver: "WAIVER",
  trade: "TRADE",
};

function severityVariant(severity: StoredInsight["severity"]) {
  if (severity === "urgent") return "red" as const;
  if (severity === "warning") return "gold" as const;
  return undefined;
}

export function InsightsScreen({ leagueId }: { leagueId: string | null }) {
  const [insights, setInsights] = useState<StoredInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markedSeen = useRef(false);

  const load = useCallback(async () => {
    if (!leagueId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const profileId = getOrCreateProfileId();
      const params = new URLSearchParams({ profileId, leagueId });
      const res = await fetch(`/api/insights?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load alerts");
      setInsights(json.insights ?? []);

      // Opening the feed marks new alerts as seen (they stay in the list; only the
      // NEW badge state changes). Dismiss is the explicit removal action.
      const newIds = (json.insights as StoredInsight[])
        .filter((insight) => insight.status === "new")
        .map((insight) => insight.id);
      if (newIds.length && !markedSeen.current) {
        markedSeen.current = true;
        fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId, insightIds: newIds, status: "seen" }),
        }).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function checkNow() {
    if (!leagueId || checking) return;
    setChecking(true);
    setError(null);
    try {
      const profileId = getOrCreateProfileId();
      const res = await fetch("/api/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, leagueId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Check failed");
      }
      markedSeen.current = false;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setChecking(false);
    }
  }

  async function dismiss(insightId: string) {
    setInsights((current) => current.filter((insight) => insight.id !== insightId));
    try {
      const profileId = getOrCreateProfileId();
      await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, insightIds: [insightId], status: "dismissed" }),
      });
    } catch {
      // Optimistic removal stands; worst case the alert reappears next load.
    }
  }

  return (
    <div className="body">
      <AppHead title="Alerts" badge="PROACTIVE AI" />
      <Hash>
        {leagueId ? "AUDIBLE IS WATCHING YOUR ROSTER" : "CONNECT A LEAGUE FOR ALERTS"}
      </Hash>

      {loading && <p className="connect-error">Loading alerts…</p>}
      {checking && <p className="connect-error">Scanning your roster for new alerts…</p>}
      {error && <p className="connect-error">{error}</p>}

      {!leagueId && !loading && (
        <Card>
          <p className="rec" style={{ margin: 0 }}>
            Alerts watch your synced roster for injuries, bad weather, lineup gaps,
            waiver opportunities, and trade angles — and tell you before you ask.
            Connect your Sleeper league to turn them on.
          </p>
        </Card>
      )}

      {leagueId && !loading && insights.length === 0 && !error && (
        <Card>
          <p className="rec" style={{ margin: 0 }}>
            No active alerts. Audible checks your roster daily against injury reports,
            weather, projections, and the waiver wire — anything worth knowing shows up
            here.
          </p>
        </Card>
      )}

      {insights.map((insight) => (
        <Card key={insight.id} className="wcard">
          <div className="top">
            <div>
              <div className="pname">{insight.headline}</div>
              <div className="pmeta">
                WK {insight.week} · {KIND_LABELS[insight.kind]}
                {insight.status === "new" ? " · NEW" : ""}
              </div>
            </div>
          </div>
          <div className="why">{insight.body}</div>
          <div className="foot">
            <Pill variant={severityVariant(insight.severity)}>
              {insight.severity.toUpperCase()}
            </Pill>
            <button
              type="button"
              className="pill"
              onClick={() => dismiss(insight.id)}
              style={{ cursor: "pointer" }}
            >
              DISMISS
            </button>
          </div>
        </Card>
      ))}

      {leagueId && (
        <button
          type="button"
          className="askwhy"
          onClick={checkNow}
          disabled={loading || checking}
        >
          {checking ? "SCANNING…" : "CHECK FOR NEW ALERTS ↻"}
        </button>
      )}
    </div>
  );
}
