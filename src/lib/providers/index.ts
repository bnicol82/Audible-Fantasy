import { manualProvider } from "./manual-provider";
import { sleeperProvider } from "./sleeper-provider";
import type { LeagueProvider, Platform } from "./types";

const providers: Record<Platform, LeagueProvider> = {
  sleeper: sleeperProvider,
  yahoo: sleeperProvider, // Phase 2 placeholder
  espn: sleeperProvider, // Phase 3 placeholder
  manual: manualProvider,
};

export function getProvider(platform: Platform): LeagueProvider {
  return providers[platform];
}

export * from "./types";
export { sleeperProvider, manualProvider };
