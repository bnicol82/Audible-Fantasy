import { AppHead, Card } from "./ui";

export function MoreScreen({
  onStartSit,
  onPaywall,
  isPro,
}: {
  onStartSit: () => void;
  onPaywall: () => void;
  isPro: boolean;
}) {
  return (
    <div className="body">
      <AppHead title="More" badge={isPro ? "PRO" : "SETTINGS"} />
      <Card>
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
        <button type="button" className="menu-item">
          <span>League Settings</span>
          <span className="menu-arrow">→</span>
        </button>
        <button type="button" className="menu-item">
          <span>Scoring Rules</span>
          <span className="menu-arrow">→</span>
        </button>
        <button type="button" className="menu-item">
          <span>Disconnect League</span>
          <span className="menu-arrow">→</span>
        </button>
      </Card>
      <p className="more-note">
        Read-only access · Audible never changes your lineup
      </p>
    </div>
  );
}
