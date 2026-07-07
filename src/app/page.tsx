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
import { useTheme } from "@/lib/theme/ThemeProvider";

type Tab = "team" | "ask" | "waivers" | "more";
type View = "connect" | Tab | "startsit" | "paywall" | "team-detail";

export default function Home() {
  const { setTeam } = useTheme();
  const [onboarded, setOnboarded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [view, setView] = useState<View>("connect");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOnboarded(localStorage.getItem(STORAGE_KEYS.onboarded) === "true");
    setConnected(localStorage.getItem(STORAGE_KEYS.connected) === "true");
    setIsPro(localStorage.getItem(STORAGE_KEYS.isPro) === "true");
    setHydrated(true);
  }, []);

  const handleOnboardingComplete = (team: NflTeam) => {
    setTeam(team);
    localStorage.setItem(STORAGE_KEYS.onboarded, "true");
    localStorage.setItem(STORAGE_KEYS.team, team.id);
    setOnboarded(true);
    setView("connect");
  };

  const handleConnect = () => {
    localStorage.setItem(STORAGE_KEYS.connected, "true");
    setConnected(true);
    setView("team");
  };

  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEYS.connected);
    setConnected(false);
    setView("connect");
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
    view === "startsit" ||
    view === "connect" ||
    view === "paywall" ||
    view === "team-detail"
      ? "team"
      : view;

  const showTabBar = connected && view !== "paywall" && view !== "connect";

  function renderScreen() {
    if (!onboarded) {
      return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    }

    if (!connected) {
      return <ConnectScreen onConnect={handleConnect} />;
    }

    switch (view) {
      case "paywall":
        return <PaywallScreen onStartTrial={handleStartTrial} />;
      case "team":
        return isPro ? (
          <ProDashboardScreen onSelectTeam={() => setView("team-detail")} />
        ) : (
          <MyTeamScreen onStartSit={() => setView("startsit")} />
        );
      case "team-detail":
        return <MyTeamScreen onStartSit={() => setView("startsit")} />;
      case "ask":
        return <AskScreen />;
      case "waivers":
        return <WaiversScreen />;
      case "startsit":
        return <StartSitScreen onAskWhy={() => setView("ask")} />;
      case "more":
        return (
          <MoreScreen
            onStartSit={() => setView("startsit")}
            onPaywall={() => setView("paywall")}
            isPro={isPro}
            onDisconnect={handleDisconnect}
          />
        );
      default:
        return isPro ? (
          <ProDashboardScreen onSelectTeam={() => setView("team-detail")} />
        ) : (
          <MyTeamScreen onStartSit={() => setView("startsit")} />
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
