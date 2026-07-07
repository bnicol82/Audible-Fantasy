"use client";

import { useState } from "react";
import { AskScreen } from "@/components/AskScreen";
import { ConnectScreen } from "@/components/ConnectScreen";
import { MoreScreen } from "@/components/MoreScreen";
import { MyTeamScreen } from "@/components/MyTeamScreen";
import { StartSitScreen } from "@/components/StartSitScreen";
import { PhoneFrame, TabBar } from "@/components/ui";
import { WaiversScreen } from "@/components/WaiversScreen";

type Tab = "team" | "ask" | "waivers" | "more";
type View = "connect" | Tab | "startsit";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState<View>("connect");

  const handleConnect = () => {
    setConnected(true);
    setView("team");
  };

  const handleTabChange = (tab: string) => {
    setView(tab as Tab);
  };

  const activeTab: Tab =
    view === "startsit" || view === "connect" ? "team" : view;

  function renderScreen() {
    if (!connected) {
      return <ConnectScreen onConnect={handleConnect} />;
    }

    switch (view) {
      case "team":
        return <MyTeamScreen onStartSit={() => setView("startsit")} />;
      case "ask":
        return <AskScreen />;
      case "waivers":
        return <WaiversScreen />;
      case "startsit":
        return <StartSitScreen onAskWhy={() => setView("ask")} />;
      case "more":
        return <MoreScreen onStartSit={() => setView("startsit")} />;
      default:
        return <MyTeamScreen onStartSit={() => setView("startsit")} />;
    }
  }

  return (
    <main className="page-wrap">
      <p className="page-eyebrow">Concept v1 · Night-Game Direction</p>
      <PhoneFrame>
        {renderScreen()}
        <TabBar
          active={activeTab}
          onChange={connected ? handleTabChange : () => {}}
          dimmed={!connected}
        />
      </PhoneFrame>
    </main>
  );
}
