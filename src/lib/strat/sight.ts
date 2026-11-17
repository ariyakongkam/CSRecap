import { CONE_DEGREES, type Pt, type VisionObject } from "./types";

/** Where sight is blocked on a map: walls and crates, on a size×size grid over the 1000×1000 board. */
export interface SightMask {
  size: number;
  /** 1 = blocked, row by row. */
  blocked: Uint8Array;
}

/** Blocked cells right next to the player are ignored, so someone hugging a wall or box still sees past it. */
const GRACE = 10;
const STEP = 1.5;

export function isBlocked(mask: SightMask, x: number, y: number): boolean {
  const cx = Math.floor((x / 1000) * mask.size);
  const cy = Math.floor((y / 1000) * mask.size);
  if (cx < 0 || cy < 0 || cx >= mask.size || cy >= mask.size) return true;
  return mask.blocked[cy * mask.size + cx] === 1;
}

/** How far a ray from `o` at `angle` (radians) travels, up to `max`, before it hits a wall or object. */
export function castRay(mask: SightMask, o: Pt, angle: number, max: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let d = GRACE; d < max; d += STEP) {
    if (isBlocked(mask, o.x + dx * d, o.y + dy * d)) return Math.max(0, d - STEP / 2);
  }
  return max;
}

/**
 * The cone's outline as points: the origin, then the end of each ray across the cone.
 * Without a mask (blank board, or not loaded yet) it is the plain fan.
 */
export function sightPolygon(v: VisionObject, mask: SightMask | null): Pt[] {
  const width = CONE_DEGREES[v.cone];
  const rays = Math.max(24, Math.ceil(width * 2));
  const start = ((v.angle - width / 2) * Math.PI) / 180;
  const span = (width * Math.PI) / 180;
  const pts: Pt[] = [{ x: v.x, y: v.y }];
  for (let i = 0; i <= rays; i++) {
    const a = start + (span * i) / rays;
    const r = mask ? castRay(mask, v, a, v.length) : v.length;
    pts.push({ x: v.x + r * Math.cos(a), y: v.y + r * Math.sin(a) });
  }
  return pts;
}

/** Reads a black/white mask image (white = blocked) into a SightMask. Browser only. */
const cache = new Map<string, Promise<SightMask | null>>();
export function loadSightMask(url: string): Promise<SightMask | null> {
  let p = cache.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const size = img.naturalWidth;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, size, size).data;
        const blocked = new Uint8Array(size * size);
        for (let i = 0; i < blocked.length; i++) blocked[i] = data[i * 4] > 127 ? 1 : 0;
        resolve({ size, blocked });
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    cache.set(url, p);
  }
  return p;
}
