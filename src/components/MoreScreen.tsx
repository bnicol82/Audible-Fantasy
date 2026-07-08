"use client";

import type { AppPhase } from "@/lib/app-phase";
import { phaseLabel } from "@/lib/app-phase";
import { AppHead, Card } from "./ui";

export function MoreScreen({
  onSettings,
  onStartSit,
  onPaywall,
  isPro,
  appPhase = "in_season",
  onPhaseChange,
  onDisconnect,
}: {
  onSettings: () => void;
  onStartSit: () => void;
  onPaywall: () => void;
  isPro: boolean;
  appPhase?: AppPhase;
  onPhaseChange?: (phase: AppPhase) => void;
  onDisconnect?: () => void;
}) {
  const isDraftMode = appPhase === "draft";

  return (
    <div className="body">
      <AppHead title="More" badge={isPro ? "PRO" : "MENU"} />
      <Card>
        <button type="button" className="menu-item" onClick={onSettings}>
          <span>Settings</span>
          <span className="menu-arrow">→</span>
        </button>
        {onPhaseChange && (
          <button
            type="button"
            className="menu-item"
            onClick={() => onPhaseChange(isDraftMode ? "in_season" : "draft")}
          >
            <span>{isDraftMode ? "Switch to In-Season Mode" : "Enter Draft Mode"}</span>
            <span className="menu-arrow">{phaseLabel(isDraftMode ? "in_season" : "draft")}</span>
          </button>
        )}
        {!isPro && (
          <button type="button" className="menu-item menu-item-pro" onClick={onPaywall}>
            <span>Go Pro</span>
            <span className="menu-arrow">⚑</span>
          </button>
        )}
        {!isDraftMode && (
          <button type="button" className="menu-item" onClick={onStartSit}>
            <span>Start / Sit Compare</span>
            <span className="menu-arrow">→</span>
          </button>
        )}
        {onDisconnect && (
          <button type="button" className="menu-item" onClick={onDisconnect}>
            <span>Disconnect League</span>
            <span className="menu-arrow">→</span>
          </button>
        )}
      </Card>
      <p className="more-note">
        Read-only access · Audible never changes your lineup
      </p>
    </div>
  );
}
