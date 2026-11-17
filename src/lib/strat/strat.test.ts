import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { MAPS, areaAt } from "@/lib/maps";
import { pathLength, pointAlong, simplify } from "./geometry";
import * as H from "./history";
import { createStrat, duplicateStrat, nextPlayerNumber, parseStrat, removeObject } from "./model";
import { decodeStrat, encodeStrat } from "./share";
import { TEMPLATES } from "./templates";
import { nextRouteStart, playerPositionAt, stratDuration, visibilityAt, walkDuration, RUN_SPEED } from "./timeline";
import type { PlacedPlayer, RouteObject, Strat, UtilityObject } from "./types";

function withPlayer(): { strat: Strat; p: PlacedPlayer } {
  const strat = createStrat("mirage", "T", "Test");
  const p: PlacedPlayer = { id: "p1", kind: "player", team: "T", n: 1, role: "Entry", x: 100, y: 100 };
  strat.objects.push(p);
  return { strat, p };
}

function route(id: string, player: string | null, points: [number, number][], t: number, duration: number): RouteObject {
  return { id, kind: "route", player, points: points.map(([x, y]) => ({ x, y })), t, duration };
}

describe("geometry", () => {
  it("measures and walks a polyline by distance", () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    expect(pathLength(pts)).toBe(200);
    expect(pointAlong(pts, 0.25)).toEqual({ x: 50, y: 0 });
    expect(pointAlong(pts, 0.75)).toEqual({ x: 100, y: 50 });
    expect(pointAlong(pts, 2)).toEqual({ x: 100, y: 100 });
  });

  it("drops points that don't change a stroke's shape", () => {
    const straight = Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: i % 2 }));
    expect(simplify(straight, 3)).toHaveLength(2);
    const corner = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 100, y: 100 }];
    expect(simplify(corner, 3)).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
  });
});

describe("timing", () => {
  it("moves a player along their routes in order", () => {
    const { strat, p } = withPlayer();
    strat.objects.push(route("r1", "p1", [[100, 100], [200, 100]], 2, 4));
    strat.objects.push(route("r2", "p1", [[200, 100], [200, 300]], 10, 2));
    expect(playerPositionAt(strat, p, 0)).toEqual({ x: 100, y: 100 });
    expect(playerPositionAt(strat, p, 4)).toEqual({ x: 150, y: 100 });
    expect(playerPositionAt(strat, p, 8)).toEqual({ x: 200, y: 100 }); // waiting between moves
    expect(playerPositionAt(strat, p, 11)).toEqual({ x: 200, y: 200 });
    expect(playerPositionAt(strat, p, 60)).toEqual({ x: 200, y: 300 });
  });

  it("starts a player's next route when the previous one ends", () => {
    const { strat } = withPlayer();
    expect(nextRouteStart(strat, "p1")).toBe(0);
    strat.objects.push(route("r1", "p1", [[100, 100], [200, 100]], 2, 4.5));
    expect(nextRouteStart(strat, "p1")).toBe(6.5);
    expect(nextRouteStart(strat, null)).toBe(0);
  });

  it("times a walk at running speed", () => {
    expect(walkDuration([{ x: 0, y: 0 }, { x: RUN_SPEED * 5, y: 0 }])).toBe(5);
    expect(walkDuration([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toBe(1);
  });

  it("shows a grenade only while it's active", () => {
    const smoke: UtilityObject = { id: "s", kind: "utility", type: "smoke", t: 10, x: 0, y: 0 };
    expect(visibilityAt(smoke, null).show).toBe(true);
    expect(visibilityAt(smoke, 9).show).toBe(false);
    expect(visibilityAt(smoke, 15).show).toBe(true);
    expect(visibilityAt(smoke, 29).show).toBe(false);
    const flash: UtilityObject = { ...smoke, type: "flash" };
    expect(visibilityAt(flash, 13).show).toBe(false);
  });

  it("measures how long a plan runs", () => {
    const { strat } = withPlayer();
    strat.objects.push(route("r1", "p1", [[0, 0], [10, 0]], 2, 4));
    strat.objects.push({ id: "f", kind: "utility", type: "flash", t: 9, x: 0, y: 0 });
    expect(stratDuration(strat)).toBe(11);
  });
});

describe("editing", () => {
  it("numbers players 1–5 per team, filling gaps", () => {
    const { strat } = withPlayer();
    expect(nextPlayerNumber(strat, "T")).toBe(2);
    expect(nextPlayerNumber(strat, "CT")).toBe(1);
    for (let n = 2; n <= 5; n++) strat.objects.push({ id: `p${n}`, kind: "player", team: "T", n, role: "", x: 0, y: 0 });
    expect(nextPlayerNumber(strat, "T")).toBeNull();
    expect(nextPlayerNumber(removeObject(strat, "p3"), "T")).toBe(3);
  });

  it("removes a player's routes with the player", () => {
    const { strat } = withPlayer();
    strat.objects.push(route("r1", "p1", [[0, 0], [10, 0]], 0, 1), route("arrow", null, [[0, 0], [10, 0]], 0, 1));
    expect(removeObject(strat, "p1").objects.map((o) => o.id)).toEqual(["arrow"]);
  });

  it("duplicates with fresh ids and keeps routes attached", () => {
    const { strat } = withPlayer();
    strat.objects.push(route("r1", "p1", [[0, 0], [10, 0]], 0, 1));
    const copy = duplicateStrat(strat);
    const p = copy.objects.find((o) => o.kind === "player")!;
    const r = copy.objects.find((o) => o.kind === "route") as RouteObject;
    expect(copy.id).not.toBe(strat.id);
    expect(p.id).not.toBe("p1");
    expect(r.player).toBe(p.id);
  });

  it("undoes a whole drag in one step", () => {
    const a = createStrat("mirage", "T", "A");
    const b = { ...a, name: "B" };
    const c = { ...a, name: "C" };
    let h = H.initHistory(a);
    h = H.checkpoint(h);
    h = H.live(h, b);
    h = H.live(h, c);
    expect(h.present.name).toBe("C");
    h = H.undo(h);
    expect(h.present.name).toBe("A");
    h = H.redo(h);
    expect(h.present.name).toBe("C");
  });
});

describe("share links and validation", () => {
  it("round-trips a strat through a link", () => {
    const s = TEMPLATES[0].build();
    const back = decodeStrat(encodeStrat(s))!;
    expect(back.name).toBe(s.name);
    expect(back.objects).toHaveLength(s.objects.length);
    expect(back.call).toBe(s.call);
  });

  it("keeps links short enough to paste in Discord", () => {
    for (const t of TEMPLATES) expect(encodeStrat(t.build()).length).toBeLessThan(2000);
  });

  it("rejects garbage and cleans up bad objects", () => {
    expect(decodeStrat("not-a-strat")).toBeNull();
    expect(decodeStrat(compressToEncodedURIComponent(JSON.stringify({ v: 1, map: "nuke", side: "T" })))).toBeNull();
    const s = parseStrat({
      v: 1,
      map: "dust2",
      side: "CT",
      name: "x".repeat(500),
      objects: [
        { id: "a", kind: "player", team: "CT", n: 9, role: "AWP", x: 5000, y: 10 },
        { id: "b", kind: "route", player: "ghost", points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], t: 0, duration: 2 },
        { id: "c", kind: "utility", type: "nuke", x: 0, y: 0, t: 0 },
        { id: "d", kind: "text", text: "", x: 0, y: 0, t: 0 },
        "junk",
      ],
    })!;
    expect(s.name).toHaveLength(80);
    expect(s.objects.map((o) => o.id)).toEqual(["a", "b"]);
    const p = s.objects[0] as PlacedPlayer;
    expect(p.n).toBe(5);
    expect(p.x).toBe(1050);
    expect((s.objects[1] as RouteObject).player).toBeNull(); // pointed at a player that doesn't exist
  });
});

describe("templates", () => {
  it("build valid strats that survive validation", () => {
    for (const t of TEMPLATES) {
      const s = t.build();
      expect(parseStrat(JSON.parse(JSON.stringify(s)))?.objects).toHaveLength(s.objects.length);
    }
  });

  it("put the Mirage execute's smokes where the plan says", () => {
    const s = TEMPLATES.find((t) => t.id === "mirage-a-execute")!.build();
    const smokes = s.objects.filter((o): o is UtilityObject => o.kind === "utility" && o.type === "smoke");
    expect(smokes.map((u) => areaAt(MAPS.mirage, u.x, u.y)?.name).sort()).toEqual(["CT Spawn", "Jungle", "Stairs"]);
  });

  it("chain each player's routes without overlap", () => {
    for (const t of TEMPLATES) {
      const s = t.build();
      for (const p of s.objects.filter((o) => o.kind === "player")) {
        const rs = s.objects.filter((o): o is RouteObject => o.kind === "route" && o.player === p.id).sort((a, b) => a.t - b.t);
        for (let i = 1; i < rs.length; i++) {
          expect(rs[i].t).toBeGreaterThanOrEqual(rs[i - 1].t + rs[i - 1].duration - 0.05);
          expect(rs[i].points[0]).toEqual(rs[i - 1].points.at(-1));
        }
      }
    }
  });
});
