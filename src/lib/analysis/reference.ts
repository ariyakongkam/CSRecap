import baselines from "./baselines.json";

/**
 * Reference points the analysis compares a player against.
 *
 * Two kinds:
 *  - GROUNDED: true by construction of the game, valid at every level.
 *      K/D 1.0, win rate 50%, opening-duel rate 0.2 (2 of 10 players take each
 *      round's opening duel).
 *  - PER LEVEL: medians of FACEIT players at the player's own skill level
 *      (≥300 rounds of extended stats each), from `baselines.json`, built by
 *      `scripts/build-baselines.ts` from the FACEIT Data API. Covers ADR,
 *      headshot %, 1v1 win rate, opening-duel success and the utility stats.
 *
 * `REFERENCE` holds the level-independent fallbacks, used when the player's
 * level is unknown or a level has too few sampled players for a metric. The
 * sampled fallbacks are medians of 60 EU players at levels 8–10 (Nov 2026), so
 * they skew towards stronger players and copy built on them never says "for
 * your level". Opening-duel success falls back to the grounded 50% (every
 * opening duel has one winner and one loser).
 *
 * `spread` ≈ half the interquartile range: one spread away from the reference
 * is "notable", two is "strong".
 */

export interface Reference {
  ref: number;
  spread: number;
  /** Set when the reference comes from players at this FACEIT level. */
  level?: number;
}

export const REFERENCE = {
  // grounded
  kd: { ref: 1.0, spread: 0.1 },
  winRate: { ref: 50, spread: 3 },
  entryRate: { ref: 0.2, spread: 0.03 },
  entrySuccess: { ref: 0.5, spread: 0.03 },
  // sampled (levels 8–10)
  adr: { ref: 79, spread: 5 },
  headshotPct: { ref: 47, spread: 4 },
  clutch1v1: { ref: 0.38, spread: 0.03 },
  flashSuccess: { ref: 0.48, spread: 0.04 },
  flashesPerRound: { ref: 0.45, spread: 0.15 },
  enemiesFlashedPerRound: { ref: 0.3, spread: 0.1 },
  utilityDamagePerRound: { ref: 4.4, spread: 0.9 },
} satisfies Record<string, Reference>;

export type ReferenceKey = keyof typeof REFERENCE;
export type ReferenceSet = Record<ReferenceKey, Reference>;

/** Metrics `baselines.json` provides per level. */
export const LEVEL_KEYS = [
  "adr",
  "headshotPct",
  "clutch1v1",
  "entrySuccess",
  "flashSuccess",
  "flashesPerRound",
  "enemiesFlashedPerRound",
  "utilityDamagePerRound",
] as const satisfies readonly ReferenceKey[];

/** Fewest sampled players a level needs for a metric before we trust its median. */
export const MIN_LEVEL_SAMPLE = 40;

/**
 * Smallest spread a per-level reference may have. FACEIT reports rates to two
 * decimals, so a tight level (e.g. 1v1 win rate at level 10) can show an IQR of
 * only a couple of hundredths, which would make tiny differences look "strong".
 */
const MIN_SPREAD: Record<(typeof LEVEL_KEYS)[number], number> = {
  adr: 3,
  headshotPct: 3,
  clutch1v1: 0.025,
  entrySuccess: 0.025,
  flashSuccess: 0.025,
  flashesPerRound: 0.05,
  enemiesFlashedPerRound: 0.05,
  utilityDamagePerRound: 0.5,
};

interface LevelStat {
  median: number;
  p25: number;
  p75: number;
  n: number;
}
export interface Baselines {
  levels: Record<string, { metrics: Partial<Record<string, LevelStat>> } | undefined>;
}

/**
 * The reference set for a player at `level`: per-level medians where the
 * baseline has enough players, the fallbacks in `REFERENCE` everywhere else.
 */
export function referenceFor(level: number | null | undefined, source: Baselines = baselines): ReferenceSet {
  const set: ReferenceSet = { ...REFERENCE };
  const stats = level != null ? source.levels[String(level)]?.metrics : undefined;
  if (!stats) return set;
  for (const key of LEVEL_KEYS) {
    const s = stats[key];
    if (!s || s.n < MIN_LEVEL_SAMPLE) continue;
    const spread = (s.p75 - s.p25) / 2;
    if (!Number.isFinite(s.median) || !Number.isFinite(spread)) continue;
    set[key] = { ref: s.median, spread: Math.max(spread, MIN_SPREAD[key]), level: level! };
  }
  return set;
}

/** Sniper kill share above which someone is clearly the team's AWPer (sample p75 ≈ 0.10). */
export const AWPER_SNIPER_SHARE = 0.2;

/**
 * Match-to-match variation of ADR over the last 20 matches (std / mean).
 * Sample of 40 EU players: p10 0.20, median 0.25, p90 0.31.
 */
export const VARIATION = { consistent: 0.21, streaky: 0.31 };

/** Minimum evidence before we make a claim. */
export const MIN_SAMPLE = {
  /** Lifetime matches for a full report. */
  matches: 10,
  /** Rounds with extended stats before opening-duel / utility claims. */
  extendedRounds: 300,
  /** 1v1 situations before clutch claims. */
  clutches: 20,
  /** Matches on a map before map claims. */
  mapMatches: 10,
  /** Recent matches before form / consistency claims. */
  recentMatches: 8,
};

/** Standardized distance from the reference. Positive = better. */
export function zScore(value: number | null | undefined, r: Reference): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return (value - r.ref) / r.spread;
}
