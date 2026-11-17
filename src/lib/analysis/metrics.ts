import type { MapStats, PlayerData } from "@/lib/faceit/types";
import { MIN_SAMPLE, referenceFor, zScore, type ReferenceSet } from "./reference";

/**
 * Derived metrics: everything the rules need, computed once.
 * `z` values are standardized against `ref` (positive = better): per-level
 * baselines for the player's FACEIT level where we have them, the generic
 * REFERENCE otherwise.
 */
export interface Metrics {
  /** The reference points this player is compared against. */
  ref: ReferenceSet;
  matches: number;
  hasEnoughMatches: boolean;
  hasExtended: boolean;

  kd: number;
  adr: number | null;
  headshotPct: number;
  winRate: number;

  entryRate: number | null;
  entrySuccess: number | null;
  clutch1v1Rate: number | null;
  clutch1v1Count: number;
  sniperShare: number | null;

  z: {
    kd: number | null;
    adr: number | null;
    headshotPct: number | null;
    winRate: number | null;
    entryRate: number | null;
    entrySuccess: number | null;
    clutch1v1: number | null;
    /** Average of the available utility z-scores. */
    utility: number | null;
  };

  recent: {
    count: number;
    kd: number;
    adr: number | null;
    winRate: number;
    /** Coefficient of variation of per-match ADR (or kills/round when ADR is missing). */
    variation: number | null;
  } | null;

  maps: {
    qualified: MapStats[];
    best: MapStats | null;
    worst: MapStats | null;
  };
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function coefficientOfVariation(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs);
  if (m <= 0) return null;
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance) / m;
}

export function computeMetrics(data: PlayerData): Metrics {
  const { lifetime: lt, maps, recentMatches } = data;
  const hasExtended = lt.extendedRounds >= MIN_SAMPLE.extendedRounds;
  const ref = referenceFor(data.profile.level);

  const utilityZs = hasExtended
    ? [
        zScore(lt.flashSuccess, ref.flashSuccess),
        zScore(lt.enemiesFlashedPerRound, ref.enemiesFlashedPerRound),
        zScore(lt.utilityDamagePerRound, ref.utilityDamagePerRound),
        zScore(lt.flashesPerRound, ref.flashesPerRound),
      ].filter((z): z is number => z !== null)
    : [];

  // Recent form
  let recent: Metrics["recent"] = null;
  if (recentMatches.length >= MIN_SAMPLE.recentMatches) {
    const kills = recentMatches.reduce((s, m) => s + m.kills, 0);
    const deaths = recentMatches.reduce((s, m) => s + m.deaths, 0);
    const adrs = recentMatches.map((m) => m.adr).filter((a): a is number => a !== null);
    const perRound = recentMatches
      .filter((m) => m.rounds && m.rounds > 0)
      .map((m) => m.kills / (m.rounds as number));
    recent = {
      count: recentMatches.length,
      kd: deaths > 0 ? kills / deaths : kills,
      adr: adrs.length === recentMatches.length ? mean(adrs) : null,
      winRate: (recentMatches.filter((m) => m.won).length / recentMatches.length) * 100,
      variation:
        adrs.length >= MIN_SAMPLE.recentMatches ? coefficientOfVariation(adrs) : coefficientOfVariation(perRound),
    };
  }

  // Maps: only those with enough matches; best/worst need a real gap to the player's own average.
  const qualified = maps.filter((m) => m.matches >= MIN_SAMPLE.mapMatches);
  let best: MapStats | null = null;
  let worst: MapStats | null = null;
  if (qualified.length >= 2) {
    const byWin = [...qualified].sort((a, b) => b.winRate - a.winRate || b.kd - a.kd);
    if (byWin[0].winRate - lt.winRate >= 5) best = byWin[0];
    const last = byWin[byWin.length - 1];
    if (lt.winRate - last.winRate >= 5 && last !== best) worst = last;
  }

  return {
    ref,
    matches: lt.matches,
    hasEnoughMatches: lt.matches >= MIN_SAMPLE.matches,
    hasExtended,
    kd: lt.kd,
    adr: lt.adr,
    headshotPct: lt.headshotPct,
    winRate: lt.winRate,
    entryRate: hasExtended ? lt.entryRate : null,
    entrySuccess: hasExtended && lt.entryCount >= 30 ? lt.entrySuccess : null,
    clutch1v1Rate: lt.clutch1v1Count >= MIN_SAMPLE.clutches ? lt.clutch1v1Rate : null,
    clutch1v1Count: lt.clutch1v1Count,
    sniperShare: hasExtended ? lt.sniperKillRate : null,
    z: {
      kd: zScore(lt.kd, ref.kd),
      adr: zScore(lt.adr, ref.adr),
      headshotPct: zScore(lt.headshotPct, ref.headshotPct),
      winRate: zScore(lt.winRate, ref.winRate),
      entryRate: hasExtended ? zScore(lt.entryRate, ref.entryRate) : null,
      entrySuccess: hasExtended && lt.entryCount >= 30 ? zScore(lt.entrySuccess, ref.entrySuccess) : null,
      clutch1v1: lt.clutch1v1Count >= MIN_SAMPLE.clutches ? zScore(lt.clutch1v1Rate, ref.clutch1v1) : null,
      utility: utilityZs.length >= 2 ? mean(utilityZs) : null,
    },
    recent,
    maps: { qualified, best, worst },
  };
}
