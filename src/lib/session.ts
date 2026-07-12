import { STORAGE_KEYS } from "@/lib/nfl-teams";
import type { AppPhase } from "@/lib/app-phase";

export function getOrCreateProfileId(): string {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateProfileId must run in the browser");
  }

  let profileId = localStorage.getItem(STORAGE_KEYS.profileId);
  if (!profileId) {
    profileId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.profileId, profileId);
  }

  return profileId;
}

export function getStoredLeagueId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.leagueId);
}

export function setStoredLeague(leagueId: string, sleeperUsername: string) {
  localStorage.setItem(STORAGE_KEYS.leagueId, leagueId);
  localStorage.setItem(STORAGE_KEYS.sleeperUsername, sleeperUsername);
  localStorage.setItem(STORAGE_KEYS.connected, "true");
}

export function clearStoredLeague() {
  localStorage.removeItem(STORAGE_KEYS.leagueId);
  localStorage.removeItem(STORAGE_KEYS.sleeperUsername);
  localStorage.removeItem(STORAGE_KEYS.connected);
  localStorage.removeItem(STORAGE_KEYS.demoMode);
  localStorage.removeItem(STORAGE_KEYS.appPhase);
}

export function setDemoMode() {
  localStorage.setItem(STORAGE_KEYS.demoMode, "true");
  localStorage.setItem(STORAGE_KEYS.connected, "true");
  localStorage.removeItem(STORAGE_KEYS.leagueId);
  localStorage.removeItem(STORAGE_KEYS.sleeperUsername);
}

export function setDraftDemoMode() {
  setDemoMode();
  setStoredAppPhase("draft");
}

export function getStoredAppPhase(): AppPhase | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(STORAGE_KEYS.appPhase);
  if (value === "draft" || value === "in_season" || value === "offseason") {
    return value;
  }
  return null;
}

export function setStoredAppPhase(phase: AppPhase) {
  localStorage.setItem(STORAGE_KEYS.appPhase, phase);
}

export function isDemoMode() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEYS.demoMode) === "true";
}

export function getStoredSleeperUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.sleeperUsername);
}

// Conversation ids are scoped per league so switching leagues starts a fresh thread
// while the old one stays resumable.
function conversationStorageKey(leagueId: string | null) {
  return `audible-conversation-${leagueId ?? "demo"}`;
}

export function getStoredConversationId(leagueId: string | null): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(conversationStorageKey(leagueId));
}

export function setStoredConversationId(leagueId: string | null, conversationId: string) {
  localStorage.setItem(conversationStorageKey(leagueId), conversationId);
}

export function clearStoredConversationId(leagueId: string | null) {
  localStorage.removeItem(conversationStorageKey(leagueId));
}
