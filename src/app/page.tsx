"use client";

import { useEffect, useState } from "react";
import { AskScreen } from "@/components/AskScreen";
import { ConnectScreen } from "@/components/ConnectScreen";
import { DraftScreen } from "@/components/DraftScreen";
import { MoreScreen } from "@/components/MoreScreen";
import { MyTeamScreen } from "@/components/MyTeamScreen";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PaywallScreen } from "@/components/PaywallScreen";
import { ProDashboardScreen } from "@/components/ProDashboardScreen";
import { StartSitScreen } from "@/components/StartSitScreen";
import { AppShell, TabBar } from "@/components/ui";
import { WaiversScreen } from "@/components/WaiversScreen";
import type { AppPhase } from "@/lib/app-phase";
import { STORAGE_KEYS, type NflTeam } from "@/lib/nfl-teams";
import {
  clearStoredLeague,
  getStoredAppPhase,
  getStoredLeagueId,
  isDemoMode,
  setDemoMode,
  setDraftDemoMode,
  setStoredAppPhase,
  setStoredLeague,
} from "@/lib/session";
import { useTheme } from "@/lib/theme/ThemeProvider";

type Tab = "team" | "ask" | "waivers" | "draft" | "more";
type View = Tab | "startsit" | "paywall" | "team-detail";

const LEAGUE_IMPORT_ENABLED = true;

export default function Home() {
  const { setTeam } = useTheme();
  const [onboarded, setOnboarded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [appPhase, setAppPhase] = useState<AppPhase>("in_season");
  const [isPro, setIsPro] = useState(false);
  const [view, setView] = useState<View>("team");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const wasOnboarded = localStorage.getItem(STORAGE_KEYS.onboarded) === "true";
    setOnboarded(wasOnboarded);
    setIsPro(localStorage.getItem(STORAGE_KEYS.isPro) === "true");
    setAppPhase(getStoredAppPhase() ?? "in_season");

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

  useEffect(() => {
    if (!hydrated || !leagueId || isDemoMode()) return;

    let cancelled = false;

    async function syncPhaseFromLeague() {
      const activeLeagueId = leagueId;
      if (!activeLeagueId) return;

      try {
        const { getOrCreateProfileId } = await import("@/lib/session");
        const profileId = getOrCreateProfileId();
        const res = await fetch(
          `/api/leagues/active?profileId=${encodeURIComponent(profileId)}&leagueId=${encodeURIComponent(activeLeagueId)}`
        );
        const json = await res.json();
        if (!cancelled && res.ok && json.league?.phase) {
          const stored = getStoredAppPhase();
          const nextPhase = stored ?? json.league.phase;
          setAppPhase(nextPhase);
          if (!stored) {
            setStoredAppPhase(nextPhase);
          }
        }
      } catch {
        // Keep current phase
      }
    }

    syncPhaseFromLeague();
    return () => {
      cancelled = true;
    };
  }, [hydrated, leagueId]);

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
    phase,
  }: {
    leagueId: string;
    username: string;
    phase?: AppPhase;
  }) => {
    setStoredLeague(nextLeagueId, username);
    if (phase) {
      setStoredAppPhase(phase);
      setAppPhase(phase);
    }
    setLeagueId(nextLeagueId);
    setConnected(true);
    setView(phase === "draft" ? "draft" : "team");
  };

  const handleSkipDemo = () => {
    setDemoMode();
    setAppPhase("in_season");
    setLeagueId(null);
    setConnected(true);
    setView("team");
  };

  const handleDraftDemo = () => {
    setDraftDemoMode();
    setAppPhase("draft");
    setLeagueId(null);
    setConnected(true);
    setView("draft");
  };

  const handlePhaseChange = (phase: AppPhase) => {
    setStoredAppPhase(phase);
    setAppPhase(phase);
    if (phase === "draft" && view === "waivers") {
      setView("draft");
    }
    if (phase !== "draft" && view === "draft") {
      setView("team");
    }
  };

  const handleDisconnect = () => {
    clearStoredLeague();
    setLeagueId(null);
    setConnected(false);
    setAppPhase("in_season");
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
      : (view as Tab);

  const showTabBar = onboarded && connected && view !== "paywall";
  const isDraftMode = appPhase === "draft";

  function renderScreen() {
    if (!onboarded) {
      return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    }

    if (LEAGUE_IMPORT_ENABLED && !connected) {
      return (
        <ConnectScreen
          onConnect={handleConnect}
          onSkipDemo={handleSkipDemo}
          onDraftDemo={handleDraftDemo}
        />
      );
    }

    switch (view) {
      case "paywall":
        return <PaywallScreen onStartTrial={handleStartTrial} />;
      case "team":
        return isPro ? (
          <ProDashboardScreen onSelectTeam={() => setView("team-detail")} />
        ) : (
          <MyTeamScreen
            leagueId={leagueId}
            isDraftMode={isDraftMode}
            onStartSit={() => setView("startsit")}
            onOpenDraft={() => setView("draft")}
          />
        );
      case "team-detail":
        return (
          <MyTeamScreen
            leagueId={leagueId}
            isDraftMode={isDraftMode}
            onStartSit={() => setView("startsit")}
            onOpenDraft={() => setView("draft")}
          />
        );
      case "ask":
        return <AskScreen leagueId={leagueId} appPhase={appPhase} />;
      case "draft":
        return (
          <DraftScreen leagueId={leagueId} onAskDraft={() => setView("ask")} />
        );
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
            appPhase={appPhase}
            onPhaseChange={handlePhaseChange}
            onDisconnect={LEAGUE_IMPORT_ENABLED ? handleDisconnect : undefined}
          />
        );
      default:
        return isPro ? (
          <ProDashboardScreen onSelectTeam={() => setView("team-detail")} />
        ) : (
          <MyTeamScreen
            leagueId={leagueId}
            isDraftMode={isDraftMode}
            onStartSit={() => setView("startsit")}
            onOpenDraft={() => setView("draft")}
          />
        );
    }
  }

  if (!hydrated) return null;

  return (
    <AppShell
      tabBar={
        showTabBar ? (
          <TabBar
            active={activeTab}
            onChange={handleTabChange}
            dimmed={false}
            isPro={isPro}
            appPhase={appPhase}
          />
        ) : undefined
      }
    >
      {renderScreen()}
    </AppShell>
  );
}
