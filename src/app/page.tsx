"use client";

import { useState } from "react";
import { AskScreen } from "@/components/AskScreen";
import { ConnectScreen } from "@/components/ConnectScreen";
import { MoreScreen } from "@/components/MoreScreen";
import { MyTeamScreen } from "@/components/MyTeamScreen";
import { PaywallScreen } from "@/components/PaywallScreen";
import { ProDashboardScreen } from "@/components/ProDashboardScreen";
import { StartSitScreen } from "@/components/StartSitScreen";
import { PhoneFrame, TabBar } from "@/components/ui";
import { WaiversScreen } from "@/components/WaiversScreen";

type Tab = "team" | "ask" | "waivers" | "more";
type View = "connect" | Tab | "startsit" | "paywall" | "team-detail";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [view, setView] = useState<View>("connect");

  const handleConnect = () => {
    setConnected(true);
    setView("team");
  };

  const handleStartTrial = () => {
    setIsPro(true);
    setView("team");
  };

  const handleTabChange = (tab: string) => {
    if (tab === "team" && isPro) {
      setView("team");
      return;
    }
    setView(tab as Tab);
  };

  const activeTab: Tab =
    view === "startsit" ||
    view === "connect" ||
    view === "paywall" ||
    view === "team-detail"
      ? "team"
      : view;

  const tabDimmed = !connected || view === "paywall";

  function renderScreen() {
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
          />
        );
      default:
        if (isPro) {
          return (
            <ProDashboardScreen onSelectTeam={() => setView("team-detail")} />
          );
        }
        return <MyTeamScreen onStartSit={() => setView("startsit")} />;
    }
  }

  return (
    <main className="page-wrap">
      <p className="page-eyebrow">
        Concept v2 · {isPro ? "Pro Dashboard" : "Night-Game Direction"}
      </p>
      <PhoneFrame>
        {renderScreen()}
        <TabBar
          active={activeTab}
          onChange={connected ? handleTabChange : () => {}}
          dimmed={tabDimmed}
          isPro={isPro}
        />
      </PhoneFrame>
    </main>
  );
}
