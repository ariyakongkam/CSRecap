import { describe, expect, it } from "vitest";
import type { LifetimeStats, MapStats, PlayerData, RecentMatch } from "@/lib/faceit/types";
import { analyzePlayer } from "./index";
import { MIN_LEVEL_SAMPLE, REFERENCE, referenceFor, type Baselines } from "./reference";

// Synthetic fixtures — shaped like normalized FACEIT data, not real players.
// The default player is level 6 and exactly typical for that level.

const LEVEL = 6;
const typical = referenceFor(LEVEL);

function lifetime(over: Partial<LifetimeStats> = {}): LifetimeStats {
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
    ...over,
  };
}

function map(name: string, over: Partial<MapStats> = {}): MapStats {
  return { map: name, image: null, matches: 60, wins: 30, winRate: 50, kd: 1, adr: 79, avgKills: 18, headshotPct: 47, ...over };
}

function recent(adrs: number[]): RecentMatch[] {
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

function player(over: Partial<PlayerData> = {}): PlayerData {
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

describe("analyzePlayer", () => {
  it("calls an average player balanced and still produces a plan", () => {
    const r = analyzePlayer(player());
    expect(r.playstyle.id).toBe("balanced");
    expect(r.focus.tasks).toHaveLength(3);
    expect(r.summary.length).toBeGreaterThan(0);
  });

  it("detects an aggressive entry who loses too many opening duels", () => {
    const r = analyzePlayer(player({ lifetime: lifetime({ entryRate: 0.28, entrySuccess: 0.42 }) }));
    expect(r.playstyle.id).toBe("entry");
    expect(r.weaknesses[0].id).toBe("opening_overcommit");
    expect(r.focus.goal).toBe("Pick your opening duels");
    expect(r.focus.target?.current).toBe("42%");
  });

  it("detects an AWPer from sniper kill share", () => {
    const r = analyzePlayer(player({ lifetime: lifetime({ sniperKillRate: 0.35 }) }));
    expect(r.playstyle.id).toBe("awper");
  });

  it("flags good aim but poor K/D as a fight-selection problem, not aim", () => {
    const r = analyzePlayer(player({ lifetime: lifetime({ headshotPct: 56, kd: 0.88, adr: 72 }) }));
    const ids = r.weaknesses.map((w) => w.id);
    expect(ids).toContain("conversion");
    expect(ids).not.toContain("aim_low");
  });

  it("names the worst map with its real win rate", () => {
    const r = analyzePlayer(
      player({ maps: [map("Mirage", { winRate: 58 }), map("Inferno"), map("Nuke", { winRate: 38, matches: 40 })] }),
    );
    const worst = r.weaknesses.find((w) => w.id === "map_worst_nuke");
    expect(worst?.evidence).toContain("38%");
    expect(r.strengths.some((s) => s.id === "map_best_mirage")).toBe(true);
  });

  it("does not claim opening-duel or utility insights without detailed data", () => {
    const r = analyzePlayer(
      player({ lifetime: lifetime({ extendedRounds: 50, entryRate: 0.3, entrySuccess: 0.3, enemiesFlashedPerRound: 0 }) }),
    );
    const cats = [...r.strengths, ...r.weaknesses].map((i) => i.category);
    expect(cats).not.toContain("opening");
    expect(cats).not.toContain("utility");
    expect(r.dataNotes.length).toBeGreaterThan(0);
  });

  it("warns when there are too few matches", () => {
    const r = analyzePlayer(player({ lifetime: lifetime({ matches: 3 }), recentMatches: [] }));
    expect(r.playstyle.confidence).toBe("low");
    expect(r.dataNotes[0]).toContain("3 matches");
  });

  it("detects a streaky player from match-to-match variation", () => {
    const r = analyzePlayer(player({ recentMatches: recent([40, 120, 55, 110, 45, 130, 60, 100, 50, 115]) }));
    expect(r.weaknesses.some((w) => w.id === "consistency_low")).toBe(true);
  });

  it("never returns more than 3 strengths or weaknesses", () => {
    const r = analyzePlayer(
      player({
        lifetime: lifetime({ kd: 1.4, adr: 95, headshotPct: 58, entrySuccess: 0.6, clutch1v1Rate: 0.5, winRate: 62 }),
        maps: [map("Mirage", { winRate: 70 }), map("Inferno", { winRate: 55 })],
      }),
    );
    expect(r.strengths.length).toBeLessThanOrEqual(3);
    expect(r.weaknesses.length).toBeLessThanOrEqual(3);
  });
});

describe("playstyle", () => {
  it("recognises a consistent rifler with a positive K/D", () => {
    const r = analyzePlayer(
      player({ lifetime: lifetime({ kd: 1.08 }), recentMatches: recent([70, 88, 75, 92, 80, 72, 85, 78, 90, 74]) }),
    );
    expect(r.playstyle.id).toBe("consistent");
  });
});

describe("summary copy", () => {
  it("uses the right article and keeps map names capitalised", () => {
    const r = analyzePlayer(
      player({
        lifetime: lifetime({ kd: 1.3, adr: 95 }),
        maps: [map("Mirage"), map("Inferno"), map("Anubis", { winRate: 35 })],
      }),
    );
    expect(r.summary[0]).toMatch(/^You play like an impact fragger\./);
    expect(r.summary.join(" ")).not.toMatch(/ a impact/);
    expect(r.summary.join(" ")).toContain("fix your Anubis");
    // the impact playstyle already covers firepower, so the strength line should be something else
    expect(r.summary.filter((s) => s.includes("95 damage")).length).toBeLessThanOrEqual(1);
  });
});

describe("per-level references", () => {
  const synthetic: Baselines = {
    levels: {
      "3": {
        metrics: {
          adr: { median: 70, p25: 64, p75: 76, n: 200 },
          clutch1v1: { median: 0.36, p25: 0.355, p75: 0.365, n: 200 },
          headshotPct: { median: 40, p25: 36, p75: 44, n: MIN_LEVEL_SAMPLE - 1 },
        },
      },
    },
  };

  it("uses the level's median and half its IQR", () => {
    expect(referenceFor(3, synthetic).adr).toEqual({ ref: 70, spread: 6, level: 3 });
  });

  it("falls back per metric when the level has too few players or no data", () => {
    const r = referenceFor(3, synthetic);
    expect(r.headshotPct).toEqual(REFERENCE.headshotPct);
    expect(r.utilityDamagePerRound).toEqual(REFERENCE.utilityDamagePerRound);
  });

  it("falls back entirely when the level is unknown or not in the baselines", () => {
    expect(referenceFor(null, synthetic)).toEqual(REFERENCE);
    expect(referenceFor(7, synthetic)).toEqual(REFERENCE);
  });

  it("keeps grounded references regardless of level", () => {
    const r = referenceFor(3, synthetic);
    expect(r.kd).toEqual(REFERENCE.kd);
    expect(r.winRate).toEqual(REFERENCE.winRate);
    expect(r.entryRate).toEqual(REFERENCE.entryRate);
  });

  it("does not let a tiny IQR make small differences look strong", () => {
    expect(referenceFor(3, synthetic).clutch1v1.spread).toBeGreaterThanOrEqual(0.02);
  });

  it("has enough sampled players for every level and metric in the committed baselines", () => {
    for (let level = 1; level <= 10; level++) {
      const r = referenceFor(level);
      for (const key of ["adr", "headshotPct", "clutch1v1", "entrySuccess", "flashSuccess", "utilityDamagePerRound"] as const) {
        expect(r[key].level, `level ${level} ${key}`).toBe(level);
      }
    }
  });

  it("expects more from higher levels", () => {
    expect(referenceFor(10).adr.ref).toBeGreaterThan(referenceFor(1).adr.ref);
    expect(referenceFor(10).headshotPct.ref).toBeGreaterThan(referenceFor(1).headshotPct.ref);
  });
});

describe("comparing against the player's own level", () => {
  const low = referenceFor(2);
  const high = referenceFor(10);

  /** A player whose numbers are exactly typical for level 2. */
  function levelTwoStats(): Partial<LifetimeStats> {
    return {
      adr: low.adr.ref,
      headshotPct: low.headshotPct.ref,
      entrySuccess: low.entrySuccess.ref,
      clutch1v1Rate: low.clutch1v1.ref,
      flashesPerRound: low.flashesPerRound.ref,
      enemiesFlashedPerRound: low.enemiesFlashedPerRound.ref,
      flashSuccess: low.flashSuccess.ref,
      utilityDamagePerRound: low.utilityDamagePerRound.ref,
    };
  }

  function atLevel(level: number | null, over: Partial<LifetimeStats>): PlayerData {
    const base = player();
    return { ...base, profile: { ...base.profile, level }, lifetime: lifetime(over) };
  }

  it("does not flag a level 2 player for numbers that are normal at level 2", () => {
    const r = analyzePlayer(atLevel(2, levelTwoStats()));
    const ids = r.weaknesses.map((w) => w.id);
    expect(ids).not.toContain("firepower_low");
    expect(ids).not.toContain("aim_low");
    expect(ids).not.toContain("utility_low");
  });

  it("flags the same numbers at level 10 and says it's about the level", () => {
    // precondition: the two levels really are far apart
    expect(high.adr.ref - low.adr.ref).toBeGreaterThan(high.adr.spread);
    const r = analyzePlayer(atLevel(10, levelTwoStats()));
    const fire = r.weaknesses.find((w) => w.id === "firepower_low");
    expect(fire).toBeDefined();
    expect(fire!.detail).toContain("Players at your level usually sit around");
    expect(fire!.detail).toContain(String(Math.round(high.adr.ref)));
  });

  it("uses the generic copy, never 'your level', when the level is unknown", () => {
    const r = analyzePlayer(atLevel(null, { adr: REFERENCE.adr.ref - 3 * REFERENCE.adr.spread }));
    const fire = r.weaknesses.find((w) => w.id === "firepower_low");
    expect(fire?.detail).toContain("Solid FACEIT players usually sit around");
    expect([...r.strengths, ...r.weaknesses].every((i) => !/your level/.test(i.detail + i.coachLine))).toBe(true);
  });

  it("names the level's typical clutch rate", () => {
    const ref = referenceFor(LEVEL).clutch1v1;
    const r = analyzePlayer(player({ lifetime: lifetime({ clutch1v1Rate: ref.ref - 2 * ref.spread }) }));
    const clutch = r.weaknesses.find((w) => w.id === "clutch_low");
    expect(clutch?.detail).toContain(`Players at your level win around ${Math.round(ref.ref * 100)}%`);
  });

  it("flags low utility against the level, not against high-level players", () => {
    const util = {
      flashesPerRound: low.flashesPerRound.ref - 1.5 * low.flashesPerRound.spread,
      enemiesFlashedPerRound: low.enemiesFlashedPerRound.ref - 1.5 * low.enemiesFlashedPerRound.spread,
      flashSuccess: low.flashSuccess.ref - 1.5 * low.flashSuccess.spread,
      utilityDamagePerRound: low.utilityDamagePerRound.ref - 1.5 * low.utilityDamagePerRound.spread,
    };
    const r = analyzePlayer(atLevel(2, { ...levelTwoStats(), ...util }));
    const w = r.weaknesses.find((i) => i.id === "utility_low");
    expect(w?.detail).toContain("typical for your level");

    const typicalLow = analyzePlayer(atLevel(2, levelTwoStats()));
    expect(typicalLow.weaknesses.some((i) => i.id === "utility_low")).toBe(false);
  });
});
