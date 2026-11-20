"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BombGlyph, LineupGlyph, TEAM_COLOR, UTILITY_COLOR, UtilityGlyph, VisionCone, coneTip } from "@/components/glyphs";
import { MapLayer } from "@/components/map-layer";
import { MarkerGlyph } from "@/components/marker-icons";
import { loadSightMask, type SightMask } from "@/lib/strat/sight";
import { MAPS } from "@/lib/maps";
import { SPAWNS } from "@/lib/maps/spawns";
import { clamp, pathData, simplify } from "@/lib/strat/geometry";
import { enemyOf, newId, nextPlayerNumber, normAngle, removeObject } from "@/lib/strat/model";
import { nextRouteStart, playerEndPosition, playerPositionAt, visibilityAt, walkDuration } from "@/lib/strat/timeline";
import {
  CONE_LENGTH,
  DEFAULT_PEN,
  type BoardObject,
  type ConeWidth,
  type DrawingObject,
  type MarkerType,
  type UtilityType,
  UTILITY_RADIUS,
  type PenSettings,
  type VisionObject,
  type PlacedPlayer,
  type Pt,
  type RouteObject,
  type Scene,
  type Side,
} from "@/lib/strat/types";

export type Tool =
  | "select"
  | "mate"
  | "enemy"
  | "route"
  | "cone-wide"
  | "cone-normal"
  | "cone-narrow"
  | "pen"
  | "eraser"
  | "text"
  | "smoke"
  | "flash"
  | "molotov"
  | "he"
  | "decoy"
  | "marker"
  | "bomb"
  | "lineup";

export interface BoardProps {
  scene: Scene;
  /** Seconds into the step; null = editing, everything shown. */
  time: number | null;
  tool?: Tool;
  pen?: PenSettings;
  /** Which marker the marker tool places. */
  marker?: MarkerType;
  /** "Move to…": the next click on the board moves this object there (no dragging needed). */
  relocate?: string | null;
  onRelocated?: () => void;
  selectedId?: string | null;
  readOnly?: boolean;
  onSelect?: (id: string | null) => void;
  /** A finished change (one undo step). */
  onCommit?: (objects: BoardObject[]) => void;
  /** Marks an undo point before a gesture. */
  onCheckpoint?: () => void;
  /** A change during a gesture. */
  onLive?: (objects: BoardObject[]) => void;
  /** Something the person should know (e.g. all five players are already placed). */
  onNotice?: (message: string) => void;
  /** Show callout names on the map. */
  callouts?: boolean;
  /** Part of the 1000×1000 board to show, e.g. to crop in on one site. */
  viewBox?: string;
  /** A one-shot tool (the sight cones) has been used: go back to the select tool. */
  onToolDone?: () => void;
}

type Gesture =
  | { mode: "move"; id: string; start: Pt; orig: BoardObject; moved: boolean }
  | { mode: "draw"; points: Pt[]; player: string | null; team: Side | null }
  | { mode: "pen"; points: Pt[] }
  | { mode: "cone-new"; origin: Pt; cone: ConeWidth; end: Pt | null }
  | { mode: "cone-tip"; id: string; started: boolean }
  | { mode: "cone-origin"; id: string; started: boolean; tip: Pt }
  | { mode: "erase"; started: boolean }
  | { mode: "throw"; from: string; origin: Pt; type: UtilityType; end: Pt };

const UTILITY_TOOLS = new Set<string>(["smoke", "flash", "molotov", "he", "decoy"]);
const isUtility = (t: Tool): t is UtilityType => UTILITY_TOOLS.has(t);

const angleTo = (from: Pt, to: Pt) => ((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI + 360) % 360;

export function Board({
  scene,
  time,
  tool = "select",
  pen = DEFAULT_PEN,
  marker = "anchor",
  relocate = null,
  onRelocated,
  selectedId = null,
  readOnly = false,
  onSelect,
  onCommit,
  onCheckpoint,
  onLive,
  onNotice,
  callouts = false,
  viewBox = "0 0 1000 1000",
  onToolDone,
}: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [draft, setDraft] = useState<{ points: Pt[]; color: string } | null>(null);
  const [penDraft, setPenDraft] = useState<DrawingObject | null>(null);
  const [coneDraft, setConeDraft] = useState<{ origin: Pt; end: Pt; cone: ConeWidth } | null>(null);
  const [throwDraft, setThrowDraft] = useState<{ origin: Pt; end: Pt; type: UtilityType } | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  /** Keyboard cursor: where Enter places or selects. Shown while the board has keyboard focus. */
  const [kbd, setKbd] = useState<Pt | null>(null);
  const map = MAPS[scene.map];
  const objects = scene.objects;
  const [sight, setSight] = useState<{ url: string; mask: SightMask | null } | null>(null);
  useEffect(() => {
    const url = map.sight;
    if (!url) return;
    let live = true;
    loadSightMask(url).then((mask) => live && setSight({ url, mask }));
    return () => {
      live = false;
    };
  }, [map.sight]);
  const sightMask = sight && sight.url === map.sight ? sight.mask : null;
  const players = objects.filter((o): o is PlacedPlayer => o.kind === "player");
  const playerById = new Map(players.map((p) => [p.id, p]));

  /** Where a cone starts: its player's position (following their route during playback), or its own spot. */
  function coneOrigin(v: VisionObject): Pt {
    const pl = v.player ? playerById.get(v.player) : undefined;
    if (!pl) return { x: v.x, y: v.y };
    return time === null ? { x: pl.x, y: pl.y } : playerPositionAt(scene, pl, time);
  }

  /** The player standing on a point, if any: cones dropped there attach to them. */
  function playerAt(p: Pt): PlacedPlayer | null {
    let best: PlacedPlayer | null = null;
    let bestD = 28;
    for (const pl of players) {
      const d = Math.hypot(pl.x - p.x, pl.y - p.y);
      if (d < bestD) {
        best = pl;
        bestD = d;
      }
    }
    return best;
  }

  const tipOf = (v: VisionObject): Pt => coneTip({ ...v, ...coneOrigin(v) });

  function toBoard(e: { clientX: number; clientY: number }): Pt {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: clamp(p.x, 0, 1000), y: clamp(p.y, 0, 1000) };
  }

  function add(o: BoardObject) {
    onCommit?.([...objects, o]);
    onSelect?.(o.id);
  }

  function capture(e: ReactPointerEvent) {
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function erase(id: string) {
    const g = gesture.current;
    if (g?.mode !== "erase") return;
    if (!g.started) {
      g.started = true;
      onCheckpoint?.();
    }
    onLive?.(removeObject(objects, id));
    if (id === selectedId) onSelect?.(null);
  }

  function placePlayer(team: Side, p: Pt): boolean {
    const n = nextPlayerNumber(scene, team);
    if (n === null) {
      onNotice?.(team === scene.side ? "All five teammates are already on the board." : "All five enemies are already on the board.");
      return false;
    }
    add({ id: newId(), kind: "player", team, n, role: "", ...p });
    return true;
  }

  /** Moves the "Move to…" object so its anchor lands on `p`. */
  function relocateTo(p: Pt) {
    const o = objects.find((x) => x.id === relocate);
    if (o) {
      const a = anchorOf(o);
      onCommit?.(objects.map((x) => moved(x, o, p.x - a.x, p.y - a.y)));
      onSelect?.(o.id);
    }
    onRelocated?.();
  }

  function onBackgroundDown(e: ReactPointerEvent) {
    if (readOnly || e.button !== 0) return;
    const p = toBoard(e);
    if (relocate) return relocateTo(p);
    switch (tool) {
      case "select":
        onSelect?.(null);
        return;
      case "route":
        capture(e);
        gesture.current = { mode: "draw", points: [p], player: null, team: null };
        setDraft({ points: [p], color: "var(--ink)" });
        return;
      case "pen":
        capture(e);
        gesture.current = { mode: "pen", points: [p] };
        setPenDraft({ id: "draft", kind: "drawing", shape: pen.shape, points: [p, p], color: pen.color, opacity: pen.opacity, width: pen.width });
        return;
      case "eraser":
        gesture.current = { mode: "erase", started: false };
        return;
      case "cone-wide":
      case "cone-normal":
      case "cone-narrow": {
        capture(e);
        const cone = tool.slice(5) as ConeWidth;
        gesture.current = { mode: "cone-new", origin: p, cone, end: null };
        setConeDraft({ origin: p, end: { x: p.x, y: p.y - CONE_LENGTH.default }, cone });
        return;
      }
      default:
        placeAt(p);
    }
  }

  /**
   * Tools that drop something on one spot: players, grenades, notes, bomb, lineups.
   * Each places once, then it's back to the cursor, so nothing gets placed by mistake.
   */
  function placeAt(p: Pt) {
    if (dropAt(p)) onToolDone?.();
  }

  function dropAt(p: Pt): boolean {
    switch (tool) {
      case "mate":
        return placePlayer(scene.side, p);
      case "enemy":
        return placePlayer(enemyOf(scene.side), p);
      case "text":
        add({ id: newId(), kind: "text", text: "Note", t: time ?? 0, ...p });
        return true;
      case "bomb": {
        const existing = objects.find((o) => o.kind === "bomb");
        if (existing) {
          onCommit?.(objects.map((o) => (o.id === existing.id ? { ...o, ...p } : o)));
          onSelect?.(existing.id);
          return true;
        }
        add({ id: newId(), kind: "bomb", t: time ?? 0, ...p });
        return true;
      }
      case "lineup":
        add({ id: newId(), kind: "lineup", title: "", url: "", ...p });
        return true;
      case "marker":
        add({ id: newId(), kind: "marker", icon: marker, ...p });
        return true;
      case "select":
      case "route":
      case "pen":
      case "eraser":
      case "cone-wide":
      case "cone-normal":
      case "cone-narrow":
        return false;
      default:
        add({ id: newId(), kind: "utility", type: tool, t: time ?? 0, ...p });
        return true;
    }
  }

  function onObjectDown(e: ReactPointerEvent, o: BoardObject) {
    if (readOnly || e.button !== 0) return;
    if (relocate) {
      e.stopPropagation();
      return relocateTo(toBoard(e));
    }
    if (tool === "eraser") {
      e.stopPropagation();
      gesture.current = { mode: "erase", started: false };
      erase(o.id);
      return;
    }
    if (tool === "route" && o.kind === "player") {
      e.stopPropagation();
      capture(e);
      const from = playerEndPosition(scene, o);
      gesture.current = { mode: "draw", points: [from], player: o.id, team: o.team };
      setDraft({ points: [from], color: TEAM_COLOR[o.team] });
      return;
    }
    if (isUtility(tool) && o.kind === "player") {
      // Drag from a player to where the grenade lands: that player throws it.
      e.stopPropagation();
      capture(e);
      const origin = time === null ? { x: o.x, y: o.y } : playerPositionAt(scene, o, time);
      gesture.current = { mode: "throw", from: o.id, origin, type: tool, end: origin };
      setThrowDraft({ origin, end: origin, type: tool });
      return;
    }
    if (tool.startsWith("cone-")) {
      onBackgroundDown(e); // a cone can start on top of a player
      e.stopPropagation();
      return;
    }
    if (tool !== "select") return; // placement tools place on top of objects
    e.stopPropagation();
    onSelect?.(o.id);
    // Routes that belong to a player move with the player, not on their own.
    if (o.kind === "route" && o.player) return;
    capture(e);
    gesture.current = { mode: "move", id: o.id, start: toBoard(e), orig: o, moved: false };
  }

  function onObjectEnter(e: ReactPointerEvent, o: BoardObject) {
    if (gesture.current?.mode === "erase" && e.buttons & 1) erase(o.id);
  }

  function onMove(e: ReactPointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const p = toBoard(e);
    if (g.mode === "draw") {
      const last = g.points[g.points.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 3) return;
      g.points.push(p);
      setDraft((d) => (d ? { ...d, points: [...g.points] } : d));
      return;
    }
    if (g.mode === "throw") {
      g.end = p;
      setThrowDraft({ origin: g.origin, end: p, type: g.type });
      return;
    }
    if (g.mode === "pen") {
      if (pen.shape === "free") {
        const last = g.points[g.points.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) < 2.5) return;
        g.points.push(p);
      } else {
        g.points = [g.points[0], p];
      }
      setPenDraft((d) => (d ? { ...d, points: [...g.points] } : d));
      return;
    }
    if (g.mode === "cone-new") {
      if (Math.hypot(p.x - g.origin.x, p.y - g.origin.y) < 8) return;
      g.end = p;
      setConeDraft({ origin: g.origin, end: p, cone: g.cone });
      return;
    }
    if (g.mode === "cone-tip") {
      const v = objects.find((o) => o.id === g.id);
      if (!v || v.kind !== "vision") return;
      if (!g.started) {
        g.started = true;
        onCheckpoint?.();
      }
      const o0 = coneOrigin(v);
      const length = clamp(Math.hypot(p.x - o0.x, p.y - o0.y), CONE_LENGTH.min, CONE_LENGTH.max);
      const angle = normAngle(angleTo(o0, p));
      onLive?.(objects.map((o) => (o.id === g.id ? { ...v, angle, length: Math.round(length) } : o)));
      return;
    }
    if (g.mode === "cone-origin") {
      // The dot moves; the tip stays where it is, so the cone turns to keep looking at it.
      const v = objects.find((o) => o.id === g.id);
      if (!v || v.kind !== "vision") return;
      if (!g.started) {
        g.started = true;
        onCheckpoint?.();
      }
      const length = clamp(Math.hypot(g.tip.x - p.x, g.tip.y - p.y), CONE_LENGTH.min, CONE_LENGTH.max);
      const angle = normAngle(angleTo(p, g.tip));
      onLive?.(objects.map((o) => (o.id === g.id ? { ...v, player: null, x: p.x, y: p.y, angle, length: Math.round(length) } : o)));
      return;
    }
    if (g.mode !== "move") return;
    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < 2) return;
      g.moved = true;
      onCheckpoint?.();
    }
    onLive?.(objects.map((o) => moved(o, g.orig, dx, dy)));
  }

  function onUp() {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.mode === "throw") {
      setThrowDraft(null);
      const far = Math.hypot(g.end.x - g.origin.x, g.end.y - g.origin.y) >= 20;
      // A plain click on a player drops the grenade there, with no thrower.
      add({ id: newId(), kind: "utility", type: g.type, t: time ?? 0, from: far ? g.from : null, ...(far ? g.end : g.origin) });
      onToolDone?.();
      return;
    }
    if (g.mode === "pen") {
      setPenDraft(null);
      const points = pen.shape === "free" ? simplify(g.points, 1.2) : g.points;
      const long = points.length >= 2 && Math.hypot(points[0].x - points.at(-1)!.x, points[0].y - points.at(-1)!.y) >= 6;
      // Strokes aren't selected after drawing, so the next stroke can follow straight away.
      if (long) onCommit?.([...objects, { id: newId(), kind: "drawing", shape: pen.shape, points, color: pen.color, opacity: pen.opacity, width: pen.width }]);
      return;
    }
    if (g.mode === "cone-new") {
      setConeDraft(null);
      // Started on a player: the cone belongs to them and starts exactly where they stand.
      const owner = playerAt(g.origin);
      const origin = owner ? { x: owner.x, y: owner.y } : g.origin;
      // A click without dragging places a cone pointing up at the default length.
      const end = g.end ?? { x: origin.x, y: origin.y - CONE_LENGTH.default };
      const length = clamp(Math.hypot(end.x - origin.x, end.y - origin.y), CONE_LENGTH.min, CONE_LENGTH.max);
      add({ id: newId(), kind: "vision", player: owner?.id ?? null, ...origin, angle: normAngle(angleTo(origin, end)), length: Math.round(length), cone: g.cone });
      onToolDone?.(); // place once, then back to the cursor
      return;
    }
    if (g.mode === "cone-tip") {
      setActiveTip(null);
      return;
    }
    if (g.mode === "cone-origin") {
      // Dropped on a player: attach to them (the dot hides under the player, like ValoPlant).
      const v = objects.find((o) => o.id === g.id);
      if (!v || v.kind !== "vision" || !g.started) return;
      const owner = playerAt({ x: v.x, y: v.y });
      if (owner) {
        const length = clamp(Math.hypot(g.tip.x - owner.x, g.tip.y - owner.y), CONE_LENGTH.min, CONE_LENGTH.max);
        onLive?.(
          objects.map((o) =>
            o.id === g.id ? { ...v, player: owner.id, x: owner.x, y: owner.y, angle: normAngle(angleTo(owner, g.tip)), length: Math.round(length) } : o,
          ),
        );
      }
      return;
    }
    if (g.mode === "move") {
      // A player dropped next to a real spawn spot snaps onto it, for exact lineups from spawn.
      const spots = g.moved && g.orig.kind === "player" ? SPAWNS[scene.map]?.[g.orig.team] : undefined;
      const now = spots && objects.find((o) => o.id === g.id);
      if (spots && now && now.kind === "player" && g.orig.kind === "player") {
        const near = spots.find((s) => Math.hypot(s.x - now.x, s.y - now.y) < 12);
        if (near) onLive?.(objects.map((o) => moved(o, g.orig, near.x - (g.orig as PlacedPlayer).x, near.y - (g.orig as PlacedPlayer).y)));
      }
      return;
    }
    if (g.mode !== "draw") return;
    setDraft(null);
    const points = simplify(g.points, 3);
    if (points.length < 2 || Math.hypot(points[0].x - points.at(-1)!.x, points[0].y - points.at(-1)!.y) < 12) return;
    const route: RouteObject = {
      id: newId(),
      kind: "route",
      player: g.player,
      points,
      t: g.player ? nextRouteStart(scene, g.player) : (time ?? 0),
      duration: walkDuration(points),
    };
    add(route);
    onToolDone?.(); // one route, then back to the cursor
  }

  /** Moving a player also moves the start of their first route, so the path stays attached. */
  function moved(o: BoardObject, orig: BoardObject, dx: number, dy: number): BoardObject {
    const shift = (p: Pt): Pt => ({ x: clamp(p.x + dx, 0, 1000), y: clamp(p.y + dy, 0, 1000) });
    if (orig.kind === "player") {
      const np = shift(orig);
      if (o.id === orig.id) return { ...orig, ...np };
      if (o.kind === "route" && o.player === orig.id) {
        const first = objects
          .filter((r): r is RouteObject => r.kind === "route" && r.player === orig.id)
          .sort((a, b) => a.t - b.t)[0];
        if (first?.id === o.id) return { ...o, points: [np, ...o.points.slice(1)] };
      }
      return o;
    }
    if (o.id !== orig.id) return o;
    if (orig.kind === "route" || orig.kind === "drawing") return { ...orig, points: orig.points.map(shift) };
    if (orig.kind === "vision") return { ...orig, player: null, ...shift(coneOrigin(orig)) };
    return { ...orig, ...shift(orig) };
  }

  const cursor = readOnly ? "default" : tool === "select" ? "default" : tool === "eraser" ? "cell" : "crosshair";
  const interactive = { cursor: readOnly ? "default" : tool === "select" ? "move" : tool === "eraser" ? "cell" : undefined };
  function onConeTipDown(e: ReactPointerEvent, id: string) {
    if (readOnly || e.button !== 0) return;
    e.stopPropagation();
    capture(e);
    onSelect?.(id);
    setActiveTip(id);
    gesture.current = { mode: "cone-tip", id, started: false };
  }

  function onConeOriginDown(e: ReactPointerEvent, v: VisionObject) {
    if (readOnly || e.button !== 0) return;
    e.stopPropagation();
    capture(e);
    onSelect?.(v.id);
    gesture.current = { mode: "cone-origin", id: v.id, started: false, tip: tipOf(v) };
  }

  /** A spot to pick an object by: its position, a cone's origin, or the middle of a line. */
  function anchorOf(o: BoardObject): Pt {
    if (o.kind === "vision") return coneOrigin(o);
    if (o.kind === "route" || o.kind === "drawing") return o.points[Math.floor(o.points.length / 2)];
    return { x: o.x, y: o.y };
  }

  function nearestTo(p: Pt, max = 40): BoardObject | null {
    let best: BoardObject | null = null;
    let bestD = max;
    for (const o of objects) {
      if (o.kind === "route" && o.player) continue; // picked through its player
      const a = anchorOf(o);
      const d = Math.hypot(a.x - p.x, a.y - p.y) - (o.kind === "player" ? 6 : 0);
      if (d < bestD) {
        best = o;
        bestD = d;
      }
    }
    return best;
  }

  /**
   * Keyboard use of the board: arrows move the cursor (or the selected item in Select),
   * Enter places with the current tool or selects what is under the cursor.
   */
  function onKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    if (readOnly) return;
    const step = e.shiftKey ? 50 : 10;
    const dirs: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const here = kbd ?? { x: 500, y: 500 };
    const dir = dirs[e.key];
    if (dir) {
      e.preventDefault();
      const sel = tool === "select" && selectedId ? objects.find((o) => o.id === selectedId) : undefined;
      if (sel && !(sel.kind === "route" && sel.player)) {
        onCommit?.(objects.map((o) => moved(o, sel, dir[0], dir[1])));
        const a = anchorOf(sel);
        setKbd({ x: clamp(a.x + dir[0], 0, 1000), y: clamp(a.y + dir[1], 0, 1000) });
        return;
      }
      setKbd({ x: clamp(here.x + dir[0], 0, 1000), y: clamp(here.y + dir[1], 0, 1000) });
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    const under = nearestTo(here);
    switch (tool) {
      case "select":
        onSelect?.(under?.id ?? null);
        if (!under) onNotice?.("Nothing under the cursor. Move it with the arrow keys.");
        return;
      case "eraser":
        if (under) {
          onCommit?.(removeObject(objects, under.id));
          if (under.id === selectedId) onSelect?.(null);
        }
        return;
      case "route":
      case "pen":
        onNotice?.("Routes and drawings need a mouse, pen or touch.");
        return;
      case "cone-wide":
      case "cone-normal":
      case "cone-narrow": {
        const owner = playerAt(here);
        const origin = owner ? { x: owner.x, y: owner.y } : here;
        add({ id: newId(), kind: "vision", player: owner?.id ?? null, ...origin, angle: -90, length: CONE_LENGTH.default, cone: tool.slice(5) as ConeWidth });
        onToolDone?.();
        return;
      }
      default:
        placeAt(here);
    }
  }

  const handlers = (o: BoardObject) => ({
    onPointerDown: (e: ReactPointerEvent) => onObjectDown(e, o),
    onPointerEnter: (e: ReactPointerEvent) => onObjectEnter(e, o),
  });

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className="block h-full w-full touch-none select-none"
      style={{ cursor }}
      onPointerDown={onBackgroundDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role={readOnly ? "img" : "application"}
      aria-label={`${map.name} board`}
      aria-describedby={readOnly ? undefined : "board-keys"}
      tabIndex={readOnly ? undefined : 0}
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        if (e.currentTarget.matches(":focus-visible")) setKbd((k) => k ?? { x: 500, y: 500 });
      }}
      onBlur={() => setKbd(null)}
    >
      <defs>
        {(["T", "CT", "none"] as const).map((k) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={k === "none" ? "var(--ink)" : TEAM_COLOR[k]} />
          </marker>
        ))}
      </defs>

      <MapLayer map={map} callouts={callouts} />

      {/* pen drawings sit right on the map */}
      {objects.map((o) =>
        o.kind === "drawing" ? (
          <g key={o.id} {...handlers(o)} style={interactive}>
            <Drawing d={o} selected={o.id === selectedId} />
          </g>
        ) : null,
      )}
      {penDraft && <Drawing d={penDraft} selected={false} />}

      {/* routes */}
      {objects.map((r) => {
        if (r.kind !== "route") return null;
        const vis = visibilityAt(r, time);
        const team = r.player ? playerById.get(r.player)?.team : undefined;
        const color = team ? TEAM_COLOR[team] : "var(--ink)";
        return (
          <g key={r.id} opacity={vis.opacity} {...handlers(r)} style={{ cursor: readOnly ? "default" : tool === "eraser" ? "cell" : "pointer" }}>
            <path d={pathData(r.points)} stroke="transparent" strokeWidth="18" fill="none" />
            {r.id === selectedId && (
              <path d={pathData(r.points)} stroke="var(--select)" strokeWidth="9" fill="none" opacity="0.35" strokeLinecap="round" strokeLinejoin="round" />
            )}
            <path
              d={pathData(r.points)}
              stroke={color}
              strokeWidth="4"
              fill="none"
              strokeDasharray={r.player ? "none" : "10 8"}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={`url(#arrow-${team ?? "none"})`}
            />
          </g>
        );
      })}

      {draft && (
        <path d={pathData(draft.points)} stroke={draft.color} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      )}

      {/* utility */}
      {objects.map((u) => {
        if (u.kind !== "utility") return null;
        const vis = visibilityAt(u, time);
        if (!vis.show) return null;
        const by = u.from ? playerById.get(u.from) : undefined;
        const thrower = by ? (time === null ? { x: by.x, y: by.y } : playerPositionAt(scene, by, u.t)) : null;
        return (
          <g key={u.id} opacity={vis.opacity} {...handlers(u)} style={interactive}>
            {thrower && (
              <g pointerEvents="none">
                <line x1={thrower.x} y1={thrower.y} x2={u.x} y2={u.y} stroke={UTILITY_COLOR[u.type]} strokeOpacity="0.8" strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" />
                <circle cx={thrower.x} cy={thrower.y} r="4" fill={UTILITY_COLOR[u.type]} />
              </g>
            )}
            <UtilityGlyph u={u} selected={u.id === selectedId} />
          </g>
        );
      })}

      {/* sight cones under the players */}
      {objects.map((v) => {
        if (v.kind !== "vision") return null;
        const o = coneOrigin(v);
        const shown = { ...v, ...o };
        const tip = coneTip(shown);
        const handles = !readOnly && tool === "select";
        return (
          <g key={v.id}>
            <g {...handlers(v)} style={interactive}>
              <VisionCone v={shown} selected={v.id === selectedId} sight={sightMask} />
            </g>
            {/* origin dot: hidden under the player when the cone belongs to one */}
            {!v.player && (
              <g
                className="cone-handle"
                onPointerDown={handles ? (e) => onConeOriginDown(e, v) : undefined}
                style={{ cursor: handles ? "grab" : undefined }}
              >
                {handles && <circle cx={o.x} cy={o.y} r="16" fill="transparent" />}
                <circle className="cone-dot" cx={o.x} cy={o.y} r="7" fill="var(--chalk)" stroke="var(--void)" strokeWidth="2" />
                <title>Drag to move where the cone starts. Drop it on a player to attach it.</title>
              </g>
            )}
            {handles && (
              <g className="cone-handle" onPointerDown={(e) => onConeTipDown(e, v.id)} style={{ cursor: "grab" }}>
                <circle cx={tip.x} cy={tip.y} r="16" fill="transparent" />
                <path
                  className="cone-diamond"
                  data-active={activeTip === v.id}
                  d={`M${tip.x} ${tip.y - 9}L${tip.x + 9} ${tip.y}L${tip.x} ${tip.y + 9}L${tip.x - 9} ${tip.y}Z`}
                  fill="var(--chalk)"
                  fillOpacity="0.12"
                  stroke="var(--chalk)"
                  strokeOpacity="0.85"
                  strokeWidth="2"
                />
                <title>Drag to aim the cone and change how far they see</title>
              </g>
            )}
          </g>
        );
      })}
      {throwDraft && (
        <g pointerEvents="none">
          <line
            x1={throwDraft.origin.x}
            y1={throwDraft.origin.y}
            x2={throwDraft.end.x}
            y2={throwDraft.end.y}
            stroke={UTILITY_COLOR[throwDraft.type]}
            strokeWidth="3"
            strokeDasharray="2 8"
            strokeLinecap="round"
          />
          <circle cx={throwDraft.end.x} cy={throwDraft.end.y} r={UTILITY_RADIUS[throwDraft.type]} fill={UTILITY_COLOR[throwDraft.type]} fillOpacity="0.25" />
        </g>
      )}
      {coneDraft && (
        <VisionCone
          v={{
            id: "draft",
            kind: "vision",
            player: null,
            ...coneDraft.origin,
            angle: angleTo(coneDraft.origin, coneDraft.end),
            length: clamp(Math.hypot(coneDraft.end.x - coneDraft.origin.x, coneDraft.end.y - coneDraft.origin.y), CONE_LENGTH.min, CONE_LENGTH.max),
            cone: coneDraft.cone,
          }}
          selected={false}
          sight={sightMask}
        />
      )}

      {/* lineup pins */}
      {objects.map((l) => {
        if (l.kind !== "lineup") return null;
        const pin = <LineupGlyph l={l} selected={l.id === selectedId} />;
        // On read-only boards a pin with a link opens it.
        return readOnly && l.url ? (
          <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" aria-label={`Open lineup${l.title ? `: ${l.title}` : ""}`}>
            {pin}
          </a>
        ) : (
          <g key={l.id} {...handlers(l)} style={interactive}>
            {pin}
          </g>
        );
      })}

      {/* notes */}
      {objects.map((o) => {
        if (o.kind !== "text") return null;
        if (!visibilityAt(o, time).show) return null;
        const w = Math.min(420, 22 + o.text.length * 8.2);
        return (
          <g key={o.id} {...handlers(o)} style={interactive}>
            <rect
              x={o.x - w / 2}
              y={o.y - 17}
              width={w}
              height="34"
              rx="8"
              fill="var(--note-bg)"
              stroke={o.id === selectedId ? "var(--select)" : "var(--note-border)"}
              strokeWidth={o.id === selectedId ? 3 : 1.5}
            />
            <text x={o.x} y={o.y + 6} textAnchor="middle" fontSize="17" fontWeight="600" fill="var(--ink)" style={{ fontFamily: "var(--font-condensed)" }}>
              {o.text}
            </text>
          </g>
        );
      })}

      {/* role and call markers */}
      {objects.map((m) =>
        m.kind === "marker" ? (
          <g key={m.id} {...handlers(m)} style={interactive}>
            <MarkerGlyph m={m} selected={m.id === selectedId} />
          </g>
        ) : null,
      )}

      {/* players on top; enemies are squares */}
      {players.map((p) => {
        const pos = time === null ? p : playerPositionAt(scene, p, time);
        const selected = p.id === selectedId;
        const enemy = p.team !== scene.side;
        return (
          <g
            key={p.id}
            transform={`translate(${pos.x} ${pos.y})`}
            {...handlers(p)}
            style={{ cursor: readOnly ? "default" : tool === "route" || tool.startsWith("cone-") ? "crosshair" : tool === "eraser" ? "cell" : "move" }}
          >
            {enemy ? (
              <>
                {selected && <rect x="-25" y="-25" width="50" height="50" rx="10" fill="none" stroke="var(--select)" strokeWidth="4" />}
                <rect x="-17" y="-14" width="34" height="34" rx="6" fill="var(--shadow)" opacity="0.6" />
                <rect x="-17" y="-17" width="34" height="34" rx="6" fill={TEAM_COLOR[p.team]} stroke="var(--token-ring)" strokeWidth="3" />
              </>
            ) : (
              <>
                {selected && <circle r="25" fill="none" stroke="var(--select)" strokeWidth="4" />}
                <circle r="19" cy="3" fill="var(--shadow)" opacity="0.6" />
                <circle r="18" fill={TEAM_COLOR[p.team]} stroke="var(--token-ring)" strokeWidth="3" />
              </>
            )}
            <text y="7" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--token-ink)" style={{ fontFamily: "var(--font-condensed)" }}>
              {p.n}
            </text>
            {p.role && (
              <text
                pointerEvents="none"
                y="40"
                textAnchor="middle"
                fontSize="16"
                fontWeight="600"
                fill="var(--ink)"
                stroke="var(--wall)"
                strokeWidth="5"
                paintOrder="stroke"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {p.role}
              </text>
            )}
          </g>
        );
      })}
      {/* bomb last, so it never hides under players on a crowded site */}
      {objects.map((b) => {
        if (b.kind !== "bomb" || !visibilityAt(b, time).show) return null;
        return (
          <g key={b.id} {...handlers(b)} style={interactive}>
            <BombGlyph b={b} selected={b.id === selectedId} />
          </g>
        );
      })}

      {kbd && !readOnly && (
        <g pointerEvents="none" aria-hidden="true">
          <circle cx={kbd.x} cy={kbd.y} r="14" fill="none" stroke="var(--void)" strokeWidth="5" />
          <circle cx={kbd.x} cy={kbd.y} r="14" fill="none" stroke="var(--brand)" strokeWidth="2.5" />
          <path d={`M${kbd.x - 22} ${kbd.y}h12M${kbd.x + 10} ${kbd.y}h12M${kbd.x} ${kbd.y - 22}v12M${kbd.x} ${kbd.y + 10}v12`} stroke="var(--brand)" strokeWidth="2.5" />
        </g>
      )}
    </svg>
  );
}

/** One pen stroke: freehand, a straight line, an arrow, a rectangle, dashed or not. */
function Drawing({ d, selected }: { d: DrawingObject; selected: boolean }) {
  const [a, b] = [d.points[0], d.points[d.points.length - 1]];
  const dashed = d.shape === "dashed" || d.shape === "dashed-arrow";
  const arrow = d.shape === "arrow" || d.shape === "dashed-arrow";
  const common = {
    stroke: d.color,
    strokeOpacity: d.opacity,
    strokeWidth: d.width,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: dashed ? `${d.width * 2.4} ${d.width * 2}` : undefined,
  };
  let shape: React.ReactNode;
  let hit: React.ReactNode;
  if (d.shape === "free") {
    shape = <path d={pathData(d.points)} {...common} />;
    hit = <path d={pathData(d.points)} stroke="transparent" strokeWidth={Math.max(16, d.width + 10)} fill="none" />;
  } else if (d.shape === "rect") {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(a.x - b.x);
    const h = Math.abs(a.y - b.y);
    shape = <rect x={x} y={y} width={w} height={h} rx="3" {...common} />;
    hit = <rect x={x} y={y} width={w} height={h} stroke="transparent" strokeWidth={Math.max(16, d.width + 10)} fill="none" />;
  } else {
    // Stop the line short of the tip so the arrowhead stays sharp.
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const head = arrow ? Math.min(len * 0.6, 10 + d.width * 2.6) : 0;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const end = { x: b.x - ux * head * 0.7, y: b.y - uy * head * 0.7 };
    shape = (
      <>
        <line x1={a.x} y1={a.y} x2={end.x} y2={end.y} {...common} />
        {arrow && (
          <polygon
            points={`${b.x},${b.y} ${b.x - ux * head - uy * head * 0.55},${b.y - uy * head + ux * head * 0.55} ${b.x - ux * head + uy * head * 0.55},${b.y - uy * head - ux * head * 0.55}`}
            fill={d.color}
            fillOpacity={d.opacity}
          />
        )}
      </>
    );
    hit = <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={Math.max(16, d.width + 10)} />;
  }
  return (
    <>
      {hit}
      {selected && (
        <g opacity="0.35">
          {d.shape === "free" ? (
            <path d={pathData(d.points)} stroke="var(--select)" strokeWidth={d.width + 8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : d.shape === "rect" ? (
            <rect
              x={Math.min(a.x, b.x)}
              y={Math.min(a.y, b.y)}
              width={Math.abs(a.x - b.x)}
              height={Math.abs(a.y - b.y)}
              stroke="var(--select)"
              strokeWidth={d.width + 8}
              fill="none"
            />
          ) : (
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--select)" strokeWidth={d.width + 8} strokeLinecap="round" />
          )}
        </g>
      )}
      {shape}
    </>
  );
}
