import { walkDuration } from "./timeline";
import type { BoardObject, PlacedPlayer, Pt, RouteObject, Strat, UtilityObject } from "./types";

/**
 * The example strat on the landing page: a Mirage A execute and its post-plant.
 * Every route was found with pathfinding over the map's walls (public/maps/mirage-sight.png),
 * keeping clear of walls and crates, so nobody walks through a wall. Fixed ids, so the page
 * renders the same on the server and in the browser.
 */

const pts = (a: number[][]): Pt[] => a.map(([x, y]) => ({ x, y }));
const at = ([x, y]: number[]): Pt => ({ x, y });

function player(id: string, n: number, role: string, pos: number[], team: "T" | "CT" = "T"): PlacedPlayer {
  return { id, kind: "player", team, n, role, ...at(pos) };
}
function route(id: string, playerId: string, path: number[][], t = 0): RouteObject {
  const points = pts(path);
  return { id, kind: "route", player: playerId, points, t, duration: walkDuration(points) };
}
function nade(id: string, type: UtilityObject["type"], pos: number[], from: string, t: number): UtilityObject {
  return { id, kind: "utility", type, t: Math.round(t * 10) / 10, from, ...at(pos) };
}

// Phase 1: out of T spawn. 1 and 2 take Palace and Ramp, 3 and 4 throw the smokes and the flash, 5 lurks mid.
const R1 = [[880, 329], [894, 601], [868, 614], [827, 622], [810, 755], [780, 782], [649, 784], [630, 749], [579, 761]];
const R2 = [[870, 364], [847, 560], [774, 583], [735, 649], [651, 638], [601, 700]];
const R3 = [[892, 396], [841, 560], [780, 581], [780, 601]];
const R4 = [[860, 421], [847, 560], [774, 583], [745, 634]];
const R5 = [[886, 440], [845, 249], [774, 235], [712, 249], [649, 433], [579, 450]];

const r1 = route("r1", "t1", R1);
const r2 = route("r2", "t2", R2);
const r3 = route("r3", "t3", R3);
const r4 = route("r4", "t4", R4);
const r5 = route("r5", "t5", R5);

const execute: BoardObject[] = [
  player("t1", 1, "Entry", R1[0]),
  player("t2", 2, "Support", R2[0]),
  player("t3", 3, "Smokes", R3[0]),
  player("t4", 4, "Flash", R4[0]),
  player("t5", 5, "Lurk", R5[0]),
  r1,
  r2,
  r3,
  r4,
  r5,
  player("c1", 1, "", [524, 704], "CT"),
  player("c2", 2, "", [386, 604], "CT"),
  player("c3", 3, "", [405, 556], "CT"),
  { id: "v5", kind: "vision", player: "t5", angle: 180, length: 200, cone: "normal", ...at(R5[0]) },
  nade("n1", "smoke", [372, 600], "t3", r3.duration + 0.3),
  nade("n2", "smoke", [300, 700], "t4", r4.duration + 0.3),
  nade("n3", "smoke", [432, 612], "t3", r3.duration + 1.2),
  nade("n4", "flash", [545, 712], "t4", r4.duration + 1.4),
  nade("n5", "molotov", [520, 765], "t2", r2.duration - 0.6),
];

// Phase 2: the bomb is down; the team spreads into post-plant spots while CT comes from spawn.
const end = (r: number[][]) => r[r.length - 1];
const postPlant: BoardObject[] = [
  player("p1", 1, "Entry", end(R1)),
  player("p2", 2, "Support", end(R2)),
  player("p3", 3, "Smokes", end(R3)),
  player("p4", 4, "Flash", end(R4)),
  player("p5", 5, "Lurk", end(R5)),
  route("q1", "p1", [[579, 761], [505, 790]]),
  route("q2", "p2", [[601, 700], [560, 690]]),
  route("q3", "p3", [[780, 601], [731, 646], [700, 640]]),
  route("q4", "p4", [[745, 634], [729, 646], [651, 640], [626, 665]]),
  route("q5", "p5", [[579, 450], [470, 470]]),
  { id: "b", kind: "bomb", t: 0, x: 546, y: 771 },
  player("c4", 4, "", [300, 700], "CT"),
  { id: "v4", kind: "vision", player: "c4", angle: 10, length: 220, cone: "wide", x: 300, y: 700 },
];

export const DEMO_STRAT: Strat = {
  v: 2,
  id: "demo",
  name: "Mirage A execute",
  map: "mirage",
  side: "T",
  call: "",
  notes: "",
  steps: [
    { id: "s1", name: "Execute", objects: execute, note: "Smoke Jungle, CT and Stairs, flash over, then Palace and Ramp go together." },
    { id: "s2", name: "Post-plant", objects: postPlant, note: "Play crossfires around the bomb." },
  ],
  createdAt: "2026-11-18T00:00:00.000Z",
  updatedAt: "2026-11-18T00:00:00.000Z",
};
