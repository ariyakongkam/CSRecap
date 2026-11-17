import { describe, expect, it } from "vitest";
import { castRay, sightPolygon, type SightMask } from "./sight";
import type { VisionObject } from "./types";

/** 100×100 grid (10 board units per cell) with a wall at board x 600–700. */
function wallMask(): SightMask {
  const size = 100;
  const blocked = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 60; x < 70; x++) blocked[y * size + x] = 1;
  return { size, blocked };
}

const cone = (angle: number, length = 300): VisionObject => ({ id: "v", kind: "vision", player: null, x: 400, y: 500, angle, length, cone: "narrow" });

describe("sight cones", () => {
  it("stops at a wall", () => {
    const d = castRay(wallMask(), { x: 400, y: 500 }, 0, 300);
    expect(d).toBeGreaterThan(195);
    expect(d).toBeLessThan(201);
  });

  it("keeps full length when nothing is in the way", () => {
    expect(castRay(wallMask(), { x: 400, y: 500 }, Math.PI, 300)).toBe(300);
  });

  it("cuts the cone at the wall but not behind the player", () => {
    const towards = sightPolygon(cone(0), wallMask());
    expect(Math.max(...towards.map((p) => p.x))).toBeLessThan(601);
    const away = sightPolygon(cone(180), wallMask());
    expect(Math.min(...away.map((p) => p.x))).toBeLessThan(101);
  });

  it("is the plain fan without a mask", () => {
    const pts = sightPolygon(cone(0), null);
    expect(pts[0]).toEqual({ x: 400, y: 500 });
    for (const p of pts.slice(1)) expect(Math.hypot(p.x - 400, p.y - 500)).toBeCloseTo(300);
  });

  it("ignores a wall the player is standing against", () => {
    const m = wallMask();
    expect(castRay(m, { x: 597, y: 500 }, 0, 300)).toBeLessThan(10 + 1.5);
    expect(castRay(m, { x: 597, y: 500 }, Math.PI, 300)).toBe(300);
  });
});
