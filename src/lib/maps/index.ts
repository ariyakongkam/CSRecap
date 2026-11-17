/**
 * Maps use Valve's official CS2 radar overviews as the board (public/maps,
 * © Valve Corporation), the same top-down images the game and FACEIT's 2D
 * viewer use. The board is 1000×1000 units over the 1024px radar.
 *
 * Callout areas below are placed on that board by hand; bombsite and spawn
 * positions come from the maps' public overview configs. Areas are what a
 * plan can be checked against ("smoke landed in Jungle"), and what the
 * example strats are positioned by.
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
  /** Bombsite letter. */
  site?: "A" | "B";
  /** Spawn zone, tinted in the team's colour. */
  spawn?: Team;
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
  /** Radar overview image (public path), or null for the blank board. */
  radar: string | null;
  /** In-game screenshot used behind the map picker. */
  thumb: string | null;
  /** Black/white mask of walls and objects that block sight cones (scripts/build-sight-masks.py). */
  sight?: string | null;
  areas: Area[];
  callouts: Callout[];
}

export type MapId = "mirage" | "dust2" | "inferno" | "nuke" | "ancient" | "anubis" | "train" | "overpass" | "blank";

const images = (m: string) => ({ radar: `/maps/${m}-radar.webp`, thumb: `/maps/${m}-thumb.webp`, sight: `/maps/${m}-sight.png` });

const r = (id: string, name: string, x: number, y: number, w: number, h: number, extra: Partial<Area> = {}): Area => ({
  id,
  name,
  x,
  y,
  w,
  h,
  ...extra,
});

/** Bombsites and spawns placed from a map's overview config (positions as 0–1 fractions). */
function basics(sites: { A?: [number, number]; B?: [number, number] }, t: [number, number], ct: [number, number]): Area[] {
  const at = ([fx, fy]: [number, number], w: number, h: number) => ({ x: fx * 1000 - w / 2, y: fy * 1000 - h / 2, w, h });
  const out: Area[] = [];
  if (sites.A) out.push({ id: "a-site", name: "A Site", site: "A", ...at(sites.A, 120, 100) });
  if (sites.B) out.push({ id: "b-site", name: "B Site", site: "B", ...at(sites.B, 120, 100) });
  out.push({ id: "t-spawn", name: "T Spawn", spawn: "T", ...at(t, 110, 80) });
  out.push({ id: "ct-spawn", name: "CT Spawn", spawn: "CT", ...at(ct, 110, 80) });
  return out;
}

const MIRAGE: MapDef = {
  id: "mirage",
  name: "Mirage",
  ...images("mirage"),
  areas: [
    r("t-spawn", "T Spawn", 845, 290, 70, 130, { spawn: "T" }),
    r("palace-path", "", 850, 430, 55, 180),
    r("top-mid", "Top Mid", 650, 420, 85, 100),
    r("mid", "Mid", 480, 410, 160, 100),
    r("short", "Short", 330, 260, 70, 140),
    r("connector", "Connector", 400, 495, 70, 85),
    r("jungle", "Jungle", 335, 565, 65, 75),
    r("stairs", "Stairs", 405, 585, 60, 55),
    r("a-ramp", "A Ramp", 670, 600, 170, 70),
    r("tetris", "Tetris", 605, 680, 50, 70),
    r("a-site", "A Site", 470, 650, 140, 140, { site: "A" }),
    r("palace", "Palace", 655, 715, 180, 85),
    r("ct-spawn", "CT Spawn", 235, 640, 110, 130, { spawn: "CT" }),
    r("ticket", "Ticket", 360, 735, 100, 60),
    r("market-ct", "", 290, 470, 50, 190),
    r("market", "Market", 155, 330, 100, 120),
    r("b-site", "B Site", 110, 170, 150, 135, { site: "B" }),
    r("b-apps", "B Apps", 270, 160, 170, 70),
    r("t-apps", "T Apps", 540, 150, 220, 50),
  ],
  callouts: [
    { text: "Ninja", x: 495, y: 790 },
    { text: "Window", x: 395, y: 435 },
    { text: "Catwalk", x: 455, y: 380 },
  ],
};

const DUST2: MapDef = {
  id: "dust2",
  name: "Dust II",
  ...images("dust2"),
  areas: [
    r("t-spawn", "T Spawn", 285, 850, 200, 90, { spawn: "T" }),
    r("outside-long", "Outside Long", 580, 700, 90, 140),
    r("long-doors", "Long Doors", 680, 560, 60, 110),
    r("long-a", "Long A", 840, 300, 110, 380),
    r("a-site", "A Site", 690, 100, 240, 150, { site: "A" }),
    r("short", "Short", 510, 375, 160, 55),
    r("short-a", "", 615, 250, 65, 130),
    r("mid", "Mid", 440, 440, 70, 380),
    r("mid-doors", "Mid Doors", 430, 260, 80, 120),
    r("ct-spawn", "CT Spawn", 555, 145, 105, 120, { spawn: "CT" }),
    r("b-doors", "B Doors", 255, 120, 60, 140),
    r("b-site", "B Site", 65, 60, 190, 180, { site: "B" }),
    r("b-tunnels", "B Tunnels", 65, 400, 185, 110),
    r("upper-tunnels", "Upper Tunnels", 90, 575, 180, 180),
    r("lower-tunnels", "Lower Tunnels", 285, 380, 150, 60),
  ],
  callouts: [
    { text: "Pit", x: 885, y: 640 },
    { text: "Goose", x: 905, y: 120 },
    { text: "Xbox", x: 480, y: 400 },
  ],
};

export const MAPS: Record<MapId, MapDef> = {
  mirage: MIRAGE,
  dust2: DUST2,
  inferno: { id: "inferno", name: "Inferno", ...images("inferno"), areas: basics({ A: [0.81, 0.69], B: [0.49, 0.22] }, [0.1, 0.67], [0.9, 0.35]), callouts: [] },
  nuke: { id: "nuke", name: "Nuke (upper)", ...images("nuke"), areas: basics({ A: [0.58, 0.48] }, [0.19, 0.54], [0.82, 0.45]), callouts: [] },
  ancient: { id: "ancient", name: "Ancient", ...images("ancient"), areas: basics({ A: [0.31, 0.25], B: [0.8, 0.4] }, [0.485, 0.87], [0.51, 0.17]), callouts: [] },
  anubis: { id: "anubis", name: "Anubis", ...images("anubis"), areas: basics({ A: [0.755, 0.245], B: [0.325, 0.49] }, [0.47, 0.905], [0.42, 0.215]), callouts: [] },
  train: { id: "train", name: "Train", ...images("train"), areas: basics({ A: [0.63, 0.49], B: [0.52, 0.76] }, [0.12, 0.25], [0.86, 0.77]), callouts: [] },
  overpass: { id: "overpass", name: "Overpass", ...images("overpass"), areas: basics({ A: [0.49, 0.18], B: [0.69, 0.32] }, [0.66, 0.93], [0.43, 0.07]), callouts: [] },
  blank: { id: "blank", name: "Blank board", radar: null, thumb: null, areas: [], callouts: [] },
};
export const MAP_IDS = Object.keys(MAPS) as MapId[];

export function isMapId(v: unknown): v is MapId {
  return typeof v === "string" && v in MAPS;
}

/** The named area containing a point, if any (unnamed connectors excluded). */
export function areaAt(map: MapDef, x: number, y: number): Area | null {
  return map.areas.find((a) => a.name && x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) ?? null;
}

/** Centre of a named area, for templates. */
export function centre(map: MapDef, id: string): { x: number; y: number } {
  const a = map.areas.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown area ${id} on ${map.id}`);
  return { x: a.x + a.w / 2, y: a.y + a.h / 2 };
}
