import { STORAGE_KEYS } from "@/lib/nfl-teams";

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
}

export function getStoredSleeperUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.sleeperUsername);
}
