/**
 * Map layouts. These are our own simplified schematics, drawn as named
 * areas on a 1000×1000 board, not Valve's radar images (those are © Valve
 * and not licensed for reuse). Areas are what a plan can later be checked
 * against: "smoke landed in Jungle", "entry reached A Site".
 *
 * Overlapping areas are fine: the board draws all walls first and all
 * floors on top, so connected areas merge into one floor plan.
 */

export type Team = "T" | "CT";

export interface Area {
  id: string;
  name: string;
  /** Rectangle on the 1000×1000 board. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Corridors are drawn but not labelled. */
  corridor?: boolean;
  /** Bombsite letter. */
  site?: "A" | "B";
  /** Spawn zone, tinted in the team's colour. */
  spawn?: Team;
}

/** Cover: boxes, cars, walls inside an area. */
export interface Prop {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A smaller named spot (a box, a corner) shown in a lighter label. */
export interface Callout {
  text: string;
  x: number;
  y: number;
}

export interface MapDef {
  id: MapId;
  name: string;
  areas: Area[];
  props: Prop[];
  callouts: Callout[];
}

export type MapId = "mirage" | "dust2" | "blank";

const r = (id: string, name: string, x: number, y: number, w: number, h: number, extra: Partial<Area> = {}): Area => ({
  id,
  name,
  x,
  y,
  w,
  h,
  ...extra,
});
const corridor = (id: string, x: number, y: number, w: number, h: number): Area => r(id, "", x, y, w, h, { corridor: true });
const box = (x: number, y: number, w: number, h: number): Prop => ({ x, y, w, h });

const MIRAGE: MapDef = {
  id: "mirage",
  name: "Mirage",
  areas: [
    r("t-spawn", "T Spawn", 800, 400, 150, 200, { spawn: "T" }),
    r("top-mid", "Top Mid", 640, 450, 170, 70),
    r("mid", "Mid", 430, 430, 220, 90),
    r("window", "Window", 340, 420, 90, 70),
    r("connector", "Connector", 400, 520, 70, 90),
    r("jungle", "Jungle", 320, 610, 120, 70),
    r("stairs", "Stairs", 460, 600, 70, 70),
    r("a-ramp", "A Ramp", 600, 600, 200, 60),
    r("tetris", "Tetris", 530, 640, 70, 60),
    r("a-site", "A Site", 300, 690, 240, 150, { site: "A" }),
    r("palace", "Palace", 540, 850, 260, 60),
    corridor("palace-path", 800, 600, 70, 310),
    r("ct-spawn", "CT Spawn", 140, 640, 160, 150, { spawn: "CT" }),
    r("ticket", "Ticket", 230, 840, 110, 60),
    r("short", "Short", 470, 250, 70, 180),
    r("b-short", "B Short", 380, 250, 90, 60),
    r("t-apps", "T Apps", 780, 180, 120, 220),
    r("b-apps", "B Apps", 380, 150, 400, 70),
    r("b-site", "B Site", 140, 100, 240, 180, { site: "B" }),
    r("market", "Market", 140, 300, 120, 100),
    r("kitchen", "Kitchen", 260, 300, 90, 80),
    corridor("market-ct", 170, 400, 60, 240),
  ],
  props: [
    box(492, 702, 30, 30), // firebox
    box(386, 790, 54, 22), // triple
    box(452, 742, 26, 26), // default
    box(650, 462, 22, 22), // top mid box
    box(168, 118, 64, 16), // bench
    box(318, 226, 44, 26), // van
    box(546, 650, 22, 22), // tetris box
  ],
  callouts: [
    { text: "Firebox", x: 507, y: 750 },
    { text: "Triple", x: 413, y: 830 },
    { text: "Ninja", x: 330, y: 826 },
    { text: "Van", x: 340, y: 270 },
    { text: "Bench", x: 200, y: 152 },
  ],
};

const DUST2: MapDef = {
  id: "dust2",
  name: "Dust II",
  areas: [
    r("t-spawn", "T Spawn", 380, 820, 260, 130, { spawn: "T" }),
    r("outside-long", "Outside Long", 640, 720, 100, 140),
    r("long-doors", "Long Doors", 740, 720, 70, 80),
    r("long-a", "Long A", 760, 280, 110, 440),
    r("a-site", "A Site", 620, 110, 260, 170, { site: "A" }),
    r("short", "Short", 520, 280, 80, 270),
    corridor("short-a", 580, 200, 60, 110),
    r("mid", "Mid", 420, 330, 100, 420),
    corridor("t-mid", 440, 750, 60, 70),
    r("mid-doors", "Mid Doors", 440, 230, 60, 100),
    r("ct-spawn", "CT Spawn", 420, 110, 200, 120, { spawn: "CT" }),
    r("b-doors", "B Doors", 340, 230, 100, 60),
    r("b-site", "B Site", 100, 110, 240, 210, { site: "B" }),
    r("b-tunnels", "B Tunnels", 140, 320, 100, 240),
    r("upper-tunnels", "Upper Tunnels", 120, 560, 160, 250),
    r("lower-tunnels", "Lower Tunnels", 280, 560, 140, 70),
    corridor("t-tunnels", 280, 780, 100, 60),
  ],
  props: [
    box(846, 126, 24, 24), // goose
    box(648, 236, 46, 24), // car
    box(736, 176, 30, 30), // default
    box(124, 236, 44, 44), // big box
    box(454, 560, 32, 32), // xbox
    box(786, 600, 40, 24), // blue
    box(270, 140, 40, 30), // back plat
  ],
  callouts: [
    { text: "Goose", x: 858, y: 168 },
    { text: "Car", x: 671, y: 278 },
    { text: "Xbox", x: 470, y: 612 },
    { text: "Blue", x: 806, y: 642 },
    { text: "Big box", x: 146, y: 300 },
    { text: "Pit", x: 845, y: 300 },
  ],
};

const BLANK: MapDef = { id: "blank", name: "Blank board", areas: [], props: [], callouts: [] };

export const MAPS: Record<MapId, MapDef> = { mirage: MIRAGE, dust2: DUST2, blank: BLANK };
export const MAP_IDS = Object.keys(MAPS) as MapId[];

export function isMapId(v: unknown): v is MapId {
  return typeof v === "string" && v in MAPS;
}

/** The named area containing a point, if any (corridors excluded). */
export function areaAt(map: MapDef, x: number, y: number): Area | null {
  return map.areas.find((a) => !a.corridor && x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) ?? null;
}

/** Centre of a named area, for templates. */
export function centre(map: MapDef, id: string): { x: number; y: number } {
  const a = map.areas.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown area ${id} on ${map.id}`);
  return { x: a.x + a.w / 2, y: a.y + a.h / 2 };
}
