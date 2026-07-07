"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyTeamTheme,
  getTeamById,
  NFL_TEAMS,
  STORAGE_KEYS,
  type ColorMode,
  type NflTeam,
} from "@/lib/nfl-teams";

type ThemeContextValue = {
  team: NflTeam;
  colorMode: ColorMode;
  setTeam: (team: NflTeam) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_TEAM = NFL_TEAMS.find((t) => t.id === "buf")!;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [team, setTeamState] = useState<NflTeam>(DEFAULT_TEAM);
  const [colorMode, setColorModeState] = useState<ColorMode>("away");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedTeam = localStorage.getItem(STORAGE_KEYS.team);
    const savedMode = localStorage.getItem(STORAGE_KEYS.colorMode) as ColorMode | null;
    const teamToApply = savedTeam ? getTeamById(savedTeam) ?? DEFAULT_TEAM : DEFAULT_TEAM;
    const modeToApply = savedMode === "home" || savedMode === "away" ? savedMode : "away";
    setTeamState(teamToApply);
    setColorModeState(modeToApply);
    applyTeamTheme(teamToApply, modeToApply);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyTeamTheme(team, colorMode);
    localStorage.setItem(STORAGE_KEYS.team, team.id);
    localStorage.setItem(STORAGE_KEYS.colorMode, colorMode);
  }, [team, colorMode, ready]);

  const setTeam = useCallback((next: NflTeam) => setTeamState(next), []);
  const setColorMode = useCallback((mode: ColorMode) => setColorModeState(mode), []);
  const toggleColorMode = useCallback(
    () => setColorModeState((m) => (m === "home" ? "away" : "home")),
    []
  );

  const value = useMemo(
    () => ({ team, colorMode, setTeam, setColorMode, toggleColorMode }),
    [team, colorMode, setTeam, setColorMode, toggleColorMode]
  );

  if (!ready) {
    return <div className="app-shell" aria-hidden />;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
