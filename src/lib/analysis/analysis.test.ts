import { describe, expect, it } from "vitest";
import type { LifetimeStats, MapStats, PlayerData, RecentMatch } from "@/lib/faceit/types";
import { analyzePlayer } from "./index";

// Synthetic fixtures — shaped like normalized FACEIT data, not real players.

function lifetime(over: Partial<LifetimeStats> = {}): LifetimeStats {
  return {
    matches: 400,
    wins: 200,
    winRate: 50,
    kd: 1.0,
    adr: 79,
    headshotPct: 47,
    avgKills: 18,
    longestWinStreak: 6,
    recentResults: [true, false, true, false, true],
    extendedRounds: 5000,
    entryRate: 0.2,
    entrySuccess: 0.5,
    entryCount: 1000,
    clutch1v1Rate: 0.38,
    clutch1v1Count: 100,
    clutch1v2Rate: 0.15,
    clutch1v2Count: 100,
    flashesPerRound: 0.45,
    enemiesFlashedPerRound: 0.3,
    flashSuccess: 0.48,
    utilityDamagePerRound: 4.4,
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
      level: 6,
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
