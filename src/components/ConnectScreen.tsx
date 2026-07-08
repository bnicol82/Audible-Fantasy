"use client";

import { useState } from "react";
import type { AppPhase } from "@/lib/app-phase";
import type { LeagueMeta } from "@/lib/providers/types";
import { getOrCreateProfileId } from "@/lib/session";
import { Card } from "./ui";

type ConnectResult = {
  leagueId: string;
  username: string;
  phase?: AppPhase;
};

export function ConnectScreen({
  onConnect,
  onSkipDemo,
  onDraftDemo,
}: {
  onConnect: (result: ConnectResult) => void;
  onSkipDemo: () => void;
  onDraftDemo: () => void;
}) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<LeagueMeta[] | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function connectSleeper() {
    if (!username.trim()) {
      setError("Enter your Sleeper username");
      return;
    }

    setLoading(true);
    setError(null);
    setLeagues(null);

    try {
      const res = await fetch("/api/leagues/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "sleeper", username: username.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to connect");
      }

      if (!data.leagues?.length) {
        setError(
          "No NFL leagues found for this username in the current or previous season. Set up your league on Sleeper first, or explore with demo data below."
        );
        return;
      }

      if (data.leagues.length === 1) {
        await syncLeague(data.leagues[0].externalLeagueId);
        return;
      }

      setLeagues(data.leagues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function syncLeague(externalLeagueId: string) {
    setSyncingId(externalLeagueId);
    setError(null);

    try {
      const profileId = getOrCreateProfileId();
      const res = await fetch("/api/leagues/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          username: username.trim(),
          externalLeagueId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to sync league");
      }

      onConnect({
        leagueId: data.league.leagueId,
        username: username.trim(),
        phase: data.league.phase,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="body">
      <div className="logo">
        Aud<em>i</em>ble
      </div>
      <div className="logosub">
        Your team, your scoring, real answers. Connect a league and ask
        anything.
      </div>

      {!leagues ? (
        <>
          <input
            type="text"
            className="connect-input"
            placeholder="Sleeper username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connectSleeper()}
            disabled={loading}
          />

          {error && <p className="connect-error">{error}</p>}

          <button
            type="button"
            className="btn primary"
            onClick={connectSleeper}
            disabled={loading}
          >
            {loading ? "Finding leagues…" : "Connect Sleeper"}{" "}
            <span className="tag">~10 SEC</span>
          </button>
          <button type="button" className="btn" onClick={onSkipDemo}>
            Explore with demo data
            <span className="tag">NO LEAGUE NEEDED</span>
          </button>
          <button type="button" className="btn" onClick={onDraftDemo}>
            Try draft mode demo
            <span className="tag">PRE-DRAFT</span>
          </button>
        </>
      ) : (
        <>
          <div className="hash" style={{ marginTop: 8 }}>
            PICK A LEAGUE
          </div>
          {leagues.map((league) => (
            <Card key={league.externalLeagueId}>
              <button
                type="button"
                className="teamcard-btn"
                onClick={() => syncLeague(league.externalLeagueId)}
                disabled={syncingId === league.externalLeagueId}
              >
                <div className="lname">{league.name}</div>
                <div className="lmeta">
                  {league.season} · {league.totalTeams} teams ·{" "}
                  {league.scoringSettings.format.replace("_", " ").toUpperCase()}
                </div>
                <div className="rec" style={{ marginTop: 8 }}>
                  {syncingId === league.externalLeagueId
                    ? "Syncing roster…"
                    : "Tap to sync →"}
                </div>
              </button>
            </Card>
          ))}
          <button
            type="button"
            className="btn"
            onClick={() => {
              setLeagues(null);
              setError(null);
            }}
          >
            Use a different username
          </button>
          {error && <p className="connect-error">{error}</p>}
        </>
      )}

      <button type="button" className="btn" disabled style={{ opacity: 0.45 }}>
        Connect Yahoo <span className="tag">PHASE 2</span>
      </button>
      <button type="button" className="btn" style={{ opacity: 0.45 }}>
        Connect ESPN <span className="tag">BETA</span>
      </button>
      <div className="connect-note">
        Read-only · We never change your lineup
      </div>
    </div>
  );
}
