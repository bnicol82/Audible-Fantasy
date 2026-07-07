"use client";

import { NFL_TEAMS, type NflTeam } from "@/lib/nfl-teams";
import { useState } from "react";

export function OnboardingScreen({
  onComplete,
}: {
  onComplete: (team: NflTeam) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = NFL_TEAMS.filter((team) => {
    const q = search.toLowerCase();
    return (
      !q ||
      team.city.toLowerCase().includes(q) ||
      team.name.toLowerCase().includes(q) ||
      team.abbreviation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="onboarding">
      <div className="onboarding-header">
        <div className="logo">
          Aud<em>i</em>ble
        </div>
        <h1>Pick your team</h1>
        <p>We&apos;ll theme the app with your colors. Switch home or away anytime.</p>
      </div>

      <input
        type="search"
        className="connect-input"
        placeholder="Search teams…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="team-grid">
        {filtered.map((team) => (
          <button
            key={team.id}
            type="button"
            className={`team-card${selected === team.id ? " selected" : ""}`}
            onClick={() => setSelected(team.id)}
            style={
              {
                "--card-primary": team.primary,
                "--card-secondary": team.secondary,
              } as React.CSSProperties
            }
          >
            <span className="team-abbr">{team.abbreviation}</span>
            <span className="team-name">{team.city}</span>
            <span className="team-mascot">{team.name}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn primary onboarding-cta"
        disabled={!selected}
        onClick={() => {
          const team = NFL_TEAMS.find((t) => t.id === selected);
          if (team) onComplete(team);
        }}
      >
        Continue
      </button>
    </div>
  );
}
