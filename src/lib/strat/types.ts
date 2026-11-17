import type { MapId } from "@/lib/maps";

export type Side = "T" | "CT";
export type UtilityType = "smoke" | "flash" | "molotov" | "he";

export interface Pt {
  x: number;
  y: number;
}

/** A player token. Its x/y is where it stands at the start of the round. */
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
 * `t` to `t + duration` seconds into the round. Unattached = a plain arrow.
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
  /** Seconds into the round when it pops. */
  t: number;
}

export interface TextObject extends Pt {
  id: string;
  kind: "text";
  text: string;
  /** Seconds into the round when the note appears during playback. */
  t: number;
}

export type BoardObject = PlacedPlayer | RouteObject | UtilityObject | TextObject;

export const STRAT_VERSION = 1;

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
  objects: BoardObject[];
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
