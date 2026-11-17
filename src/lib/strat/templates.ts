import { MAPS, centre, type MapId } from "@/lib/maps";
import { nextRouteStart, playerEndPosition, walkDuration } from "./timeline";
import { continueStep, createStrat, enemyOf, newId, newStep } from "./model";
import type { BoardObject, PlacedPlayer, Pt, Scene, Side, Step, Strat, UtilityType } from "./types";

export interface Template {
  id: string;
  name: string;
  map: MapId;
  side: Side;
  description: string;
  build: () => Strat;
}

/** Small builder so templates read like a strat sheet. Each call to `step` starts a new board. */
function builder(map: MapId, side: Side, name: string) {
  const strat = createStrat(map, side, name);
  const def = MAPS[map];
  let step: Step = strat.steps[0];
  const scene = (): Scene => ({ map, side, objects: step.objects });
  const at = (area: string, dx = 0, dy = 0): Pt => {
    const c = centre(def, area);
    return { x: c.x + dx, y: c.y + dy };
  };
  const add = (o: BoardObject) => step.objects.push(o);
  return {
    strat,
    at,
    /** Renames the current step. */
    name(n: string) {
      step.name = n;
    },
    /** Starts the next step from where everyone ended up. */
    next(n: string) {
      step = continueStep(step, n);
      strat.steps.push(step);
    },
    /** Takes the enemies off the current step (e.g. traded during the execute). */
    clearEnemies() {
      step.objects = step.objects.filter((o) => !(o.kind === "player" && o.team !== side));
    },
    /** A fresh, empty next step. */
    blank(n: string) {
      step = newStep(n);
      strat.steps.push(step);
    },
    player(n: number, role: string, pos: Pt, facing: number | null = null): PlacedPlayer {
      const p: PlacedPlayer = { id: newId(), kind: "player", team: side, n, role, facing, ...pos };
      add(p);
      return p;
    },
    enemy(n: number, pos: Pt, facing: number | null = null): PlacedPlayer {
      const p: PlacedPlayer = { id: newId(), kind: "player", team: enemyOf(side), n, role: "", facing, ...pos };
      add(p);
      return p;
    },
    /** The player with number n on our side in the current step. */
    mine(n: number): PlacedPlayer {
      const p = step.objects.find((o): o is PlacedPlayer => o.kind === "player" && o.team === side && o.n === n);
      if (!p) throw new Error(`No player ${n}`);
      return p;
    },
    /** A move that starts where the player's previous move ended, no earlier than that move's end. */
    route(p: PlacedPlayer, t: number, ...via: Pt[]) {
      const points = [playerEndPosition(scene(), p), ...via];
      const start = Math.max(t, nextRouteStart(scene(), p.id));
      add({ id: newId(), kind: "route", player: p.id, points, t: start, duration: walkDuration(points) });
    },
    utility(type: UtilityType, t: number, pos: Pt) {
      add({ id: newId(), kind: "utility", type, t, ...pos });
    },
    note(text: string, t: number, pos: Pt) {
      add({ id: newId(), kind: "text", text, t, ...pos });
    },
    bomb(t: number, pos: Pt) {
      add({ id: newId(), kind: "bomb", t, ...pos });
    },
    lineup(title: string, url: string, pos: Pt) {
      add({ id: newId(), kind: "lineup", title, url, ...pos });
    },
  };
}

function mirageAExecute(): Strat {
  const b = builder("mirage", "T", "Mirage A Execute");
  b.strat.call = "Default into A when mid is quiet and CT has two on A. Call at 1:15.";
  b.strat.notes = "Abort: if Palace entry dies before smokes land, fall back to a mid split.\nPlant default for the post-plant.";
  b.name("Execute");
  const p1 = b.player(1, "Palace entry", b.at("t-spawn", 40, 90), 135);
  const p2 = b.player(2, "Ramp support", b.at("t-spawn", -45, 55), 160);
  const p3 = b.player(3, "Smokes", b.at("t-spawn", -45, -30));
  const p4 = b.player(4, "Flash", b.at("t-spawn", 45, 10));
  const p5 = b.player(5, "Lurk mid", b.at("t-spawn", 30, -80), 180);
  b.route(p1, 3, b.at("palace-path", 0, 80), b.at("palace", 100, 0), b.at("palace", -40, 0));
  b.route(p2, 3, b.at("a-ramp", 60, 0), b.at("a-ramp", -40, 0));
  b.route(p3, 2, b.at("a-ramp", 80, 0));
  b.route(p4, 2, b.at("a-ramp", 40, 10));
  b.route(p5, 1, b.at("top-mid", 20, 0), b.at("mid", 40, 0));
  b.utility("smoke", 11, b.at("jungle"));
  b.utility("smoke", 11, b.at("ct-spawn", 60, 0));
  b.utility("smoke", 12, b.at("stairs"));
  b.utility("flash", 14, b.at("a-site", 40, -30));
  b.route(p1, 15, b.at("a-site", 90, 40), b.at("a-site", 0, 30));
  b.route(p2, 15, b.at("tetris"), b.at("a-site", 30, -20));
  b.enemy(1, b.at("a-site", -60, -40), 0);
  b.enemy(2, b.at("jungle", -20, 10), 20);
  b.lineup("Jungle smoke from A Ramp", "https://www.youtube.com/results?search_query=cs2+mirage+jungle+smoke+lineup", b.at("a-ramp", 70, -18));
  b.note("Smokes down: go on the flash", 13, b.at("ticket", 0, 75));

  b.next("Post-plant");
  b.clearEnemies();
  b.bomb(1, b.at("a-site", -10, 10));
  b.route(b.mine(1), 1, b.at("a-site", 60, 40));
  b.route(b.mine(2), 1, b.at("palace", -60, 0));
  b.route(b.mine(3), 2, b.at("tetris", 0, 0));
  b.route(b.mine(4), 2, b.at("a-ramp", -60, 0));
  b.enemy(3, b.at("ct-spawn", -20, 20), 0);
  b.enemy(4, b.at("market-ct", 0, 60), 90);
  b.utility("molotov", 8, b.at("a-site", -10, 10));
  b.note("Play crossfires, molly the bomb on the defuse", 0, b.at("ticket", 0, 75));
  return b.strat;
}

function dust2LongTake(): Strat {
  const b = builder("dust2", "T", "Dust II Long A Take");
  b.strat.call = "When long has been passive for two rounds. Call off spawn.";
  b.strat.notes = "Abort: if long doors gets a molotov early, swap to a cat + long split.";
  b.name("Long take");
  const p1 = b.player(1, "Entry", b.at("t-spawn", 100, -30), 0);
  const p2 = b.player(2, "Trade", b.at("t-spawn", 40, 30));
  const p3 = b.player(3, "Smokes", b.at("t-spawn", -20, -30));
  const p4 = b.player(4, "AWP", b.at("t-spawn", -80, 30));
  const p5 = b.player(5, "Short", b.at("t-spawn", -110, -30));
  b.route(p1, 0, b.at("outside-long"), b.at("long-doors"), b.at("long-a", 0, 200));
  b.route(p2, 1, b.at("outside-long"), b.at("long-doors"), b.at("long-a", 0, 240));
  b.route(p3, 0, b.at("outside-long", 0, 40));
  b.route(p4, 2, b.at("outside-long", -20, 60));
  b.route(p5, 0, b.at("t-mid"), b.at("mid", 0, 60), b.at("short", 0, 80));
  b.utility("smoke", 14, b.at("ct-spawn", 60, 20));
  b.utility("flash", 16, b.at("long-a", 0, -80));
  b.utility("molotov", 17, b.at("a-site", 60, 30));
  b.route(p1, 18, b.at("long-a", 0, -120), b.at("a-site", 40, 20));
  b.note("Wait for the CT smoke before pushing long", 12, { x: 300, y: 950 });
  b.enemy(1, b.at("long-a", 0, -150), 90);
  b.enemy(2, b.at("a-site", -40, 0), 0);
  return b.strat;
}

export const TEMPLATES: Template[] = [
  {
    id: "mirage-a-execute",
    name: "Mirage A Execute",
    map: "mirage",
    side: "T",
    description: "Two steps: Palace and Ramp execute with smokes on Jungle, CT and Stairs, then the post-plant.",
    build: mirageAExecute,
  },
  {
    id: "dust2-long-take",
    name: "Dust II Long A Take",
    map: "dust2",
    side: "T",
    description: "Two through long doors, CT smoke, flash and molotov for the site.",
    build: dust2LongTake,
  },
];
