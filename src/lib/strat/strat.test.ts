import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { MAPS, areaAt } from "@/lib/maps";
import { pathLength, pointAlong, simplify } from "./geometry";
import * as H from "./history";
import {
  cloneObjects,
  continueStep,
  phaseName,
  createStrat,
  duplicateStrat,
  move,
  newStep,
  nextPlayerNumber,
  parseStrat,
  removeObject,
  teamAtSpawn,
  safeUrl,
  youtubeId,
} from "./model";
import { decodeStrat, encodeStrat } from "./share";
import { TEMPLATES } from "./templates";
import { nextRouteStart, playerPositionAt, stratDuration, visibilityAt, walkDuration, RUN_SPEED } from "./timeline";
import type { BoardObject, PlacedPlayer, RouteObject, Scene, UtilityObject } from "./types";
import { CONE_LENGTH } from "./types";

function scene(objects: BoardObject[] = []): Scene {
  return { map: "mirage", side: "T", objects };
}

function player(over: Partial<PlacedPlayer> = {}): PlacedPlayer {
  return { id: "p1", kind: "player", team: "T", n: 1, role: "Entry", x: 100, y: 100, ...over };
}

function route(id: string, playerId: string | null, points: [number, number][], t: number, duration: number): RouteObject {
  return { id, kind: "route", player: playerId, points: points.map(([x, y]) => ({ x, y })), t, duration };
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
    const p = player();
    const s = scene([p, route("r1", "p1", [[100, 100], [200, 100]], 2, 4), route("r2", "p1", [[200, 100], [200, 300]], 10, 2)]);
    expect(playerPositionAt(s, p, 0)).toEqual({ x: 100, y: 100 });
    expect(playerPositionAt(s, p, 4)).toEqual({ x: 150, y: 100 });
    expect(playerPositionAt(s, p, 8)).toEqual({ x: 200, y: 100 }); // waiting between moves
    expect(playerPositionAt(s, p, 11)).toEqual({ x: 200, y: 200 });
    expect(playerPositionAt(s, p, 60)).toEqual({ x: 200, y: 300 });
  });

  it("starts a player's next route when the previous one ends", () => {
    expect(nextRouteStart(scene([player()]), "p1")).toBe(0);
    expect(nextRouteStart(scene([player(), route("r1", "p1", [[100, 100], [200, 100]], 2, 4.5)]), "p1")).toBe(6.5);
    expect(nextRouteStart(scene(), null)).toBe(0);
  });

  it("times a walk at running speed", () => {
    expect(walkDuration([{ x: 0, y: 0 }, { x: RUN_SPEED * 5, y: 0 }])).toBe(5);
    expect(walkDuration([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toBe(1);
  });

  it("shows a grenade only while it's active, and the bomb once planted", () => {
    const smoke: UtilityObject = { id: "s", kind: "utility", type: "smoke", t: 10, x: 0, y: 0 };
    expect(visibilityAt(smoke, null).show).toBe(true);
    expect(visibilityAt(smoke, 9).show).toBe(false);
    expect(visibilityAt(smoke, 15).show).toBe(true);
    expect(visibilityAt(smoke, 29).show).toBe(false);
    expect(visibilityAt({ ...smoke, type: "flash" }, 13).show).toBe(false);
    const bomb: BoardObject = { id: "b", kind: "bomb", t: 5, x: 0, y: 0 };
    expect(visibilityAt(bomb, 4).show).toBe(false);
    expect(visibilityAt(bomb, 40).show).toBe(true);
  });

  it("measures how long a step runs", () => {
    const s = scene([player(), route("r1", "p1", [[0, 0], [10, 0]], 2, 4), { id: "f", kind: "utility", type: "flash", t: 9, x: 0, y: 0 }]);
    expect(stratDuration(s)).toBe(11);
  });
});

describe("editing", () => {
  it("numbers players 1–5 per team, filling gaps", () => {
    const objects: BoardObject[] = [player()];
    expect(nextPlayerNumber(scene(objects), "T")).toBe(2);
    expect(nextPlayerNumber(scene(objects), "CT")).toBe(1);
    for (let n = 2; n <= 5; n++) objects.push(player({ id: `p${n}`, n }));
    expect(nextPlayerNumber(scene(objects), "T")).toBeNull();
    expect(nextPlayerNumber(scene(removeObject(objects, "p3")), "T")).toBe(3);
  });

  it("removes a player's routes with the player", () => {
    const objects = [player(), route("r1", "p1", [[0, 0], [10, 0]], 0, 1), route("arrow", null, [[0, 0], [10, 0]], 0, 1)];
    expect(removeObject(objects, "p1").map((o) => o.id)).toEqual(["arrow"]);
  });

  it("duplicates with fresh ids and keeps routes attached", () => {
    const strat = createStrat("mirage", "T");
    strat.steps[0].objects.push(player(), route("r1", "p1", [[0, 0], [10, 0]], 0, 1));
    const copy = duplicateStrat(strat);
    const p = copy.steps[0].objects.find((o) => o.kind === "player")!;
    const r = copy.steps[0].objects.find((o) => o.kind === "route") as RouteObject;
    expect(copy.id).not.toBe(strat.id);
    expect(p.id).not.toBe("p1");
    expect(r.player).toBe(p.id);
  });

  it("starts the next phase where everyone ended, keeping what was placed but not routes", () => {
    const step = newStep("Execute", [
      player(),
      player({ id: "e1", team: "CT", n: 1, x: 500, y: 500 }),
      route("r1", "p1", [[100, 100], [200, 100]], 0, 2),
      route("r2", "p1", [[200, 100], [300, 300]], 5, 2),
      { id: "s", kind: "utility", type: "smoke", t: 3, x: 0, y: 0 },
      { id: "b", kind: "bomb", t: 8, x: 400, y: 400 },
    ]);
    const next = continueStep(step, "Post-plant");
    const players = next.objects.filter((o): o is PlacedPlayer => o.kind === "player");
    expect(next.name).toBe("Post-plant");
    expect(players.find((p) => p.n === 1 && p.team === "T")).toMatchObject({ x: 300, y: 300 });
    expect(players.find((p) => p.team === "CT")).toMatchObject({ x: 500, y: 500 });
    expect(next.objects.some((o) => o.kind === "route")).toBe(false);
    expect(next.objects.find((o) => o.kind === "utility")).toMatchObject({ type: "smoke", t: 0 });
    expect(next.objects.find((o) => o.kind === "bomb")).toMatchObject({ t: 0, x: 400 });
    expect(next.objects.every((o) => !["p1", "e1", "b", "s"].includes(o.id))).toBe(true); // fresh ids
  });

  it("reads old default step names as phases", () => {
    expect(phaseName("Step 3")).toBe("Phase 3");
    expect(phaseName("Execute")).toBe("Execute");
    expect(phaseName("Step 3 B split")).toBe("Step 3 B split");
  });

  it("reorders steps", () => {
    expect(move(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(move(["a", "b", "c"], 2, 1)).toEqual(["a", "c", "b"]);
    expect(move(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });

  it("clones objects with routes still attached", () => {
    const [p, r] = cloneObjects([player(), route("r1", "p1", [[0, 0], [1, 1]], 0, 1)]);
    expect((r as RouteObject).player).toBe(p.id);
  });

  it("undoes a whole drag in one step", () => {
    const a = createStrat("mirage", "T", "A");
    let h = H.initHistory(a);
    h = H.checkpoint(h);
    h = H.live(h, { ...a, name: "B" });
    h = H.live(h, { ...a, name: "C" });
    expect(h.present.name).toBe("C");
    h = H.undo(h);
    expect(h.present.name).toBe("A");
    h = H.redo(h);
    expect(h.present.name).toBe("C");
  });
});

describe("lineup links", () => {
  it("keeps only http(s) links", () => {
    expect(safeUrl("https://youtu.be/abc123")).toBe("https://youtu.be/abc123");
    expect(safeUrl("youtube.com/watch?v=abc123")).toBe("https://youtube.com/watch?v=abc123");
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("data:text/html,hi")).toBe("");
    expect(safeUrl("  ")).toBe("");
  });

  it("finds the video in YouTube links", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=10")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://example.com/smoke.png")).toBeNull();
  });
});

describe("share links and validation", () => {
  it("round-trips a strat with several steps through a link", () => {
    const s = TEMPLATES[0].build();
    const back = decodeStrat(encodeStrat(s))!;
    expect(back.name).toBe(s.name);
    expect(back.steps.map((x) => x.name)).toEqual(s.steps.map((x) => x.name));
    expect(back.steps.map((x) => x.objects.length)).toEqual(s.steps.map((x) => x.objects.length));
  });

  it("keeps links short enough to paste in Discord", () => {
    for (const t of TEMPLATES) expect(encodeStrat(t.build()).length).toBeLessThan(4000);
  });

  it("opens strats saved before steps existed as a one-step strat", () => {
    const old = { v: 1, map: "mirage", side: "T", name: "Old", objects: [{ id: "a", kind: "player", team: "T", n: 1, role: "", x: 1, y: 2 }] };
    const s = parseStrat(old)!;
    expect(s.v).toBe(2);
    expect(s.steps).toHaveLength(1);
    expect(s.steps[0].objects[0]).toMatchObject({ kind: "player" });
  });

  it("rejects garbage and cleans up bad objects", () => {
    expect(decodeStrat("not-a-strat")).toBeNull();
    expect(decodeStrat(compressToEncodedURIComponent(JSON.stringify({ v: 2, map: "de_notamap", side: "T" })))).toBeNull();
    const s = parseStrat({
      v: 2,
      map: "dust2",
      side: "CT",
      name: "x".repeat(500),
      steps: [
        {
          id: "s1",
          name: "One",
          objects: [
            { id: "a", kind: "player", team: "CT", n: 9, role: "AWP", x: 5000, y: 10 },
            { id: "b", kind: "route", player: "ghost", points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], t: 0, duration: 2 },
            { id: "c", kind: "utility", type: "nuke", x: 0, y: 0, t: 0 },
            { id: "d", kind: "text", text: "", x: 0, y: 0, t: 0 },
            { id: "e", kind: "bomb", x: 1, y: 1, t: 0 },
            { id: "f", kind: "bomb", x: 2, y: 2, t: 0 },
            { id: "g", kind: "lineup", title: "x", url: "javascript:alert(1)", x: 3, y: 3 },
            { id: "h", kind: "drawing", color: "purple", points: [{ x: 0, y: 0 }, { x: 5, y: 5 }] },
            "junk",
          ],
        },
        "junk",
      ],
    })!;
    const objects = s.steps[0].objects;
    expect(s.name).toHaveLength(80);
    expect(s.steps).toHaveLength(1);
    expect(objects.map((o) => o.id)).toEqual(["a", "b", "e", "g", "h"]); // one bomb per step
    const p = objects[0] as PlacedPlayer;
    expect(p.n).toBe(5);
    expect(p.x).toBe(1050);
    expect((objects[1] as RouteObject).player).toBeNull(); // pointed at a player that doesn't exist
    expect(objects[3]).toMatchObject({ url: "" });
    expect(objects[4]).toMatchObject({ color: "#ffffff" });
  });
});

describe("pen and sight cones", () => {
  it("turns an old player view cone into a sight cone where the player stands", () => {
    const s = parseStrat({
      v: 2,
      map: "mirage",
      side: "T",
      steps: [{ id: "s", name: "S", objects: [{ id: "p", kind: "player", team: "T", n: 1, role: "", facing: 450, x: 10, y: 20 }] }],
    })!;
    const [p, cone] = s.steps[0].objects;
    expect(p).not.toHaveProperty("facing");
    expect(cone).toMatchObject({ kind: "vision", player: "p", x: 10, y: 20, angle: 90 });
  });

  it("keeps a cone with its player: removed with them, copied with them", () => {
    const cone: BoardObject = { id: "c", kind: "vision", player: "p1", x: 100, y: 100, angle: 0, length: 150, cone: "normal" };
    const free: BoardObject = { ...cone, id: "f", player: null };
    expect(removeObject([player(), cone, free], "p1").map((o) => o.id)).toEqual(["f"]);
    const [p, c] = cloneObjects([player(), cone]);
    expect((c as Extract<BoardObject, { kind: "vision" }>).player).toBe(p.id);
  });

  it("reads old named pen colours and keeps new pen settings in range", () => {
    const s = parseStrat({
      v: 2,
      map: "mirage",
      side: "T",
      steps: [
        {
          id: "s",
          name: "S",
          objects: [
            { id: "a", kind: "drawing", color: "red", points: [{ x: 0, y: 0 }, { x: 5, y: 5 }] },
            { id: "b", kind: "drawing", shape: "arrow", color: "#ABCDEF", opacity: 7, width: 99, points: [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 9, y: 9 }] },
            { id: "c", kind: "vision", x: 1, y: 2, angle: -90, length: 99999, cone: "huge" },
          ],
        },
      ],
    })!;
    const [a, b, c] = s.steps[0].objects;
    expect(a).toMatchObject({ shape: "free", color: "#ff4d4d", opacity: 1 });
    expect(b).toMatchObject({ shape: "arrow", color: "#abcdef", opacity: 1, width: 20, points: [{ x: 0, y: 0 }, { x: 9, y: 9 }] });
    expect(c).toMatchObject({ angle: 270, length: CONE_LENGTH.max, cone: "normal" });
  });

  it("gives every example's sight cones a valid width and reach", () => {
    for (const t of TEMPLATES) {
      for (const step of t.build().steps) {
        for (const o of step.objects) {
          if (o.kind === "vision") expect(o.length).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });
});

describe("templates", () => {
  it("build valid strats that survive validation", () => {
    for (const t of TEMPLATES) {
      const s = t.build();
      const back = parseStrat(JSON.parse(JSON.stringify(s)))!;
      expect(back.steps.map((x) => x.objects.length)).toEqual(s.steps.map((x) => x.objects.length));
    }
  });

  it("put the Mirage execute's smokes where the plan says, and plant in the post-plant step", () => {
    const s = TEMPLATES.find((t) => t.id === "mirage-a-execute")!.build();
    expect(s.steps.map((x) => x.name)).toEqual(["Execute", "Post-plant"]);
    const smokes = s.steps[0].objects.filter((o): o is UtilityObject => o.kind === "utility" && o.type === "smoke");
    expect(smokes.map((u) => areaAt(MAPS.mirage, u.x, u.y)?.name).sort()).toEqual(["CT Spawn", "Jungle", "Stairs"]);
    const bomb = s.steps[1].objects.find((o) => o.kind === "bomb")!;
    expect(areaAt(MAPS.mirage, (bomb as { x: number }).x, (bomb as { y: number }).y)?.name).toBe("A Site");
  });

  it("chain each player's routes without overlap", () => {
    for (const t of TEMPLATES) {
      for (const step of t.build().steps) {
        for (const p of step.objects.filter((o) => o.kind === "player")) {
          const rs = step.objects.filter((o): o is RouteObject => o.kind === "route" && o.player === p.id).sort((a, b) => a.t - b.t);
          for (let i = 1; i < rs.length; i++) {
            expect(rs[i].t).toBeGreaterThanOrEqual(rs[i - 1].t + rs[i - 1].duration - 0.05);
            expect(rs[i].points[0]).toEqual(rs[i - 1].points.at(-1));
          }
        }
      }
    }
  });
});

describe("markers and decoys", () => {
  const strat = (objects: unknown[]) =>
    parseStrat({ v: 2, id: "s", name: "S", map: "mirage", side: "T", call: "", notes: "", steps: [{ id: "a", name: "A", objects }] });

  it("keeps valid markers and decoys and drops unknown ones", () => {
    const s = strat([
      { id: "m", kind: "marker", icon: "anchor", x: 10, y: 20 },
      { id: "x", kind: "marker", icon: "nuke-everything", x: 10, y: 20 },
      { id: "d", kind: "utility", type: "decoy", t: 0, x: 5, y: 5 },
    ])!;
    expect(s.steps[0].objects.map((o) => o.id)).toEqual(["m", "d"]);
  });

  it("carries markers into the next phase", () => {
    const next = continueStep(newStep("A", [{ id: "m", kind: "marker", icon: "awp", x: 1, y: 2 }]), "B");
    expect(next.objects[0]).toMatchObject({ kind: "marker", icon: "awp", x: 1, y: 2 });
  });
});

describe("coach features", () => {
  const p1 = { id: "p1", kind: "player" as const, team: "T" as const, n: 1, role: "", x: 100, y: 100 };
  const smoke = { id: "s", kind: "utility" as const, type: "smoke" as const, t: 0, from: "p1", x: 300, y: 300 };

  it("keeps the thrower attached when a phase is copied, and forgets a deleted thrower", () => {
    const next = continueStep(newStep("A", [p1, smoke]), "B");
    const p = next.objects.find((o) => o.kind === "player")!;
    const u = next.objects.find((o) => o.kind === "utility");
    expect(u).toMatchObject({ from: p.id });
    expect(removeObject([p1, smoke], "p1")).toEqual([{ ...smoke, from: null }]);
  });

  it("can start a phase with only the players, cones on players and the bomb", () => {
    const step = newStep("A", [
      p1,
      smoke,
      { id: "b", kind: "bomb", t: 4, x: 1, y: 1 },
      { id: "m", kind: "marker", icon: "anchor", x: 1, y: 1 },
      { id: "v", kind: "vision", player: "p1", x: 100, y: 100, angle: 0, length: 100, cone: "normal" },
      { id: "v2", kind: "vision", player: null, x: 9, y: 9, angle: 0, length: 100, cone: "normal" },
    ]);
    const kinds = continueStep(step, "B", "players").objects.map((o) => o.kind).sort();
    expect(kinds).toEqual(["bomb", "player", "vision"]);
  });

  it("puts the missing teammates in spawn without stacking them", () => {
    const scene = { map: "mirage" as const, side: "T" as const, objects: [{ ...p1, n: 2 }] };
    const team = teamAtSpawn(scene, { x: 845, y: 290, w: 70, h: 130 });
    expect(team.map((p) => p.n)).toEqual([1, 3, 4, 5]);
    for (const a of team) for (const b of team) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(40);
  });

  it("reads the thrower from saved data", () => {
    const s = parseStrat({ v: 2, id: "s", name: "S", map: "mirage", side: "T", call: "", notes: "", steps: [{ id: "a", name: "A", objects: [p1, smoke] }] })!;
    expect(s.steps[0].objects[1]).toMatchObject({ from: "p1" });
  });
});
