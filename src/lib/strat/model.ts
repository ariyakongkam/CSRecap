import { isMapId, type MapId } from "@/lib/maps";
import { clamp, round1 } from "./geometry";
import {
  STRAT_VERSION,
  type BoardObject,
  type PlacedPlayer,
  type Pt,
  type Side,
  type Strat,
  type UtilityType,
} from "./types";

export function newId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

export function createStrat(map: MapId, side: Side, name = "Untitled strat"): Strat {
  const now = new Date().toISOString();
  return { v: STRAT_VERSION, id: newId(), name, map, side, call: "", notes: "", objects: [], createdAt: now, updatedAt: now };
}

/** The lowest free number (1–5) for a team, or null when all five are placed. */
export function nextPlayerNumber(strat: Strat, team: Side): number | null {
  const used = new Set(strat.objects.filter((o) => o.kind === "player" && o.team === team).map((o) => (o as PlacedPlayer).n));
  for (let n = 1; n <= 5; n++) if (!used.has(n)) return n;
  return null;
}

/** Removes an object; removing a player also removes the routes attached to it. */
export function removeObject(strat: Strat, id: string): Strat {
  return {
    ...strat,
    objects: strat.objects.filter((o) => o.id !== id && !(o.kind === "route" && o.player === id)),
  };
}

export function duplicateStrat(strat: Strat): Strat {
  const now = new Date().toISOString();
  const idMap = new Map<string, string>();
  const objects = strat.objects.map((o) => {
    const id = newId();
    idMap.set(o.id, id);
    return { ...o, id };
  });
  return {
    ...strat,
    id: newId(),
    name: `${strat.name} (copy)`,
    objects: objects.map((o) => (o.kind === "route" && o.player ? { ...o, player: idMap.get(o.player) ?? null } : o)),
    createdAt: now,
    updatedAt: now,
  };
}

// ---------- validation (shared links and storage are untrusted) ----------

const UTILITY: UtilityType[] = ["smoke", "flash", "molotov", "he"];
const MAX_OBJECTS = 300;
const MAX_POINTS = 200;

function str(v: unknown, max: number, fallback = ""): string {
  return typeof v === "string" ? v.slice(0, max) : fallback;
}
function num(v: unknown, lo: number, hi: number): number | null {
  return typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : null;
}
function coord(v: unknown): number | null {
  return num(v, -50, 1050);
}
function pt(v: unknown): Pt | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const x = coord(o.x);
  const y = coord(o.y);
  return x === null || y === null ? null : { x, y };
}

function parseObject(v: unknown): BoardObject | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const id = str(o.id, 40);
  if (!id) return null;
  const t = num(o.t, 0, 600) ?? 0;
  switch (o.kind) {
    case "player": {
      const p = pt(o);
      const n = num(o.n, 1, 5);
      if (!p || n === null || (o.team !== "T" && o.team !== "CT")) return null;
      return { id, kind: "player", team: o.team, n: Math.round(n), role: str(o.role, 24), ...p };
    }
    case "route": {
      if (!Array.isArray(o.points)) return null;
      const points = o.points.slice(0, MAX_POINTS).map(pt).filter((p): p is Pt => p !== null);
      if (points.length < 2) return null;
      return {
        id,
        kind: "route",
        player: typeof o.player === "string" ? o.player.slice(0, 40) : null,
        points,
        t,
        duration: num(o.duration, 0.1, 120) ?? 1,
      };
    }
    case "utility": {
      const p = pt(o);
      if (!p || !UTILITY.includes(o.type as UtilityType)) return null;
      return { id, kind: "utility", type: o.type as UtilityType, t, ...p };
    }
    case "text": {
      const p = pt(o);
      const text = str(o.text, 120);
      if (!p || !text) return null;
      return { id, kind: "text", text, t, ...p };
    }
    default:
      return null;
  }
}

/** Turns untrusted JSON into a valid strat, dropping anything malformed. Null when it isn't a strat at all. */
export function parseStrat(v: unknown): Strat | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.v !== STRAT_VERSION || !isMapId(o.map) || (o.side !== "T" && o.side !== "CT")) return null;
  const objects = (Array.isArray(o.objects) ? o.objects : [])
    .slice(0, MAX_OBJECTS)
    .map(parseObject)
    .filter((x): x is BoardObject => x !== null);
  // Routes may only point at players that exist.
  const players = new Set(objects.filter((x) => x.kind === "player").map((x) => x.id));
  const clean = objects.map((x) => (x.kind === "route" && x.player && !players.has(x.player) ? { ...x, player: null } : x));
  const now = new Date().toISOString();
  return {
    v: STRAT_VERSION,
    id: str(o.id, 40) || newId(),
    name: str(o.name, 80) || "Untitled strat",
    map: o.map,
    side: o.side,
    call: str(o.call, 300),
    notes: str(o.notes, 2000),
    objects: clean,
    createdAt: str(o.createdAt, 40) || now,
    updatedAt: str(o.updatedAt, 40) || now,
  };
}

/** Rounds coordinates so saved and shared strats stay small. */
export function compact(strat: Strat): Strat {
  const r = (p: Pt): Pt => ({ x: Math.round(p.x), y: Math.round(p.y) });
  return {
    ...strat,
    objects: strat.objects.map((o) => {
      if (o.kind === "route") return { ...o, points: o.points.map(r), t: round1(o.t), duration: round1(o.duration) };
      if (o.kind === "player") return { ...o, ...r(o) };
      return { ...o, ...r(o), t: round1(o.t) };
    }),
  };
}
