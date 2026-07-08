"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LeagueSettingsPayload } from "@/lib/leagues/settings";
import { getOrCreateProfileId, getStoredSleeperUsername, isDemoMode } from "@/lib/session";
import { AppHead, Card } from "./ui";
import { ThemeSettings } from "./ThemeSettings";

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="hash" style={{ marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </Card>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <span className="settings-value">{value}</span>
    </div>
  );
}

export function SettingsScreen({
  leagueId,
  onBack,
  onDisconnect,
}: {
  leagueId: string | null;
  onBack: () => void;
  onDisconnect?: () => void;
}) {
  const [settings, setSettings] = useState<LeagueSettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const profileId = getOrCreateProfileId();
        const params = new URLSearchParams({ profileId });
        if (leagueId) params.set("leagueId", leagueId);

        const res = await fetch(`/api/leagues/settings?${params.toString()}`);
        const json = await res.json();
        if (!cancelled && res.ok && json.settings) {
          setSettings(json.settings);
        }
      } catch {
        // Keep null — sections show placeholders
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const usingDemo = !leagueId || isDemoMode() || settings?.source === "demo";
  const sleeperUsername = getStoredSleeperUsername();

  return (
    <div className="body">
      <div className="settings-head">
        <button type="button" className="settings-back" onClick={onBack}>
          ← Back
        </button>
        <AppHead title="Settings" badge={usingDemo ? "DEMO" : "LIVE"} />
      </div>

      {loading && <p className="connect-error">Loading settings…</p>}

      <SettingsSection title="APPEARANCE">
        <ThemeSettings />
      </SettingsSection>

      <SettingsSection title="LEAGUE">
        <SettingsRow label="League" value={settings?.leagueName ?? "—"} />
        <SettingsRow label="Your team" value={settings?.teamName ?? "—"} />
        <SettingsRow label="Platform" value={settings?.platform ?? "Sleeper"} />
        <SettingsRow label="Season" value={settings ? String(settings.season) : "—"} />
        <SettingsRow
          label="Status"
          value={settings?.leagueStatus ?? "—"}
        />
        <SettingsRow
          label="Sleeper user"
          value={settings?.sleeperUsername ?? sleeperUsername ?? "Not connected"}
        />
        {usingDemo && (
          <p className="more-note" style={{ marginTop: 10 }}>
            Connect a Sleeper league to sync live league settings.
          </p>
        )}
      </SettingsSection>

      <SettingsSection title="ROSTER SLOTS">
        {settings?.rosterSlots.length ? (
          settings.rosterSlots.map((slot) => (
            <SettingsRow key={slot.label} label={slot.label} value={slot.value} />
          ))
        ) : (
          <p className="more-note">No roster slot data available.</p>
        )}
      </SettingsSection>

      <SettingsSection title="SCORING">
        <SettingsRow
          label="Format"
          value={settings?.scoringFormat ?? "—"}
        />
        {settings?.scoringRules.map((rule) => (
          <SettingsRow key={rule.label} label={rule.label} value={rule.value} />
        )) ?? null}
        {!settings?.scoringRules.length && !loading && (
          <p className="more-note">Scoring rules will appear after league sync.</p>
        )}
      </SettingsSection>

      <SettingsSection title="ACCOUNT">
        <p className="more-note" style={{ marginTop: 0, textAlign: "left" }}>
          Read-only access · Audible never changes your lineup or waivers.
        </p>
        {onDisconnect && !usingDemo && (
          <button type="button" className="btn" onClick={onDisconnect}>
            Disconnect league
          </button>
        )}
      </SettingsSection>
    </div>
  );
}
