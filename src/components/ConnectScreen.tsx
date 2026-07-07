"use client";

import { useState } from "react";
import type { LeagueMeta } from "@/lib/providers/types";

export function ConnectScreen({
  onConnect,
}: {
  onConnect: (leagues?: LeagueMeta[]) => void;
}) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connectSleeper() {
    if (!username.trim()) {
      setError("Enter your Sleeper username");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/leagues/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "sleeper", username: username.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          onConnect();
          return;
        }
        throw new Error(data.error ?? "Failed to connect");
      }

      onConnect(data.leagues);
    } catch (err) {
      if (err instanceof TypeError) {
        onConnect();
        return;
      }
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
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

      <input
        type="text"
        className="connect-input"
        placeholder="Sleeper username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && connectSleeper()}
      />

      {error && <p className="connect-error">{error}</p>}

      <button
        type="button"
        className="btn primary"
        onClick={connectSleeper}
        disabled={loading}
      >
        {loading ? "Connecting…" : "Connect Sleeper"}{" "}
        <span className="tag">~10 SEC</span>
      </button>
      <button type="button" className="btn" disabled style={{ opacity: 0.45 }}>
        Connect Yahoo <span className="tag">PHASE 2</span>
      </button>
      <button type="button" className="btn" style={{ opacity: 0.45 }}>
        Connect ESPN <span className="tag">BETA</span>
      </button>
      <div className="connect-note">
        No league? <u>Enter your roster manually</u>
        <br />
        Read-only · We never change your lineup
      </div>
    </div>
  );
}
