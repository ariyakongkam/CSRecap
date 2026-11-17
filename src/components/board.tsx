"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BombGlyph, LineupGlyph, TEAM_COLOR, UtilityGlyph, VisionCone, coneTip } from "@/components/glyphs";
import { MapLayer } from "@/components/map-layer";
import { MAPS } from "@/lib/maps";
import { clamp, pathData, simplify } from "@/lib/strat/geometry";
import { enemyOf, newId, nextPlayerNumber, normAngle, removeObject } from "@/lib/strat/model";
import { formatTime, nextRouteStart, playerEndPosition, playerPositionAt, visibilityAt, walkDuration } from "@/lib/strat/timeline";
import {
  CONE_LENGTH,
  DEFAULT_PEN,
  UTILITY_RADIUS,
  type BoardObject,
  type ConeWidth,
  type DrawingObject,
  type PenSettings,
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
  | "bomb"
  | "lineup";

export interface BoardProps {
  scene: Scene;
  /** Seconds into the step; null = editing, everything shown. */
  time: number | null;
  tool?: Tool;
  pen?: PenSettings;
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
}

type Gesture =
  | { mode: "move"; id: string; start: Pt; orig: BoardObject; moved: boolean }
  | { mode: "draw"; points: Pt[]; player: string | null; team: Side | null }
  | { mode: "pen"; points: Pt[] }
  | { mode: "cone-new"; origin: Pt; cone: ConeWidth; end: Pt | null }
  | { mode: "cone-tip"; id: string; started: boolean }
  | { mode: "erase"; started: boolean };

const angleTo = (from: Pt, to: Pt) => ((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI + 360) % 360;

export function Board({
  scene,
  time,
  tool = "select",
  pen = DEFAULT_PEN,
  selectedId = null,
  readOnly = false,
  onSelect,
  onCommit,
  onCheckpoint,
  onLive,
  onNotice,
  callouts = false,
  viewBox = "0 0 1000 1000",
}: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [draft, setDraft] = useState<{ points: Pt[]; color: string } | null>(null);
  const [penDraft, setPenDraft] = useState<DrawingObject | null>(null);
  const [coneDraft, setConeDraft] = useState<{ origin: Pt; end: Pt; cone: ConeWidth } | null>(null);
  const map = MAPS[scene.map];
  const objects = scene.objects;
  const players = objects.filter((o): o is PlacedPlayer => o.kind === "player");
  const playerById = new Map(players.map((p) => [p.id, p]));

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

  function placePlayer(team: Side, p: Pt) {
    const n = nextPlayerNumber(scene, team);
    if (n === null) {
      onNotice?.(team === scene.side ? "All five teammates are already on the board." : "All five enemies are already on the board.");
      return;
    }
    add({ id: newId(), kind: "player", team, n, role: "", ...p });
  }

  function onBackgroundDown(e: ReactPointerEvent) {
    if (readOnly || e.button !== 0) return;
    const p = toBoard(e);
    switch (tool) {
      case "select":
        onSelect?.(null);
        return;
      case "mate":
        placePlayer(scene.side, p);
        return;
      case "enemy":
        placePlayer(enemyOf(scene.side), p);
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
      case "text":
        add({ id: newId(), kind: "text", text: "Note", t: time ?? 0, ...p });
        return;
      case "bomb": {
        const existing = objects.find((o) => o.kind === "bomb");
        if (existing) {
          onCommit?.(objects.map((o) => (o.id === existing.id ? { ...o, ...p } : o)));
          onSelect?.(existing.id);
          return;
        }
        add({ id: newId(), kind: "bomb", t: time ?? 0, ...p });
        return;
      }
      case "lineup":
        add({ id: newId(), kind: "lineup", title: "", url: "", ...p });
        return;
      default:
        add({ id: newId(), kind: "utility", type: tool, t: time ?? 0, ...p });
    }
  }

  function onObjectDown(e: ReactPointerEvent, o: BoardObject) {
    if (readOnly || e.button !== 0) return;
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
      const length = clamp(Math.hypot(p.x - v.x, p.y - v.y), CONE_LENGTH.min, CONE_LENGTH.max);
      const angle = normAngle(angleTo(v, p));
      onLive?.(objects.map((o) => (o.id === g.id ? { ...v, angle, length: Math.round(length) } : o)));
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
      // A click without dragging places a cone pointing up at the default length.
      const end = g.end ?? { x: g.origin.x, y: g.origin.y - CONE_LENGTH.default };
      const length = clamp(Math.hypot(end.x - g.origin.x, end.y - g.origin.y), CONE_LENGTH.min, CONE_LENGTH.max);
      add({ id: newId(), kind: "vision", ...g.origin, angle: normAngle(angleTo(g.origin, end)), length: Math.round(length), cone: g.cone });
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
    return { ...orig, ...shift(orig) };
  }

  const cursor = readOnly ? "default" : tool === "select" ? "default" : tool === "eraser" ? "cell" : "crosshair";
  const interactive = { cursor: readOnly ? "default" : tool === "select" ? "move" : tool === "eraser" ? "cell" : undefined };
  function onConeTipDown(e: ReactPointerEvent, id: string) {
    if (readOnly || e.button !== 0) return;
    e.stopPropagation();
    capture(e);
    gesture.current = { mode: "cone-tip", id, started: false };
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
      role="img"
      aria-label={`${map.name} board`}
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
        const mid = r.points[Math.floor(r.points.length / 2)];
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
            {time === null && r.player && <TimeTag x={mid.x} y={mid.y} label={formatTime(r.t)} />}
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
        return (
          <g key={u.id} opacity={vis.opacity} {...handlers(u)} style={interactive}>
            <UtilityGlyph u={u} selected={u.id === selectedId} />
            {time === null && <TimeTag x={u.x} y={u.y + UTILITY_RADIUS[u.type] + 16} label={formatTime(u.t)} />}
          </g>
        );
      })}

      {/* sight cones under the players */}
      {objects.map((v) => {
        if (v.kind !== "vision") return null;
        const selected = v.id === selectedId;
        return (
          <g key={v.id} {...handlers(v)} style={interactive}>
            <VisionCone v={v} selected={selected} />
            {selected && !readOnly && (
              <circle
                cx={coneTip(v).x}
                cy={coneTip(v).y}
                r="16"
                fill="transparent"
                onPointerDown={(e) => onConeTipDown(e, v.id)}
                style={{ cursor: "grab" }}
              >
                <title>Drag to aim and to change how far they see</title>
              </circle>
            )}
          </g>
        );
      })}
      {coneDraft && (
        <VisionCone
          v={{
            id: "draft",
            kind: "vision",
            ...coneDraft.origin,
            angle: angleTo(coneDraft.origin, coneDraft.end),
            length: clamp(Math.hypot(coneDraft.end.x - coneDraft.origin.x, coneDraft.end.y - coneDraft.origin.y), CONE_LENGTH.min, CONE_LENGTH.max),
            cone: coneDraft.cone,
          }}
          selected={false}
        />
      )}

      {/* bomb */}
      {objects.map((b) => {
        if (b.kind !== "bomb" || !visibilityAt(b, time).show) return null;
        return (
          <g key={b.id} {...handlers(b)} style={interactive}>
            <BombGlyph b={b} selected={b.id === selectedId} />
          </g>
        );
      })}

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
    </svg>
  );
}

function TimeTag({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect x="-21" y="-11" width="42" height="21" rx="10.5" fill="var(--wall)" opacity="0.9" />
      <text y="5" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--muted-ink)" style={{ fontFamily: "var(--font-condensed)" }}>
        {label}
      </text>
    </g>
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
