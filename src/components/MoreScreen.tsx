import { AppHead, Card } from "./ui";

export function MoreScreen({ onStartSit }: { onStartSit: () => void }) {
  return (
    <div className="body">
      <AppHead title="More" badge="SETTINGS" />
      <Card>
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
