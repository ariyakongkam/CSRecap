import { describe, expect, it } from "vitest";
import type { LifetimeStats, PlayerData, RecentMatch } from "@/lib/faceit/types";
import { lifetime, map, player } from "./fixtures";
import { analyzePlayer } from "./index";
import { measureProgress, parseTrackedGoal, progressData, startTracking, type TrackedGoal } from "./progress";
import type { FocusPlan, FocusTarget } from "./types";

const START = "2026-11-01T12:00:00.000Z";
const day = (n: number) => new Date(Date.parse(START) + n * 86_400_000).toISOString();

function match(over: Partial<RecentMatch> & { finishedAt: string }): RecentMatch {
  return {
    id: over.finishedAt,
    map: "Mirage",
    won: true,
    score: "13 / 10",
    kills: 20,
    deaths: 16,
    assists: 4,
    kd: 1.25,
    adr: 80,
    headshotPct: 50,
    rounds: 23,
    ...over,
  };
}

function plan(target: Omit<FocusTarget, "current" | "goal">): FocusPlan {
  return {
    goal: "Test goal",
    why: "",
    target: { ...target, current: String(target.start), goal: String(target.goalValue) },
    tasks: ["a", "b", "c"],
    insightId: null,
  };
}

/** Tracking started at START, from a snapshot with these career totals. */
function tracked(target: Omit<FocusTarget, "current" | "goal">, lt: Partial<LifetimeStats> = {}): TrackedGoal {
  const data: PlayerData = { ...player({ lifetime: lifetime(lt) }), fetchedAt: START };
  return startTracking(plan(target), progressData(data))!;
}

/** The same player later: new matches and new career totals. */
function later(recentMatches: RecentMatch[], lt: Partial<LifetimeStats> = {}): PlayerData {
  return { ...player({ lifetime: lifetime(lt) }), recentMatches, fetchedAt: day(10) };
}

const ADR = { key: "adr", metric: "ADR", start: 70, goalValue: 75 } as const;

describe("progress from per-match stats", () => {
  it("only counts matches finished after tracking started", () => {
    const g = tracked(ADR);
    const p = measureProgress(
      g,
      later([
        match({ finishedAt: day(3), adr: 80 }),
        match({ finishedAt: day(2), adr: 80 }),
        match({ finishedAt: day(1), adr: 80 }),
        match({ finishedAt: day(-1), adr: 20 }),
        match({ finishedAt: day(-2), adr: 20 }),
      ]),
    );
    expect(p.matchesSince).toBe(3);
    expect(p.value).toBeCloseTo(80);
    expect(p.status).toBe("reached");
    expect(p.towardGoal).toBe(1);
  });

  it("waits for enough matches before giving a verdict", () => {
    const p = measureProgress(tracked(ADR), later([match({ finishedAt: day(1) }), match({ finishedAt: day(-1) })]));
    expect(p.status).toBe("waiting");
    expect(p.evidence).toEqual({ count: 1, needed: 3, unit: "matches" });
  });

  it("weights ADR by rounds", () => {
    const p = measureProgress(
      tracked(ADR),
      later([
        match({ finishedAt: day(1), adr: 100, rounds: 30 }),
        match({ finishedAt: day(2), adr: 50, rounds: 10 }),
        match({ finishedAt: day(3), adr: 50, rounds: 10 }),
      ]),
    );
    expect(p.value).toBeCloseTo((100 * 30 + 50 * 20) / 50);
  });

  it("tells improving, holding and slipping apart", () => {
    const at = (adr: number) =>
      measureProgress(tracked(ADR), later([1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => match({ finishedAt: day(d), adr })))).status;
    expect(at(73)).toBe("improving");
    expect(at(71)).toBe("holding");
    expect(at(64)).toBe("slipping");
  });

  it("marks a small sample as an early read", () => {
    const three = later([1, 2, 3].map((d) => match({ finishedAt: day(d), adr: 73 })));
    const nine = later([1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => match({ finishedAt: day(d), adr: 73 })));
    expect(measureProgress(tracked(ADR), three).early).toBe(true);
    expect(measureProgress(tracked(ADR), nine).early).toBe(false);
  });

  it("measures K/D from total kills and deaths", () => {
    const g = tracked({ key: "kd", metric: "K/D", start: 0.9, goalValue: 1.0 });
    const p = measureProgress(
      g,
      later([
        match({ finishedAt: day(1), kills: 30, deaths: 10 }),
        match({ finishedAt: day(2), kills: 5, deaths: 20 }),
        match({ finishedAt: day(3), kills: 10, deaths: 15 }),
      ]),
    );
    expect(p.value).toBeCloseTo(45 / 45);
    expect(p.status).toBe("reached");
  });

  it("measures a map's win rate on that map only", () => {
    const g = tracked({ key: "mapWinRate", metric: "Nuke win rate", start: 35, goalValue: 43, map: "Nuke" });
    const p = measureProgress(
      g,
      later([
        match({ finishedAt: day(1), map: "Nuke", won: true }),
        match({ finishedAt: day(2), map: "Nuke", won: false }),
        match({ finishedAt: day(3), map: "Nuke", won: true }),
        match({ finishedAt: day(4), map: "Mirage", won: false }),
        match({ finishedAt: day(5), map: "Mirage", won: false }),
      ]),
    );
    expect(p.evidence).toEqual({ count: 3, needed: 3, unit: "matches on Nuke" });
    expect(p.value).toBeCloseTo(66.67, 1);
    expect(p.status).toBe("reached");
  });

  it("flags when every visible match is after the start", () => {
    const ms = [1, 2, 3, 4].map((d) => match({ finishedAt: day(d) }));
    expect(measureProgress(tracked(ADR), later(ms)).windowFull).toBe(true);
    expect(measureProgress(tracked(ADR), later([...ms, match({ finishedAt: day(-1) })])).windowFull).toBe(false);
  });
});

describe("progress from career totals", () => {
  const ENTRY = { key: "entrySuccess", metric: "Opening duels won", start: 0.42, goalValue: 0.47 } as const;

  it("measures opening duels over just the duels since the start", () => {
    const g = tracked(ENTRY, { entryCount: 1000, entryWins: 420 });
    // 40 new duels, 20 won: 50% since, although the career rate barely moves.
    const p = measureProgress(g, later([], { entryCount: 1040, entryWins: 440 }));
    expect(p.value).toBeCloseTo(0.5);
    expect(p.evidence).toEqual({ count: 40, needed: 15, unit: "opening duels" });
    expect(p.status).toBe("reached");
  });

  it("waits until there are enough new opening duels", () => {
    const g = tracked(ENTRY, { entryCount: 1000, entryWins: 420 });
    expect(measureProgress(g, later([], { entryCount: 1010, entryWins: 410 + 10 })).status).toBe("waiting");
  });

  it("measures 1v1s and enemies flashed the same way", () => {
    const clutch = tracked({ key: "clutch1v1", metric: "1v1s won", start: 0.3, goalValue: 0.35 }, {
      clutch1v1Count: 100,
      clutch1v1Wins: 30,
    });
    expect(measureProgress(clutch, later([], { clutch1v1Count: 110, clutch1v1Wins: 32 })).value).toBeCloseTo(0.2);

    const flash = tracked({ key: "enemiesFlashedPerRound", metric: "Enemies flashed / round", start: 0.2, goalValue: 0.3 }, {
      extendedRounds: 5000,
      enemiesFlashedTotal: 1000,
    });
    const p = measureProgress(flash, later([], { extendedRounds: 5200, enemiesFlashedTotal: 1060 }));
    expect(p.value).toBeCloseTo(0.3);
    expect(p.status).toBe("reached");
  });

  it("never reports negative evidence if totals go backwards", () => {
    const g = tracked(ENTRY, { entryCount: 1000, entryWins: 420 });
    const p = measureProgress(g, later([], { entryCount: 900, entryWins: 400 }));
    expect(p.evidence.count).toBe(0);
    expect(p.status).toBe("waiting");
  });
});

describe("tracking records", () => {
  it("starts from the report's own focus target and fetch time", () => {
    const data = player({
      maps: [map("Mirage", { winRate: 58 }), map("Inferno"), map("Nuke", { winRate: 38, matches: 40 })],
    });
    const report = analyzePlayer(data);
    const g = startTracking(report.focus, progressData(data))!;
    expect(g.target.key).toBe("mapWinRate");
    expect(g.target.map).toBe("Nuke");
    expect(g.target.start).toBe(38);
    expect(g.since).toBe(data.fetchedAt);
    expect(g.baseline.entryCount).toBe(data.lifetime.entryCount);
  });

  it("does not track a goal without a measurable target", () => {
    expect(startTracking({ ...plan(ADR), target: null }, progressData(player()))).toBeNull();
  });

  it("round-trips through JSON and rejects bad or foreign records", () => {
    const g = tracked(ADR);
    expect(parseTrackedGoal(JSON.parse(JSON.stringify(g)), g.playerId)).toEqual(g);
    expect(parseTrackedGoal(g, "someone-else")).toBeNull();
    expect(parseTrackedGoal({ ...g, v: 0 }, g.playerId)).toBeNull();
    expect(parseTrackedGoal({ ...g, target: { ...g.target, key: "nope" } }, g.playerId)).toBeNull();
    expect(parseTrackedGoal({ ...g, baseline: { ...g.baseline, entryWins: "x" } }, g.playerId)).toBeNull();
    expect(parseTrackedGoal("garbage", g.playerId)).toBeNull();
    expect(parseTrackedGoal(null, g.playerId)).toBeNull();
  });
});

describe("focus targets", () => {
  it("carry raw numbers that match their formatted text", () => {
    const cases: [PlayerData, FocusTarget["key"], string, number][] = [
      [player({ lifetime: lifetime({ entryRate: 0.28, entrySuccess: 0.42 }) }), "entrySuccess", "42%", 0.42],
      [player({ lifetime: lifetime({ headshotPct: 56, kd: 0.88, adr: 72 }) }), "kd", "0.88", 0.88],
      [player({ maps: [map("Mirage", { winRate: 58 }), map("Inferno"), map("Nuke", { winRate: 38, matches: 40 })] }), "mapWinRate", "38%", 38],
    ];
    for (const [data, key, current, start] of cases) {
      const t = analyzePlayer(data).focus.target!;
      expect(t.key).toBe(key);
      expect(t.current).toBe(current);
      expect(t.start).toBeCloseTo(start);
      expect(t.goalValue).toBeGreaterThan(t.start);
    }
  });
});
