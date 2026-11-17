import { pathLength, pointAlong, round1 } from "./geometry";
import { UTILITY_DURATION, type BoardObject, type PlacedPlayer, type Pt, type RouteObject, type Scene } from "./types";

/**
 * Running speed on the 1000-unit board, in units per second. A CS2 map is
 * roughly 4,000 game units across and players run at about 250 units/s,
 * so crossing the board takes about 16 seconds.
 */
export const RUN_SPEED = 62;

/** Seconds a player needs to walk a path at running speed (at least 1). */
export function walkDuration(points: Pt[]): number {
  return Math.max(1, round1(pathLength(points) / RUN_SPEED));
}

export function routesOf(strat: Scene, playerId: string): RouteObject[] {
  return strat.objects
    .filter((o): o is RouteObject => o.kind === "route" && o.player === playerId)
    .sort((a, b) => a.t - b.t);
}

/** Where a player is `time` seconds into the round, following their routes in start order. */
export function playerPositionAt(strat: Scene, player: PlacedPlayer, time: number): Pt {
  let pos: Pt = { x: player.x, y: player.y };
  for (const r of routesOf(strat, player.id)) {
    if (time < r.t) break;
    const progress = r.duration > 0 ? (time - r.t) / r.duration : 1;
    pos = pointAlong(r.points, progress);
    if (progress < 1) break;
  }
  return pos;
}

/** When a player's next route can start: right after their last one ends, or 0. */
export function nextRouteStart(strat: Scene, playerId: string | null): number {
  if (!playerId) return 0;
  const routes = routesOf(strat, playerId);
  const last = routes.at(-1);
  return last ? round1(last.t + last.duration) : 0;
}

/** Where a player stands after their last route, used as the start of the next one. */
export function playerEndPosition(strat: Scene, player: PlacedPlayer): Pt {
  const last = routesOf(strat, player.id).at(-1);
  return last ? last.points[last.points.length - 1] : { x: player.x, y: player.y };
}

export type Visibility = { show: boolean; opacity: number };

/** Whether an object is on the board at `time` (null = editing: show everything). */
export function visibilityAt(o: BoardObject, time: number | null): Visibility {
  if (time === null) return { show: true, opacity: 1 };
  switch (o.kind) {
    case "player":
      return { show: true, opacity: 1 };
    case "route":
      // Paths stay visible as a faint guide; the active one is highlighted.
      return { show: true, opacity: time >= o.t && time <= o.t + o.duration ? 0.9 : 0.25 };
    case "utility": {
      const end = o.t + UTILITY_DURATION[o.type];
      if (time < o.t || time > end) return { show: false, opacity: 0 };
      const fadeIn = Math.min(1, (time - o.t) / 0.3);
      const fadeOut = Math.min(1, (end - time) / 0.5);
      return { show: true, opacity: Math.max(0.15, Math.min(fadeIn, fadeOut)) };
    }
    case "text":
    case "bomb":
      return time >= o.t ? { show: true, opacity: 1 } : { show: false, opacity: 0 };
    case "drawing":
    case "lineup":
      return { show: true, opacity: 1 };
  }
}

/** Length of the plan in seconds: when the last route ends or the last grenade fades. */
export function stratDuration(strat: Scene): number {
  let end = 0;
  for (const o of strat.objects) {
    if (o.kind === "route") end = Math.max(end, o.t + o.duration);
    if (o.kind === "utility") end = Math.max(end, o.t + Math.min(UTILITY_DURATION[o.type], 4));
    if (o.kind === "text" || o.kind === "bomb") end = Math.max(end, o.t);
  }
  return Math.ceil(end);
}

/** Moments worth marking on the timeline, sorted. */
export interface TimelineEvent {
  id: string;
  t: number;
  kind: BoardObject["kind"];
  label: string;
}

export function timelineEvents(strat: Scene): TimelineEvent[] {
  const players = new Map(
    strat.objects.filter((o): o is PlacedPlayer => o.kind === "player").map((p) => [p.id, p]),
  );
  return strat.objects
    .flatMap((o): TimelineEvent[] => {
      if (o.kind === "route") {
        const p = o.player ? players.get(o.player) : undefined;
        return [{ id: o.id, t: o.t, kind: o.kind, label: p ? `${p.team}${p.n} moves` : "Arrow" }];
      }
      if (o.kind === "utility") return [{ id: o.id, t: o.t, kind: o.kind, label: o.type }];
      if (o.kind === "text") return [{ id: o.id, t: o.t, kind: o.kind, label: o.text }];
      if (o.kind === "bomb") return [{ id: o.id, t: o.t, kind: o.kind, label: "Bomb planted" }];
      return [];
    })
    .sort((a, b) => a.t - b.t);
}

/** "+12s" style label. */
export function formatTime(t: number): string {
  return `${round1(t)}s`;
}
