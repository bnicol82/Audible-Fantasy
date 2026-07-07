"use client";

import { useTheme } from "@/lib/theme/ThemeProvider";
import { NFL_TEAMS } from "@/lib/nfl-teams";
import { useState } from "react";

export function ThemeSettings() {
  const { team, colorMode, setTeam, setColorMode } = useTheme();
  const [showTeams, setShowTeams] = useState(false);

  return (
    <div className="theme-settings">
      <div className="theme-toggle">
        <button
          type="button"
          className={`mode-btn${colorMode === "home" ? " active" : ""}`}
          onClick={() => setColorMode("home")}
        >
          Home
          <small>White · team stripes</small>
        </button>
        <button
          type="button"
          className={`mode-btn${colorMode === "away" ? " active" : ""}`}
          onClick={() => setColorMode("away")}
        >
          Away
          <small>Dark · white accents</small>
        </button>
      </div>

      <button
        type="button"
        className="menu-item"
        onClick={() => setShowTeams((s) => !s)}
      >
        <span>
          Favorite team · {team.city} {team.name}
        </span>
        <span className="team-swatch" style={{ background: team.primary }} />
      </button>

      {showTeams && (
        <div className="team-picker-mini">
          {NFL_TEAMS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`team-pill${t.id === team.id ? " on" : ""}`}
              onClick={() => {
                setTeam(t);
                setShowTeams(false);
              }}
              style={{ borderColor: t.primary }}
            >
              {t.abbreviation}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
