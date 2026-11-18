import { isMapId, type MapId } from "@/lib/maps";
import { clamp, round1 } from "./geometry";
import {
  CONE_DEGREES,
  CONE_LENGTH,
  MARKER_TYPES,
  STRAT_VERSION,
  isHexColor,
  type BoardObject,
  type ConeWidth,
  type DrawShape,
  type MarkerType,
  type PlacedPlayer,
  type Pt,
  type Scene,
  type Side,
  type Step,
  type Strat,
  type UtilityType,
} from "./types";

export function newId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

export function newStep(name: string, objects: BoardObject[] = []): Step {
  return { id: newId(), name, objects };
}

export function createStrat(map: MapId, side: Side, name = "Untitled strat"): Strat {
  const now = new Date().toISOString();
  return {
    v: STRAT_VERSION,
    id: newId(),
    name,
    map,
    side,
    call: "",
    notes: "",
    steps: [newStep("Phase 1")],
    createdAt: now,
    updatedAt: now,
  };
}

export function enemyOf(side: Side): Side {
  return side === "T" ? "CT" : "T";
}

/** The lowest free number (1–5) for a team, or null when all five are placed. */
export function nextPlayerNumber(scene: Pick<Scene, "objects">, team: Side): number | null {
  const used = new Set(scene.objects.filter((o): o is PlacedPlayer => o.kind === "player" && o.team === team).map((o) => o.n));
  for (let n = 1; n <= 5; n++) if (!used.has(n)) return n;
  return null;
}

/** Removes an object; removing a player also removes the routes attached to it. */
export function removeObject(objects: BoardObject[], id: string): BoardObject[] {
  return objects
    .filter((o) => o.id !== id && !((o.kind === "route" || o.kind === "vision") && o.player === id))
    .map((o) => (o.kind === "utility" && o.from === id ? { ...o, from: null } : o));
}

/** Copies objects with fresh ids, keeping routes attached to the copied players. */
/** Steps are called phases now: default names "Step 3" read as "Phase 3". */
export function phaseName(name: string): string {
  return name.replace(/^Step (\d+)$/, "Phase $1");
}

export function cloneObjects(objects: BoardObject[]): BoardObject[] {
  const idMap = new Map<string, string>();
  const copies = objects.map((o) => {
    const id = newId();
    idMap.set(o.id, id);
    return { ...o, id };
  });
  return copies.map((o) => {
    if ((o.kind === "route" || o.kind === "vision") && o.player) return { ...o, player: idMap.get(o.player) ?? null };
    if (o.kind === "utility" && o.from) return { ...o, from: idMap.get(o.from) ?? null };
    return o;
  });
}

/** What a new phase brings along from the one before it. */
export type CarryOver = "all" | "players";

/**
 * The next phase starts where this one ends: players stand where their routes finished.
 * "all" also brings everything else already placed (grenades, bomb, cones, markers, notes,
 * drawings, lineups), shown from the start of the phase. "players" brings only the players,
 * the cones attached to them and the bomb, for a clean board (e.g. the post-plant).
 * Routes always stay behind, since they have been walked.
 */
export function continueStep(step: Step, name: string, carry: CarryOver = "all"): Step {
  // Where each player ends up: the last point of their latest route.
  const ends = new Map<string, Pt>();
  const latest = new Map<string, number>();
  for (const o of step.objects) {
    if (o.kind !== "route" || !o.player) continue;
    if (o.t >= (latest.get(o.player) ?? -1)) {
      latest.set(o.player, o.t);
      ends.set(o.player, o.points[o.points.length - 1]);
    }
  }
  const carried: BoardObject[] = step.objects.flatMap((o): BoardObject[] => {
    if (o.kind === "player") {
      const end = ends.get(o.id);
      return [{ ...o, ...(end ?? { x: o.x, y: o.y }) }];
    }
    if (o.kind === "route") return [];
    if (o.kind === "bomb") return [{ ...o, t: 0 }];
    if (carry === "players") return o.kind === "vision" && o.player ? [{ ...o }] : [];
    if (o.kind === "utility" || o.kind === "text") return [{ ...o, t: 0 }];
    return [{ ...o }];
  });
  return newStep(name, cloneObjects(carried));
}

export function duplicateStrat(strat: Strat): Strat {
  const now = new Date().toISOString();
  return {
    ...strat,
    id: newId(),
    name: `${strat.name} (copy)`,
    steps: strat.steps.map((s) => ({ ...s, id: newId(), objects: cloneObjects(s.objects) })),
    createdAt: now,
    updatedAt: now,
  };
}

/** Moves item `from` to index `to`. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Only http(s) links are kept; anything else (javascript:, data:) is dropped. */
export function safeUrl(v: string): string {
  const trimmed = v.trim();
  if (!trimmed) return "";
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

/** The YouTube video id in a youtube.com or youtu.be link, if any. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com") {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/);
      return m ? m[1] : null;
    }
  } catch {
    /* not a url */
  }
  return null;
}

// ---------- validation (shared links and storage are untrusted) ----------

const UTILITY: UtilityType[] = ["smoke", "flash", "molotov", "he", "decoy"];
const DRAW_SHAPES: DrawShape[] = ["free", "line", "arrow", "rect", "dashed", "dashed-arrow"];
/** Pen colours saved by name before the colour picker existed. */
const LEGACY_PEN: Record<string, string> = { chalk: "#ffffff", t: "#e8a33d", ct: "#5e9eff", red: "#ff4d4d", green: "#69db7c" };

export const normAngle = (deg: number) => ((Math.round(deg) % 360) + 360) % 360;
const MAX_OBJECTS = 400;
const MAX_POINTS = 400;
const MAX_STEPS = 12;

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
function points(v: unknown): Pt[] {
  return Array.isArray(v) ? v.slice(0, MAX_POINTS).map(pt).filter((p): p is Pt => p !== null) : [];
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
      const pts = points(o.points);
      if (pts.length < 2) return null;
      return {
        id,
        kind: "route",
        player: typeof o.player === "string" ? o.player.slice(0, 40) : null,
        points: pts,
        t,
        duration: num(o.duration, 0.1, 120) ?? 1,
      };
    }
    case "utility": {
      const p = pt(o);
      if (!p || !UTILITY.includes(o.type as UtilityType)) return null;
      return { id, kind: "utility", type: o.type as UtilityType, t, from: typeof o.from === "string" ? o.from.slice(0, 40) : null, ...p };
    }
    case "marker": {
      const p = pt(o);
      if (!p || !MARKER_TYPES.includes(o.icon as MarkerType)) return null;
      return { id, kind: "marker", icon: o.icon as MarkerType, ...p };
    }
    case "text": {
      const p = pt(o);
      const text = str(o.text, 120);
      if (!p || !text) return null;
      return { id, kind: "text", text, t, ...p };
    }
    case "bomb": {
      const p = pt(o);
      return p ? { id, kind: "bomb", t, ...p } : null;
    }
    case "drawing": {
      const pts = points(o.points);
      if (pts.length < 2) return null;
      const shape: DrawShape = DRAW_SHAPES.includes(o.shape as DrawShape) ? (o.shape as DrawShape) : "free";
      return {
        id,
        kind: "drawing",
        shape,
        points: shape === "free" ? pts : [pts[0], pts[pts.length - 1]],
        color: isHexColor(o.color) ? o.color.toLowerCase() : (LEGACY_PEN[o.color as string] ?? "#ffffff"),
        opacity: num(o.opacity, 0.1, 1) ?? 1,
        width: num(o.width, 1, 20) ?? 4.5,
      };
    }
    case "vision": {
      const p = pt(o);
      const angle = num(o.angle, -720, 720);
      if (!p || angle === null) return null;
      const cone: ConeWidth = typeof o.cone === "string" && o.cone in CONE_DEGREES ? (o.cone as ConeWidth) : "normal";
      return {
        id,
        kind: "vision",
        player: typeof o.player === "string" ? o.player.slice(0, 40) : null,
        angle: normAngle(angle),
        length: num(o.length, CONE_LENGTH.min, CONE_LENGTH.max) ?? CONE_LENGTH.default,
        cone,
        ...p,
      };
    }
    case "lineup": {
      const p = pt(o);
      if (!p) return null;
      return { id, kind: "lineup", title: str(o.title, 60), url: safeUrl(str(o.url, 500)), ...p };
    }
    default:
      return null;
  }
}

/** Players used to carry their own view cone ("facing"); it is now a separate sight cone. */
function legacyCones(raw: unknown[]): unknown[] {
  return raw.flatMap((o) => {
    if (!o || typeof o !== "object") return [o];
    const r = o as Record<string, unknown>;
    if (r.kind !== "player" || typeof r.facing !== "number") return [o];
    return [o, { id: `${String(r.id).slice(0, 30)}-cone`, kind: "vision", player: r.id, x: r.x, y: r.y, angle: r.facing, length: 125, cone: "wide" }];
  });
}

function parseObjects(v: unknown): BoardObject[] {
  const objects = legacyCones(Array.isArray(v) ? v : [])
    .slice(0, MAX_OBJECTS)
    .map(parseObject)
    .filter((x): x is BoardObject => x !== null);
  // Routes may only point at players that exist; only one bomb per step.
  const players = new Set(objects.filter((x) => x.kind === "player").map((x) => x.id));
  let bombSeen = false;
  return objects
    .filter((x) => {
      if (x.kind !== "bomb") return true;
      if (bombSeen) return false;
      bombSeen = true;
      return true;
    })
    .map((x) => ((x.kind === "route" || x.kind === "vision") && x.player && !players.has(x.player) ? { ...x, player: null } : x));
}

/**
 * Turns untrusted JSON into a valid strat, dropping anything malformed.
 * Reads version 1 (a single board) as a one-step strat. Null when it isn't a strat at all.
 */
export function parseStrat(v: unknown): Strat | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if ((o.v !== 1 && o.v !== STRAT_VERSION) || !isMapId(o.map) || (o.side !== "T" && o.side !== "CT")) return null;

  let steps: Step[];
  if (o.v === 1) {
    steps = [{ id: newId(), name: "Phase 1", objects: parseObjects(o.objects) }];
  } else {
    steps = (Array.isArray(o.steps) ? o.steps : [])
      .slice(0, MAX_STEPS)
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .map((s, i) => ({ id: str(s.id, 40) || newId(), name: phaseName(str(s.name, 40)) || `Phase ${i + 1}`,
        objects: parseObjects(s.objects),
        ...(str(s.note, 500) ? { note: str(s.note, 500) } : {}),
      }));
    if (steps.length === 0) steps = [newStep("Phase 1")];
  }

  const now = new Date().toISOString();
  return {
    v: STRAT_VERSION,
    id: str(o.id, 40) || newId(),
    name: str(o.name, 80) || "Untitled strat",
    map: o.map,
    side: o.side,
    call: str(o.call, 300),
    notes: str(o.notes, 2000),
    steps,
    createdAt: str(o.createdAt, 40) || now,
    updatedAt: str(o.updatedAt, 40) || now,
  };
}

/** Rounds coordinates so saved and shared strats stay small. */
export function compact(strat: Strat): Strat {
  const r = (p: Pt): Pt => ({ x: Math.round(p.x), y: Math.round(p.y) });
  return {
    ...strat,
    steps: strat.steps.map((s) => ({
      ...s,
      objects: s.objects.map((o): BoardObject => {
        switch (o.kind) {
          case "route":
            return { ...o, points: o.points.map(r), t: round1(o.t), duration: round1(o.duration) };
          case "drawing":
            return { ...o, points: o.points.map(r) };
          case "player":
          case "lineup":
          case "marker":
            return { ...o, ...r(o) };
          case "vision":
            return { ...o, ...r(o), length: Math.round(o.length) };
          default:
            return { ...o, ...r(o), t: round1(o.t) };
        }
      }),
    })),
  };
}

/**
 * The rest of the team, standing in their spawn: one player for each free number,
 * spread out so the tokens and role labels don't overlap. On a map with no spawn, the middle.
 */
export function teamAtSpawn(scene: Scene, spawn: { x: number; y: number; w: number; h: number } | null): PlacedPlayer[] {
  const used = new Set(scene.objects.filter((o): o is PlacedPlayer => o.kind === "player" && o.team === scene.side).map((o) => o.n));
  const c = spawn ? { x: spawn.x + spawn.w / 2, y: spawn.y + spawn.h / 2 } : { x: 500, y: 500 };
  const tall = spawn ? spawn.h > spawn.w : false;
  const spread = [-2, -1, 0, 1, 2];
  const out: PlacedPlayer[] = [];
  for (let n = 1; n <= 5; n++) {
    if (used.has(n)) continue;
    const i = spread[n - 1];
    const along = i * 42;
    const across = n % 2 === 0 ? 26 : -26;
    const x = tall ? c.x + across : c.x + along;
    const y = tall ? c.y + along : c.y + across;
    out.push({ id: newId(), kind: "player", team: scene.side, n, role: "", x: clamp(x, 20, 980), y: clamp(y, 20, 980) });
  }
  return out;
}

/** True when two versions of a strat have the same content (save times aside). */
export function sameContent(a: Strat, b: Strat): boolean {
  const body = (s: Strat) => JSON.stringify(compact({ ...s, createdAt: "", updatedAt: "" }));
  return body(a) === body(b);
}

/** A copy of your version, kept before an invite link replaces it. */
export function backupCopy(strat: Strat): Strat {
  return { ...duplicateStrat(strat), name: `${strat.name} (your earlier version)`.slice(0, 80) };
}
