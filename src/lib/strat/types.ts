import type { MapId } from "@/lib/maps";

export type Side = "T" | "CT";
export type UtilityType = "smoke" | "flash" | "molotov" | "he";
export type PenColor = "chalk" | "t" | "ct" | "red" | "green";

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
  /** Where the player is looking, in degrees (0 = east, 90 = south). Null = no view cone. */
  facing: number | null;
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

/** A freehand pen stroke. */
export interface DrawingObject {
  id: string;
  kind: "drawing";
  points: Pt[];
  color: PenColor;
}

/** A pin linking to a lineup video or image. */
export interface LineupObject extends Pt {
  id: string;
  kind: "lineup";
  title: string;
  /** http(s) link to a YouTube video or an image. */
  url: string;
}

export type BoardObject = PlacedPlayer | RouteObject | UtilityObject | TextObject | BombObject | DrawingObject | LineupObject;

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
  flash: 12,
  he: 18,
};

export const UTILITY_LABEL: Record<UtilityType, string> = {
  smoke: "Smoke",
  flash: "Flash",
  molotov: "Molotov",
  he: "HE grenade",
};

export const PEN_COLORS: Record<PenColor, { label: string; css: string }> = {
  chalk: { label: "Chalk", css: "var(--chalk)" },
  t: { label: "T orange", css: "var(--t)" },
  ct: { label: "CT blue", css: "var(--ct)" },
  red: { label: "Red", css: "var(--pen-red)" },
  green: { label: "Green", css: "var(--pen-green)" },
};

/** The step a scene is built from. */
export function sceneOf(strat: Strat, step: Step): Scene {
  return { map: strat.map, side: strat.side, objects: step.objects };
}
