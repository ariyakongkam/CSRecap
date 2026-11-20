import type { MapId } from "@/lib/maps";
import type { Pt, Side } from "@/lib/strat/types";

/**
 * Every competitive CS2 spawn, on the 1000×1000 board. Spawn data by setpos.gg (https://setpos.gg),
 * CC BY 4.0 (github.com/setposgg/cs2-spawns), converted from game coordinates with each map's radar
 * overview (pos_x, pos_y, scale). Numbered like setpos.gg: facing the exit, left to right / front to back.
 * Train and Overpass are not in the data set yet.
 */
export interface Spawn extends Pt {
  /** setpos.gg spawn number on this side. */
  n: number;
}

export const SPAWNS: Partial<Record<MapId, Record<Side, Spawn[]>>> = {
  mirage: {
    T: [
      { n: 1, x: 884.0, y: 403.3 },
      { n: 2, x: 868.4, y: 394.5 },
      { n: 3, x: 852.7, y: 384.6 },
      { n: 4, x: 868.4, y: 375.8 },
      { n: 5, x: 852.7, y: 365.8 },
      { n: 6, x: 868.4, y: 357.0 },
      { n: 7, x: 852.7, y: 347.1 },
      { n: 8, x: 868.4, y: 337.7 },
      { n: 9, x: 852.7, y: 328.3 },
      { n: 10, x: 884.0, y: 328.3 },
    ],
    CT: [
      { n: 1, x: 307.4, y: 686.1 },
      { n: 2, x: 284.0, y: 686.1 },
      { n: 3, x: 294.9, y: 704.9 },
      { n: 4, x: 307.4, y: 720.5 },
      { n: 5, x: 284.0, y: 720.5 },
    ],
  },
  dust2: {
    T: [
      { n: 1, x: 287.4, y: 886.2 },
      { n: 2, x: 296.3, y: 898.2 },
      { n: 3, x: 310.7, y: 906.0 },
      { n: 4, x: 324.3, y: 898.2 },
      { n: 5, x: 332.0, y: 886.2 },
      { n: 6, x: 359.2, y: 882.8 },
      { n: 7, x: 367.0, y: 895.5 },
      { n: 8, x: 380.7, y: 904.5 },
      { n: 9, x: 394.9, y: 897.9 },
      { n: 10, x: 403.7, y: 886.6 },
      { n: 11, x: 431.2, y: 886.2 },
      { n: 12, x: 440.1, y: 898.2 },
      { n: 13, x: 454.5, y: 906.0 },
      { n: 14, x: 468.1, y: 898.2 },
      { n: 15, x: 475.9, y: 886.2 },
    ],
    CT: [
      { n: 1, x: 627.5, y: 196.7 },
      { n: 2, x: 623.8, y: 178.7 },
      { n: 3, x: 606.8, y: 168.3 },
      { n: 4, x: 590.0, y: 177.6 },
      { n: 5, x: 585.1, y: 192.9 },
    ],
  },
  inferno: {
    T: [
      { n: 1, x: 113.0, y: 685.4 },
      { n: 2, x: 99.7, y: 683.4 },
      { n: 3, x: 85.7, y: 687.7 },
      { n: 4, x: 82.0, y: 701.2 },
      { n: 5, x: 84.7, y: 713.7 },
    ],
    CT: [
      { n: 1, x: 872.7, y: 367.2 },
      { n: 2, x: 884.9, y: 377.3 },
      { n: 3, x: 893.7, y: 356.9 },
      { n: 4, x: 908.7, y: 371.5 },
      { n: 5, x: 912.8, y: 354.8 },
      { n: 6, x: 905.6, y: 342.2 },
    ],
  },
  nuke: {
    T: [
      { n: 1, x: 210.1, y: 537.4 },
      { n: 2, x: 219.7, y: 539.5 },
      { n: 3, x: 229.5, y: 545.8 },
      { n: 4, x: 212.6, y: 545.8 },
      { n: 5, x: 220.3, y: 552.9 },
      { n: 6, x: 229.5, y: 554.7 },
      { n: 7, x: 210.1, y: 556.5 },
      { n: 8, x: 226.1, y: 564.6 },
    ],
    CT: [
      { n: 1, x: 832.2, y: 473.1 },
      { n: 2, x: 842.2, y: 473.1 },
      { n: 3, x: 837.8, y: 461.9 },
      { n: 4, x: 831.1, y: 450.8 },
      { n: 5, x: 842.4, y: 450.8 },
    ],
  },
  ancient: {
    T: [
      { n: 1, x: 462.7, y: 869.5 },
      { n: 2, x: 475.2, y: 857.0 },
      { n: 3, x: 487.7, y: 869.5 },
      { n: 4, x: 500.2, y: 857.0 },
      { n: 5, x: 512.7, y: 869.5 },
    ],
    CT: [
      { n: 1, x: 539.3, y: 91.4 },
      { n: 2, x: 526.8, y: 85.2 },
      { n: 3, x: 508.0, y: 85.2 },
      { n: 4, x: 489.3, y: 85.2 },
      { n: 5, x: 476.8, y: 91.4 },
    ],
  },
  anubis: {
    T: [
      { n: 1, x: 445.3, y: 923.4 },
      { n: 2, x: 445.3, y: 939.9 },
      { n: 3, x: 451.2, y: 913.0 },
      { n: 4, x: 461.7, y: 908.5 },
      { n: 5, x: 466.2, y: 923.4 },
      { n: 6, x: 473.7, y: 914.5 },
      { n: 7, x: 479.3, y: 903.8 },
      { n: 8, x: 487.2, y: 923.4 },
      { n: 9, x: 494.3, y: 903.8 },
      { n: 10, x: 496.1, y: 915.9 },
      { n: 11, x: 499.1, y: 927.9 },
    ],
    CT: [
      { n: 1, x: 455.7, y: 226.0 },
      { n: 2, x: 448.2, y: 212.5 },
      { n: 3, x: 434.0, y: 208.0 },
      { n: 4, x: 418.3, y: 212.5 },
      { n: 5, x: 409.3, y: 226.0 },
    ],
  },
};

/** Five spawns spread across the side's spawn area (all of them, when there are five). */
export function fiveSpawns(map: MapId, side: Side): Spawn[] | null {
  const all = SPAWNS[map]?.[side];
  if (!all || all.length < 5) return null;
  return [0, 1, 2, 3, 4].map(
    (i) => all[Math.round((i * (all.length - 1)) / 4)],
  );
}
