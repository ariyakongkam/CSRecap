/**
 * Reference points the analysis compares a player against.
 *
 * Two kinds:
 *  - GROUNDED: true by construction of the game, valid at every level.
 *      K/D 1.0, win rate 50%, opening-duel rate 0.2 (2 of 10 players take each
 *      round's opening duel), opening-duel success 50%.
 *  - SAMPLED: medians from a small sample (60 EU players, FACEIT levels 8–10,
 *      ≥300 rounds of extended stats each) pulled from the FACEIT Data API in
 *      Nov 2026. They skew towards stronger players, so they're used with a
 *      wide "spread" and the copy never says "for your level".
 *
 * `spread` ≈ half the interquartile range of the sample: one spread away from
 * the reference is "notable", two is "strong".
 *
 * TODO(baselines): replace SAMPLED values with per-level baselines built from
 * a large FACEIT sample, then compare players against their own level.
 */

export interface Reference {
  ref: number;
  spread: number;
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
