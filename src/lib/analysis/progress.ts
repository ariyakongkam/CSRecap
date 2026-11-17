import type { LifetimeStats, PlayerData, PlayerProfile, RecentMatch } from "@/lib/faceit/types";
import type { FocusPlan, FocusTarget, TargetKey } from "./types";

/**
 * Progress tracking without accounts: when a player starts tracking their
 * focus goal we keep (in their browser) the target and a snapshot of their
 * career totals. Later, the same player's fresh FACEIT data tells us how
 * they've done since:
 *
 *  - ADR, K/D, HS %, win rate, map win rate: from the per-match stats of
 *    matches finished after the snapshot.
 *  - Opening duels, 1v1s, enemies flashed: FACEIT only has these as career
 *    totals, so we diff the totals now against the snapshot.
 *
 * Pure: same goal + same data, same result.
 */

export const TRACKING_VERSION = 1;

/** The slice of player data tracking needs (small enough to hand to the browser). */
export type ProgressData = Pick<PlayerData, "lifetime" | "recentMatches" | "fetchedAt"> & {
  profile: Pick<PlayerProfile, "id">;
};

export function progressData(data: PlayerData): ProgressData {
  return { profile: { id: data.profile.id }, lifetime: data.lifetime, recentMatches: data.recentMatches, fetchedAt: data.fetchedAt };
}

/** Career totals we diff later. */
export type TrackingBaseline = Pick<
  LifetimeStats,
  "entryWins" | "entryCount" | "clutch1v1Wins" | "clutch1v1Count" | "enemiesFlashedTotal" | "extendedRounds"
>;

export interface TrackedGoal {
  v: typeof TRACKING_VERSION;
  playerId: string;
  /** Focus goal title, e.g. "Fix your Nuke". */
  goal: string;
  target: FocusTarget;
  /** When the report data was fetched (ISO). Matches finished after this count. */
  since: string;
  baseline: TrackingBaseline;
}

export type ProgressStatus = "waiting" | "reached" | "improving" | "holding" | "slipping";

export interface Progress {
  /** Matches finished since tracking started (within the recent matches FACEIT returns). */
  matchesSince: number;
  /** The target metric measured over just the period since tracking started. */
  value: number | null;
  /** How much new evidence there is, and how much we want before giving a verdict. */
  evidence: { count: number; needed: number; unit: string };
  status: ProgressStatus;
  /** Share of the way from start to goal (0–1, clamped). */
  towardGoal: number;
  /** A small sample: a verdict, but an early one. */
  early: boolean;
  /** Every recent match FACEIT returned is after the start, so older ones since then may be missing. */
  windowFull: boolean;
}

/** Minimum new evidence before we say anything. */
export const MIN_EVIDENCE: Record<TargetKey, { needed: number; unit: string }> = {
  adr: { needed: 3, unit: "matches" },
  kd: { needed: 3, unit: "matches" },
  headshotPct: { needed: 3, unit: "matches" },
  winRate: { needed: 5, unit: "matches" },
  mapWinRate: { needed: 3, unit: "matches" },
  entrySuccess: { needed: 15, unit: "opening duels" },
  clutch1v1: { needed: 8, unit: "1v1s" },
  enemiesFlashedPerRound: { needed: 150, unit: "rounds" },
};

/** Changes smaller than this count as "holding steady" rather than up or down. */
const HOLD: Record<TargetKey, number> = {
  adr: 2,
  kd: 0.03,
  headshotPct: 1.5,
  winRate: 3,
  mapWinRate: 5,
  entrySuccess: 0.02,
  clutch1v1: 0.03,
  enemiesFlashedPerRound: 0.03,
};

/** Evidence below this multiple of the minimum is an early read. */
const SOLID_MULTIPLE = 3;

/** The tracking record for a report's focus goal, or null when the goal has no measurable target. */
export function startTracking(plan: FocusPlan, data: ProgressData): TrackedGoal | null {
  if (!plan.target) return null;
  const lt = data.lifetime;
  return {
    v: TRACKING_VERSION,
    playerId: data.profile.id,
    goal: plan.goal,
    target: plan.target,
    since: data.fetchedAt,
    baseline: {
      entryWins: lt.entryWins,
      entryCount: lt.entryCount,
      clutch1v1Wins: lt.clutch1v1Wins,
      clutch1v1Count: lt.clutch1v1Count,
      enemiesFlashedTotal: lt.enemiesFlashedTotal,
      extendedRounds: lt.extendedRounds,
    },
  };
}

/** Validates a tracking record read back from storage (it may be old, edited or corrupt). */
export function parseTrackedGoal(raw: unknown, playerId: string): TrackedGoal | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<TrackedGoal>;
  if (g.v !== TRACKING_VERSION || g.playerId !== playerId || typeof g.goal !== "string") return null;
  if (typeof g.since !== "string" || !Number.isFinite(Date.parse(g.since))) return null;
  const t = g.target;
  if (!t || typeof t !== "object" || !(t.key in MIN_EVIDENCE)) return null;
  if (!Number.isFinite(t.start) || !Number.isFinite(t.goalValue) || typeof t.metric !== "string") return null;
  if (t.key === "mapWinRate" && typeof t.map !== "string") return null;
  const b = g.baseline;
  if (!b || typeof b !== "object") return null;
  const keys: (keyof TrackingBaseline)[] = [
    "entryWins",
    "entryCount",
    "clutch1v1Wins",
    "clutch1v1Count",
    "enemiesFlashedTotal",
    "extendedRounds",
  ];
  if (!keys.every((k) => Number.isFinite(b[k]))) return null;
  return g as TrackedGoal;
}

function matchesSince(recent: RecentMatch[], since: string): RecentMatch[] {
  const start = Date.parse(since);
  return recent.filter((m) => m.finishedAt !== null && Date.parse(m.finishedAt) > start);
}

/** The target metric over `ms`, plus how many matches it rests on. */
function fromMatches(key: TargetKey, ms: RecentMatch[], map?: string): { value: number | null; count: number } {
  const pool = key === "mapWinRate" ? ms.filter((m) => m.map.toLowerCase() === map?.toLowerCase()) : ms;
  if (pool.length === 0) return { value: null, count: 0 };
  const sum = (f: (m: RecentMatch) => number) => pool.reduce((s, m) => s + f(m), 0);

  switch (key) {
    case "adr": {
      const withAdr = pool.filter((m) => m.adr !== null);
      if (withAdr.length === 0) return { value: null, count: 0 };
      // Weight by rounds so a 30-round match counts more than a 16-round stomp.
      const weighted = withAdr.filter((m) => m.rounds && m.rounds > 0);
      const value =
        weighted.length === withAdr.length
          ? weighted.reduce((s, m) => s + m.adr! * m.rounds!, 0) / weighted.reduce((s, m) => s + m.rounds!, 0)
          : withAdr.reduce((s, m) => s + m.adr!, 0) / withAdr.length;
      return { value, count: withAdr.length };
    }
    case "kd": {
      const deaths = sum((m) => m.deaths);
      return { value: deaths > 0 ? sum((m) => m.kills) / deaths : sum((m) => m.kills), count: pool.length };
    }
    case "headshotPct": {
      const kills = sum((m) => m.kills);
      return { value: kills > 0 ? sum((m) => (m.headshotPct * m.kills) / 100) / kills * 100 : null, count: pool.length };
    }
    case "winRate":
    case "mapWinRate":
      return { value: (pool.filter((m) => m.won).length / pool.length) * 100, count: pool.length };
    default:
      return { value: null, count: 0 };
  }
}

/** The target metric from the change in career totals since the snapshot. */
function fromTotals(key: TargetKey, now: LifetimeStats, then: TrackingBaseline): { value: number | null; count: number } {
  const delta = (a: number, b: number) => Math.max(0, a - b);
  switch (key) {
    case "entrySuccess": {
      const count = delta(now.entryCount, then.entryCount);
      return { value: count > 0 ? Math.min(1, delta(now.entryWins, then.entryWins) / count) : null, count };
    }
    case "clutch1v1": {
      const count = delta(now.clutch1v1Count, then.clutch1v1Count);
      return { value: count > 0 ? Math.min(1, delta(now.clutch1v1Wins, then.clutch1v1Wins) / count) : null, count };
    }
    case "enemiesFlashedPerRound": {
      const count = delta(now.extendedRounds, then.extendedRounds);
      return { value: count > 0 ? delta(now.enemiesFlashedTotal, then.enemiesFlashedTotal) / count : null, count };
    }
    default:
      return { value: null, count: 0 };
  }
}

const FROM_TOTALS = new Set<TargetKey>(["entrySuccess", "clutch1v1", "enemiesFlashedPerRound"]);

export function measureProgress(goal: TrackedGoal, data: ProgressData): Progress {
  const { target } = goal;
  const since = matchesSince(data.recentMatches, goal.since);
  const measured = FROM_TOTALS.has(target.key)
    ? fromTotals(target.key, data.lifetime, goal.baseline)
    : fromMatches(target.key, since, target.map);
  const { needed } = MIN_EVIDENCE[target.key];
  const unit = target.key === "mapWinRate" ? `matches on ${target.map}` : MIN_EVIDENCE[target.key].unit;

  const base = {
    matchesSince: since.length,
    evidence: { count: measured.count, needed, unit },
    windowFull: since.length > 0 && since.length === data.recentMatches.length,
  };

  if (measured.value === null || measured.count < needed) {
    return { ...base, value: measured.value, status: "waiting", towardGoal: 0, early: true };
  }

  const value = measured.value;
  const gap = target.goalValue - target.start;
  const towardGoal = gap > 0 ? Math.min(1, Math.max(0, (value - target.start) / gap)) : value >= target.goalValue ? 1 : 0;
  const change = value - target.start;
  const status: ProgressStatus =
    value >= target.goalValue
      ? "reached"
      : change > HOLD[target.key]
        ? "improving"
        : change < -HOLD[target.key]
          ? "slipping"
          : "holding";

  return { ...base, value, status, towardGoal, early: measured.count < needed * SOLID_MULTIPLE };
}
