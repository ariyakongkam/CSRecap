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
    /** A teammate; with `facing`, a sight cone where they look. */
    player(n: number, role: string, pos: Pt, facing: number | null = null): PlacedPlayer {
      const p: PlacedPlayer = { id: newId(), kind: "player", team: side, n, role, ...pos };
      add(p);
      if (facing !== null) add({ id: newId(), kind: "vision", angle: facing, length: 150, cone: "normal", ...pos });
      return p;
    },
    enemy(n: number, pos: Pt, facing: number | null = null): PlacedPlayer {
      const p: PlacedPlayer = { id: newId(), kind: "player", team: enemyOf(side), n, role: "", ...pos };
      add(p);
      if (facing !== null) add({ id: newId(), kind: "vision", angle: facing, length: 150, cone: "wide", ...pos });
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

const p = (x: number, y: number): Pt => ({ x, y });

function mirageAExecute(): Strat {
  const b = builder("mirage", "T", "Mirage A Execute");
  b.strat.call = "Default into A when mid is quiet and CT has two on A. Call at 1:15.";
  b.strat.notes = "Abort: if Palace entry dies before smokes land, fall back to a mid split.\nPlant default for the post-plant.";
  b.name("Execute");
  const p1 = b.player(1, "Palace entry", p(872, 470), 90);
  const p2 = b.player(2, "Ramp support", p(865, 410), 110);
  const p3 = b.player(3, "Smokes", p(872, 350));
  const p4 = b.player(4, "Flash", p(865, 290));
  const p5 = b.player(5, "Lurk mid", p(870, 230), 180);
  // Palace: down the T side, through Palace, out onto A.
  b.route(p1, 3, p(880, 600), p(860, 650), p(860, 760), p(700, 770));
  // Ramp: along the bottom corridor to the top of A Ramp.
  b.route(p2, 3, p(880, 560), p(820, 605), p(730, 635));
  b.route(p3, 2, p(880, 560), p(820, 605), p(790, 615));
  b.route(p4, 2, p(880, 580), p(840, 610), p(760, 625));
  // Lurk: across Top Mid into Mid.
  b.route(p5, 1, p(875, 540), p(760, 540), p(690, 470), p(570, 455));
  b.utility("smoke", 11, b.at("jungle"));
  b.utility("smoke", 11, b.at("ct-spawn", 40, 0));
  b.utility("smoke", 12, b.at("stairs"));
  b.utility("flash", 14, b.at("a-site", 10, -20));
  b.route(p1, 15, p(640, 760), p(560, 745));
  b.route(p2, 15, p(650, 680), p(600, 700), p(560, 700));
  b.enemy(1, b.at("a-site", -20, 10), 0);
  b.enemy(2, b.at("jungle", 0, 0), 20);
  b.lineup("Jungle smoke from A Ramp", "https://www.youtube.com/results?search_query=cs2+mirage+jungle+smoke+lineup", p(800, 590));
  b.note("Smokes down: go on the flash", 13, p(300, 880));

  b.next("Post-plant");
  b.clearEnemies();
  b.bomb(1, b.at("a-site", 0, 20));
  b.route(b.mine(1), 1, p(520, 780));
  b.route(b.mine(2), 1, p(630, 710));
  b.route(b.mine(3), 2, p(740, 630));
  b.route(b.mine(4), 2, p(700, 760));
  b.enemy(3, b.at("ct-spawn", -20, 10), 0);
  b.enemy(4, b.at("market-ct", 0, 40), 90);
  b.utility("molotov", 8, b.at("a-site", 0, 20));
  b.note("Play crossfires, molly the bomb on the defuse", 0, p(300, 880));
  return b.strat;
}

function dust2LongTake(): Strat {
  const b = builder("dust2", "T", "Dust II Long A Take");
  b.strat.call = "When long has been passive for two rounds. Call off spawn.";
  b.strat.notes = "Abort: if long doors gets a molotov early, swap to a cat + long split.";
  b.name("Long take");
  const p1 = b.player(1, "Entry", p(470, 885), 0);
  const p2 = b.player(2, "Trade", p(430, 905));
  const p3 = b.player(3, "Smokes", p(390, 880));
  const p4 = b.player(4, "AWP", p(350, 905));
  const p5 = b.player(5, "Short", p(310, 880));
  // Long: out of spawn, through the doors, up Long.
  b.route(p1, 0, p(560, 880), p(620, 790), p(700, 680), p(710, 600), p(800, 590), p(890, 560));
  b.route(p2, 1, p(560, 900), p(625, 800), p(705, 690), p(715, 610), p(810, 600), p(890, 600));
  b.route(p3, 0, p(560, 870), p(615, 780));
  b.route(p4, 2, p(560, 905), p(630, 810));
  // Short: up Mid, onto Short.
  b.route(p5, 0, p(470, 830), p(475, 600), p(475, 410), p(560, 400), p(645, 360));
  b.utility("smoke", 14, p(745, 245));
  b.utility("flash", 16, p(895, 330));
  b.utility("molotov", 17, b.at("a-site", 0, 10));
  b.route(p1, 18, p(895, 320), p(830, 200));
  b.note("Wait for the CT smoke before pushing long", 12, p(200, 960));
  b.enemy(1, p(895, 300), 90);
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
