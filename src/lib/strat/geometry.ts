import type { Pt } from "./types";

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pathLength(points: Pt[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

/** The point `fraction` (0–1) of the way along a polyline, by distance. */
export function pointAlong(points: Pt[], fraction: number): Pt {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1 || fraction <= 0) return points[0];
  if (fraction >= 1) return points[points.length - 1];
  let remaining = pathLength(points) * fraction;
  for (let i = 1; i < points.length; i++) {
    const seg = dist(points[i - 1], points[i]);
    if (remaining <= seg) {
      const f = seg === 0 ? 0 : remaining / seg;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * f,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * f,
      };
    }
    remaining -= seg;
  }
  return points[points.length - 1];
}

function perpendicularDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return dist(p, a);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

/** Ramer–Douglas–Peucker: drops points from a freehand stroke that don't change its shape. */
export function simplify(points: Pt[], tolerance = 4): Pt[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const last = points.length - 1;
  for (let i = 1; i < last; i++) {
    const d = perpendicularDistance(points[i], points[0], points[last]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist <= tolerance) return [points[0], points[last]];
  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

/** SVG path data for a polyline. */
export function pathData(points: Pt[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
