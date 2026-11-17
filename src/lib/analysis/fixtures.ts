/**
 * Synthetic test fixtures, shaped like normalized FACEIT data (not real players).
 * Only imported by tests.
 */
import type { LifetimeStats, MapStats, PlayerData, RecentMatch } from "@/lib/faceit/types";
import { referenceFor } from "./reference";

export const LEVEL = 6;
export const typical = referenceFor(LEVEL);

export function lifetime(over: Partial<LifetimeStats> = {}): LifetimeStats {
  return {
    matches: 400,
    wins: 200,
    winRate: 50,
    kd: 1.0,
    adr: typical.adr.ref,
    headshotPct: typical.headshotPct.ref,
    avgKills: 18,
    longestWinStreak: 6,
    recentResults: [true, false, true, false, true],
    extendedRounds: 5000,
    entryRate: 0.2,
    entrySuccess: typical.entrySuccess.ref,
    entryCount: 1000,
    clutch1v1Rate: typical.clutch1v1.ref,
    clutch1v1Count: 100,
    clutch1v2Rate: 0.15,
    clutch1v2Count: 100,
    flashesPerRound: typical.flashesPerRound.ref,
    enemiesFlashedPerRound: typical.enemiesFlashedPerRound.ref,
    flashSuccess: typical.flashSuccess.ref,
    utilityDamagePerRound: typical.utilityDamagePerRound.ref,
    sniperKillRate: 0.04,
    entryWins: 500,
    clutch1v1Wins: 38,
    enemiesFlashedTotal: 1500,
    ...over,
  };
}

export function map(name: string, over: Partial<MapStats> = {}): MapStats {
  return { map: name, image: null, matches: 60, wins: 30, winRate: 50, kd: 1, adr: 79, avgKills: 18, headshotPct: 47, ...over };
}

export function recent(adrs: number[]): RecentMatch[] {
  return adrs.map((adr, i) => ({
    id: `m${i}`,
    map: "Mirage",
    won: i % 2 === 0,
    score: "13 / 10",
    kills: 18,
    deaths: 18,
    assists: 4,
    kd: 1,
    adr,
    headshotPct: 47,
    rounds: 23,
    finishedAt: null,
  }));
}

export function player(over: Partial<PlayerData> = {}): PlayerData {
  return {
    profile: {
      id: "p1",
      nickname: "tester",
      avatar: null,
      country: "se",
      region: "EU",
      level: LEVEL,
      elo: 1300,
      steamId64: null,
      faceitUrl: null,
    },
    lifetime: lifetime(),
    maps: [map("Mirage"), map("Inferno"), map("Nuke")],
    recentMatches: recent([55, 100, 75, 105, 60, 90, 68, 98, 58, 82]),
    fetchedAt: new Date(0).toISOString(),
    ...over,
  };
}
