/**
 * Normalized player data used across CSRecap.
 *
 * Everything here comes straight from the FACEIT Data API (v4). Raw FACEIT
 * responses use string values and inconsistent units; `client.ts` converts them
 * into these shapes so the rest of the app never touches raw API payloads.
 */

export interface PlayerProfile {
  id: string;
  nickname: string;
  avatar: string | null;
  country: string | null;
  region: string | null;
  level: number | null;
  elo: number | null;
  steamId64: string | null;
  faceitUrl: string | null;
}

/** Career (lifetime) CS2 stats. Rates are 0–1 fractions, percentages are 0–100. */
export interface LifetimeStats {
  matches: number;
  wins: number;
  /** 0–100 */
  winRate: number;
  kd: number;
  adr: number | null;
  /** 0–100 */
  headshotPct: number;
  /** Average kills per match, derived from per-map totals. */
  avgKills: number | null;
  longestWinStreak: number | null;
  /** Most recent first: true = win. */
  recentResults: boolean[];

  /**
   * "Extended" stats (opening duels, clutches, utility) only exist for matches
   * FACEIT has detailed data for. `extendedRounds` tells us how much evidence
   * backs them.
   */
  extendedRounds: number;
  /** Opening duels taken per round (0–1). Each round has exactly one opening duel. */
  entryRate: number | null;
  /** Share of opening duels won (0–1). */
  entrySuccess: number | null;
  entryCount: number;
  /** 1v1 clutch win rate (0–1). */
  clutch1v1Rate: number | null;
  clutch1v1Count: number;
  clutch1v2Rate: number | null;
  clutch1v2Count: number;
  flashesPerRound: number | null;
  enemiesFlashedPerRound: number | null;
  /** Share of flashes that blinded at least one enemy (0–1). */
  flashSuccess: number | null;
  utilityDamagePerRound: number | null;
  /** Share of kills made with a sniper rifle (0–1). */
  sniperKillRate: number | null;
}

export interface MapStats {
  /** Display name, e.g. "Mirage". */
  map: string;
  image: string | null;
  matches: number;
  wins: number;
  /** 0–100 */
  winRate: number;
  kd: number;
  adr: number | null;
  avgKills: number | null;
  /** 0–100 */
  headshotPct: number;
}

export interface RecentMatch {
  id: string;
  /** Display name, e.g. "Mirage". */
  map: string;
  won: boolean;
  score: string | null;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  adr: number | null;
  /** 0–100 */
  headshotPct: number;
  rounds: number | null;
  finishedAt: string | null;
}

export interface PlayerData {
  profile: PlayerProfile;
  lifetime: LifetimeStats;
  maps: MapStats[];
  /** Most recent first; up to 20 matches. */
  recentMatches: RecentMatch[];
  fetchedAt: string;
}
