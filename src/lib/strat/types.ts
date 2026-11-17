import type { MapId } from "@/lib/maps";

export type Side = "T" | "CT";
export type UtilityType = "smoke" | "flash" | "molotov" | "he";
/** Pen strokes: freehand, or a shape from a start point to an end point. */
export type DrawShape = "free" | "line" | "arrow" | "rect" | "dashed" | "dashed-arrow";
/** Sight cones come in three widths. */
export type ConeWidth = "wide" | "normal" | "narrow";

export interface Pt {
  x: number;
  y: number;
}

/** A player token. Its x/y is where it stands at the start of the step. */
export interface PlayerObject {
  id: string;
  kind: "player";
  team: Side;
  /** 1–5 within its team. */
  n: number;
  /** Short role shown under the token, e.g. "Entry", "AWP", "Lurk". */
  role: string;
}

export interface PlacedPlayer extends PlayerObject, Pt {}

/**
 * A movement path. When attached to a player, the player walks it from
 * `t` to `t + duration` seconds into the step. Unattached = a plain arrow.
 */
export interface RouteObject {
  id: string;
  kind: "route";
  player: string | null;
  points: Pt[];
  t: number;
  duration: number;
}

export interface UtilityObject extends Pt {
  id: string;
  kind: "utility";
  type: UtilityType;
  /** Seconds into the step when it pops. */
  t: number;
}

export interface TextObject extends Pt {
  id: string;
  kind: "text";
  text: string;
  /** Seconds into the step when the note appears during playback. */
  t: number;
}

/** The C4. One per step. */
export interface BombObject extends Pt {
  id: string;
  kind: "bomb";
  /** Seconds into the step when it's planted (shown from then on). */
  t: number;
}

/** A pen stroke. Freehand keeps every point; shapes keep [start, end]. */
export interface DrawingObject {
  id: string;
  kind: "drawing";
  shape: DrawShape;
  points: Pt[];
  /** #rrggbb */
  color: string;
  /** 0.1–1 */
  opacity: number;
  /** Stroke width on the 1000-unit board. */
  width: number;
}

/** A sight cone: where someone is looking, and how far. */
export interface VisionObject extends Pt {
  id: string;
  kind: "vision";
  /** Direction in degrees (0 = east, 90 = south). */
  angle: number;
  /** How far the cone reaches, in board units. */
  length: number;
  cone: ConeWidth;
}

/** A pin linking to a lineup video or image. */
export interface LineupObject extends Pt {
  id: string;
  kind: "lineup";
  title: string;
  /** http(s) link to a YouTube video or an image. */
  url: string;
}

export type BoardObject =
  | PlacedPlayer
  | RouteObject
  | UtilityObject
  | TextObject
  | BombObject
  | DrawingObject
  | LineupObject
  | VisionObject;

/** One board in a strat's sequence, e.g. "Default", "Execute", "Post-plant". */
export interface Step {
  id: string;
  name: string;
  objects: BoardObject[];
}

/** What the board and timeline need: one step's objects on a map. */
export interface Scene {
  map: MapId;
  side: Side;
  objects: BoardObject[];
}

export const STRAT_VERSION = 2;

export interface Strat {
  v: typeof STRAT_VERSION;
  id: string;
  name: string;
  map: MapId;
  side: Side;
  /** When the IGL calls it. */
  call: string;
  /** Free notes: abort call, fallback, variations. */
  notes: string;
  steps: Step[];
  createdAt: string;
  updatedAt: string;
}

/** How long each grenade stays on the board during playback, in seconds. */
export const UTILITY_DURATION: Record<UtilityType, number> = {
  smoke: 18,
  molotov: 7,
  flash: 2,
  he: 1,
};

/** Drawn radius on the 1000-unit board. */
export const UTILITY_RADIUS: Record<UtilityType, number> = {
  smoke: 30,
  molotov: 22,
  flash: 16,
  he: 18,
};

export const UTILITY_LABEL: Record<UtilityType, string> = {
  smoke: "Smoke",
  flash: "Flash",
  molotov: "Molotov",
  he: "HE grenade",
};

/** The pen's colour swatches. Any other colour can be picked too. */
export const PEN_SWATCHES: { label: string; hex: string }[] = [
  { label: "White", hex: "#ffffff" },
  { label: "Black", hex: "#111111" },
  { label: "Red", hex: "#ff4d4d" },
  { label: "Yellow", hex: "#ffd43b" },
  { label: "Green", hex: "#69db7c" },
  { label: "Blue", hex: "#4dabf7" },
];

export const DRAW_SHAPE_LABEL: Record<DrawShape, string> = {
  free: "Freehand",
  line: "Line",
  arrow: "Arrow",
  rect: "Rectangle",
  dashed: "Dashed line",
  "dashed-arrow": "Dashed arrow",
};

export interface PenSettings {
  shape: DrawShape;
  color: string;
  opacity: number;
  width: number;
}

export const DEFAULT_PEN: PenSettings = { shape: "free", color: "#ffffff", opacity: 1, width: 5 };

/** Opening angle of each cone width, in degrees. */
export const CONE_DEGREES: Record<ConeWidth, number> = { wide: 100, normal: 60, narrow: 22 };
export const CONE_LABEL: Record<ConeWidth, string> = { wide: "Wide sight", normal: "Normal sight", narrow: "Narrow sight" };
export const CONE_LENGTH = { min: 40, max: 700, default: 160 };

export const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** The step a scene is built from. */
export function sceneOf(strat: Strat, step: Step): Scene {
  return { map: strat.map, side: strat.side, objects: step.objects };
}
