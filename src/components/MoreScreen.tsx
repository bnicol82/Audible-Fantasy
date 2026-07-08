"use client";

import { AppHead, Card } from "./ui";

export function MoreScreen({
  onSettings,
  onStartSit,
  onPaywall,
  isPro,
  onDisconnect,
}: {
  onSettings: () => void;
  onStartSit: () => void;
  onPaywall: () => void;
  isPro: boolean;
  onDisconnect?: () => void;
}) {
  return (
    <div className="body">
      <AppHead title="More" badge={isPro ? "PRO" : "MENU"} />
      <Card>
        <button type="button" className="menu-item" onClick={onSettings}>
          <span>Settings</span>
          <span className="menu-arrow">→</span>
        </button>
        {!isPro && (
          <button type="button" className="menu-item menu-item-pro" onClick={onPaywall}>
            <span>Go Pro</span>
            <span className="menu-arrow">⚑</span>
          </button>
        )}
        <button type="button" className="menu-item" onClick={onStartSit}>
          <span>Start / Sit Compare</span>
          <span className="menu-arrow">→</span>
        </button>
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
