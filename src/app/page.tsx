"use client";

import { useEffect, useState } from "react";
import { AskScreen } from "@/components/AskScreen";
import { ConnectScreen } from "@/components/ConnectScreen";
import { MoreScreen } from "@/components/MoreScreen";
import { MyTeamScreen } from "@/components/MyTeamScreen";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PaywallScreen } from "@/components/PaywallScreen";
import { ProDashboardScreen } from "@/components/ProDashboardScreen";
import { StartSitScreen } from "@/components/StartSitScreen";
import { AppShell, TabBar } from "@/components/ui";
import { WaiversScreen } from "@/components/WaiversScreen";
import { STORAGE_KEYS, type NflTeam } from "@/lib/nfl-teams";
import {
  clearStoredLeague,
  getStoredLeagueId,
  isDemoMode,
  setDemoMode,
  setStoredLeague,
} from "@/lib/session";
import { useTheme } from "@/lib/theme/ThemeProvider";

type Tab = "team" | "ask" | "waivers" | "more";
type View = Tab | "startsit" | "paywall" | "team-detail";

const LEAGUE_IMPORT_ENABLED = true;

export default function Home() {
  const { setTeam } = useTheme();
  const [onboarded, setOnboarded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [view, setView] = useState<View>("team");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const wasOnboarded = localStorage.getItem(STORAGE_KEYS.onboarded) === "true";
    setOnboarded(wasOnboarded);
    setIsPro(localStorage.getItem(STORAGE_KEYS.isPro) === "true");

    if (LEAGUE_IMPORT_ENABLED) {
      const storedLeagueId = getStoredLeagueId();
      const demo = isDemoMode();
      const isConnected =
        demo || (localStorage.getItem(STORAGE_KEYS.connected) === "true" && Boolean(storedLeagueId));
      setLeagueId(storedLeagueId);
      setConnected(isConnected);
    } else {
      setConnected(wasOnboarded);
    }

    setHydrated(true);
  }, []);

  const handleOnboardingComplete = (team: NflTeam) => {
    setTeam(team);
    localStorage.setItem(STORAGE_KEYS.onboarded, "true");
    localStorage.setItem(STORAGE_KEYS.team, team.id);
    setOnboarded(true);
    setView("team");
  };

  const handleConnect = ({
    leagueId: nextLeagueId,
    username,
  }: {
    leagueId: string;
    username: string;
  }) => {
    setStoredLeague(nextLeagueId, username);
    setLeagueId(nextLeagueId);
    setConnected(true);
    setView("team");
  };

  const handleSkipDemo = () => {
    setDemoMode();
    setLeagueId(null);
    setConnected(true);
    setView("team");
  };

  const handleDisconnect = () => {
    clearStoredLeague();
    setLeagueId(null);
    setConnected(false);
    setView("team");
  };

  const handleStartTrial = () => {
    localStorage.setItem(STORAGE_KEYS.isPro, "true");
    setIsPro(true);
    setView("team");
  };

  const handleTabChange = (tab: string) => {
    setView(tab as Tab);
  };

  const activeTab: Tab =
    view === "startsit" || view === "paywall" || view === "team-detail"
      ? "team"
      : view;

  const showTabBar = onboarded && connected && view !== "paywall";

  function renderScreen() {
    if (!onboarded) {
      return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    }

    if (LEAGUE_IMPORT_ENABLED && !connected) {
      return (
        <ConnectScreen onConnect={handleConnect} onSkipDemo={handleSkipDemo} />
      );
    }

    switch (view) {
      case "paywall":
        return <PaywallScreen onStartTrial={handleStartTrial} />;
      case "team":
        return isPro ? (
          <ProDashboardScreen onSelectTeam={() => setView("team-detail")} />
        ) : (
          <MyTeamScreen leagueId={leagueId} onStartSit={() => setView("startsit")} />
        );
      case "team-detail":
        return (
          <MyTeamScreen leagueId={leagueId} onStartSit={() => setView("startsit")} />
        );
      case "ask":
        return <AskScreen leagueId={leagueId} />;
      case "waivers":
        return <WaiversScreen leagueId={leagueId} />;
      case "startsit":
        return (
          <StartSitScreen
            leagueId={leagueId}
            onAskWhy={() => setView("ask")}
          />
        );
      case "more":
        return (
          <MoreScreen
            onStartSit={() => setView("startsit")}
            onPaywall={() => setView("paywall")}
            isPro={isPro}
            onDisconnect={LEAGUE_IMPORT_ENABLED ? handleDisconnect : undefined}
          />
        );
      default:
        return isPro ? (
          <ProDashboardScreen onSelectTeam={() => setView("team-detail")} />
        ) : (
          <MyTeamScreen leagueId={leagueId} onStartSit={() => setView("startsit")} />
        );
    }
  }

  if (!hydrated) return null;

  return (
    <AppShell
      tabBar={
        showTabBar ? (
          <TabBar active={activeTab} onChange={handleTabChange} isPro={isPro} />
        ) : undefined
      }
    >
      {renderScreen()}
    </AppShell>
  );
}
