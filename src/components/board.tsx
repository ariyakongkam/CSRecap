"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { MAPS, type MapDef } from "@/lib/maps";
import { clamp, pathData, simplify } from "@/lib/strat/geometry";
import { newId, nextPlayerNumber } from "@/lib/strat/model";
import { nextRouteStart, playerEndPosition, playerPositionAt, visibilityAt, walkDuration, formatTime } from "@/lib/strat/timeline";
import {
  UTILITY_RADIUS,
  type BoardObject,
  type PlacedPlayer,
  type Pt,
  type RouteObject,
  type Side,
  type Strat,
  type UtilityObject,
} from "@/lib/strat/types";

export type Tool = "select" | "T" | "CT" | "route" | "smoke" | "flash" | "molotov" | "he" | "text";

export interface BoardProps {
  strat: Strat;
  /** Seconds into the round; null = editing, everything shown. */
  time: number | null;
  tool?: Tool;
  selectedId?: string | null;
  readOnly?: boolean;
  onSelect?: (id: string | null) => void;
  /** A finished change (one undo step). */
  onCommit?: (next: Strat) => void;
  /** Marks an undo point before a gesture. */
  onCheckpoint?: () => void;
  /** A change during a gesture. */
  onLive?: (next: Strat) => void;
  /** Called when a placement tool has nothing left to place (e.g. all five players are down). */
  onNotice?: (message: string) => void;
}

type Gesture =
  | { mode: "move"; id: string; start: Pt; orig: BoardObject; moved: boolean }
  | { mode: "draw"; points: Pt[]; player: string | null; team: Side | null };

const TEAM_COLOR: Record<Side, string> = { T: "var(--t)", CT: "var(--ct)" };

export function Board({
  strat,
  time,
  tool = "select",
  selectedId = null,
  readOnly = false,
  onSelect,
  onCommit,
  onCheckpoint,
  onLive,
  onNotice,
}: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [draft, setDraft] = useState<{ points: Pt[]; team: Side | null } | null>(null);
  const map = MAPS[strat.map];
  const players = strat.objects.filter((o): o is PlacedPlayer => o.kind === "player");
  const playerById = new Map(players.map((p) => [p.id, p]));

  function toBoard(e: { clientX: number; clientY: number }): Pt {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: clamp(p.x, 0, 1000), y: clamp(p.y, 0, 1000) };
  }

  function add(o: BoardObject) {
    onCommit?.({ ...strat, objects: [...strat.objects, o] });
    onSelect?.(o.id);
  }

  function startDraw(e: ReactPointerEvent, from: Pt, player: PlacedPlayer | null) {
    svgRef.current?.setPointerCapture(e.pointerId);
    gesture.current = { mode: "draw", points: [from], player: player?.id ?? null, team: player?.team ?? null };
    setDraft({ points: [from], team: player?.team ?? null });
  }

  function onBackgroundDown(e: ReactPointerEvent) {
    if (readOnly || e.button !== 0) return;
    const p = toBoard(e);
    switch (tool) {
      case "select":
        onSelect?.(null);
        return;
      case "T":
      case "CT": {
        const n = nextPlayerNumber(strat, tool);
        if (n === null) {
          onNotice?.(`All five ${tool} players are already on the board.`);
          return;
        }
        add({ id: newId(), kind: "player", team: tool, n, role: "", ...p });
        return;
      }
      case "route":
        startDraw(e, p, null);
        return;
      case "text":
        add({ id: newId(), kind: "text", text: "Note", t: time ?? 0, ...p });
        return;
      default:
        add({ id: newId(), kind: "utility", type: tool, t: time ?? 0, ...p });
    }
  }

  function onObjectDown(e: ReactPointerEvent, o: BoardObject) {
    if (readOnly || e.button !== 0) return;
    if (tool === "route" && o.kind === "player") {
      e.stopPropagation();
      startDraw(e, playerEndPosition(strat, o), o);
      return;
    }
    if (tool !== "select") return; // placement tools place on top of objects
    e.stopPropagation();
    onSelect?.(o.id);
    // Routes that belong to a player move with the player, not on their own.
    if (o.kind === "route" && o.player) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    gesture.current = { mode: "move", id: o.id, start: toBoard(e), orig: o, moved: false };
  }

  function onMove(e: ReactPointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const p = toBoard(e);
    if (g.mode === "draw") {
      const last = g.points[g.points.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 3) return;
      g.points.push(p);
      setDraft({ points: [...g.points], team: g.team });
      return;
    }
    const dx = p.x - g.start.x;
    const dy = p.y - g.start.y;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < 2) return;
      g.moved = true;
      onCheckpoint?.();
    }
    onLive?.({ ...strat, objects: strat.objects.map((o) => moved(o, g.orig, dx, dy)) });
  }

  function onUp() {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.mode !== "draw") return;
    setDraft(null);
    const points = simplify(g.points, 3);
    if (points.length < 2 || Math.hypot(points[0].x - points.at(-1)!.x, points[0].y - points.at(-1)!.y) < 12) return;
    const route: RouteObject = {
      id: newId(),
      kind: "route",
      player: g.player,
      points,
      t: g.player ? nextRouteStart(strat, g.player) : (time ?? 0),
      duration: walkDuration(points),
    };
    add(route);
  }

  /** Moving a player also moves the start of their first route, so the path stays attached. */
  function moved(o: BoardObject, orig: BoardObject, dx: number, dy: number): BoardObject {
    if (orig.kind === "player") {
      const nx = clamp(orig.x + dx, 0, 1000);
      const ny = clamp(orig.y + dy, 0, 1000);
      if (o.id === orig.id) return { ...o, x: nx, y: ny } as BoardObject;
      if (o.kind === "route" && o.player === orig.id) {
        const first = strat.objects
          .filter((r): r is RouteObject => r.kind === "route" && r.player === orig.id)
          .sort((a, b) => a.t - b.t)[0];
        if (first?.id === o.id) return { ...o, points: [{ x: nx, y: ny }, ...o.points.slice(1)] };
      }
      return o;
    }
    if (o.id !== orig.id) return o;
    if (orig.kind === "route") {
      return { ...orig, points: orig.points.map((p) => ({ x: clamp(p.x + dx, 0, 1000), y: clamp(p.y + dy, 0, 1000) })) };
    }
    if (orig.kind === "utility" || orig.kind === "text") {
      return { ...orig, x: clamp(orig.x + dx, 0, 1000), y: clamp(orig.y + dy, 0, 1000) };
    }
    return o;
  }

  const cursor = readOnly ? "default" : tool === "select" ? "default" : "crosshair";
  const routes = strat.objects.filter((o): o is RouteObject => o.kind === "route");
  const utilities = strat.objects.filter((o): o is UtilityObject => o.kind === "utility");
  const texts = strat.objects.filter((o) => o.kind === "text");

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1000 1000"
      className="block h-full w-full touch-none select-none"
      style={{ cursor }}
      onPointerDown={onBackgroundDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="img"
      aria-label={`${map.name} board: ${strat.name}`}
    >
      <defs>
        {(["T", "CT", "none"] as const).map((k) => (
          <marker
            key={k}
            id={`arrow-${k}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" fill={k === "none" ? "var(--ink)" : TEAM_COLOR[k]} />
          </marker>
        ))}
      </defs>

      <MapLayer map={map} />

      {/* routes */}
      {routes.map((r) => {
        const vis = visibilityAt(r, time);
        const team = r.player ? playerById.get(r.player)?.team : undefined;
        const color = team ? TEAM_COLOR[team] : "var(--ink)";
        const selected = r.id === selectedId;
        return (
          <g key={r.id} opacity={vis.opacity} onPointerDown={(e) => onObjectDown(e, r)} style={{ cursor: readOnly ? "default" : "pointer" }}>
            <path d={pathData(r.points)} stroke="transparent" strokeWidth="18" fill="none" />
            {selected && <path d={pathData(r.points)} stroke="var(--select)" strokeWidth="9" fill="none" opacity="0.35" strokeLinecap="round" strokeLinejoin="round" />}
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
            {time === null && r.player && (
              <TimeTag x={r.points[Math.floor(r.points.length / 2)].x} y={r.points[Math.floor(r.points.length / 2)].y} label={formatTime(r.t)} />
            )}
          </g>
        );
      })}

      {draft && (
        <path
          d={pathData(draft.points)}
          stroke={draft.team ? TEAM_COLOR[draft.team] : "var(--ink)"}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
      )}

      {/* utility */}
      {utilities.map((u) => {
        const vis = visibilityAt(u, time);
        if (!vis.show) return null;
        return (
          <g key={u.id} opacity={vis.opacity} onPointerDown={(e) => onObjectDown(e, u)} style={{ cursor: readOnly ? "default" : "move" }}>
            <UtilityGlyph u={u} selected={u.id === selectedId} />
            {time === null && <TimeTag x={u.x} y={u.y + UTILITY_RADIUS[u.type] + 16} label={formatTime(u.t)} />}
          </g>
        );
      })}

      {/* notes */}
      {texts.map((o) => {
        if (o.kind !== "text") return null;
        const vis = visibilityAt(o, time);
        if (!vis.show) return null;
        const w = Math.min(420, 22 + o.text.length * 8.2);
        return (
          <g key={o.id} onPointerDown={(e) => onObjectDown(e, o)} style={{ cursor: readOnly ? "default" : "move" }}>
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

      {/* players on top */}
      {players.map((p) => {
        const pos = time === null ? p : playerPositionAt(strat, p, time);
        const selected = p.id === selectedId;
        return (
          <g
            key={p.id}
            transform={`translate(${pos.x} ${pos.y})`}
            onPointerDown={(e) => onObjectDown(e, p)}
            style={{ cursor: readOnly ? "default" : tool === "route" ? "crosshair" : "move" }}
          >
            {selected && <circle r="25" fill="none" stroke="var(--select)" strokeWidth="4" />}
            <circle r="19" cy="3" fill="var(--shadow)" opacity="0.6" />
            <circle r="18" fill={TEAM_COLOR[p.team]} stroke="var(--token-ring)" strokeWidth="3" />
            <text y="7" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--token-ink)" style={{ fontFamily: "var(--font-condensed)" }}>
              {p.n}
            </text>
            {p.role && (
              <text y="40" textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--ink)" stroke="var(--wall)" strokeWidth="5" paintOrder="stroke" style={{ fontFamily: "var(--font-condensed)" }}>
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

function UtilityGlyph({ u, selected }: { u: UtilityObject; selected: boolean }) {
  const r = UTILITY_RADIUS[u.type];
  const ring = selected ? <circle cx={u.x} cy={u.y} r={r + 7} fill="none" stroke="var(--select)" strokeWidth="3.5" /> : null;
  switch (u.type) {
    case "smoke":
      return (
        <g>
          {ring}
          <circle cx={u.x} cy={u.y} r={r} fill="var(--smoke)" fillOpacity="0.55" stroke="var(--smoke)" strokeWidth="2" />
          <circle cx={u.x - 8} cy={u.y - 6} r={r * 0.45} fill="var(--smoke)" fillOpacity="0.5" />
          <circle cx={u.x + 9} cy={u.y + 5} r={r * 0.4} fill="var(--smoke)" fillOpacity="0.45" />
        </g>
      );
    case "molotov":
      return (
        <g>
          {ring}
          <circle cx={u.x} cy={u.y} r={r} fill="var(--molotov)" fillOpacity="0.35" stroke="var(--molotov)" strokeWidth="2.5" strokeDasharray="5 4" />
          <path d={`M${u.x} ${u.y - 10}c6 7 7 11 0 17c-7-6-6-10 0-17z`} fill="var(--molotov)" />
        </g>
      );
    case "flash": {
      const rays = Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return `M${u.x + Math.cos(a) * (r + 2)} ${u.y + Math.sin(a) * (r + 2)}L${u.x + Math.cos(a) * (r + 9)} ${u.y + Math.sin(a) * (r + 9)}`;
      }).join(" ");
      return (
        <g>
          {ring}
          <path d={rays} stroke="var(--flash)" strokeWidth="3" strokeLinecap="round" />
          <circle cx={u.x} cy={u.y} r={r} fill="var(--flash)" stroke="var(--board-bg)" strokeWidth="2" />
        </g>
      );
    }
    case "he":
      return (
        <g>
          {ring}
          <circle cx={u.x} cy={u.y} r={r} fill="var(--he)" fillOpacity="0.25" stroke="var(--he)" strokeWidth="2.5" />
          <circle cx={u.x} cy={u.y} r="6" fill="var(--he)" />
        </g>
      );
  }
}

function MapLayer({ map }: { map: MapDef }) {
  const rooms = map.areas;
  return (
    <g pointerEvents="none">
      <defs>
        <pattern id="void-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="14" height="14" fill="var(--void)" />
          <line x1="0" y1="0" x2="0" y2="14" stroke="var(--void-line)" strokeWidth="3" />
        </pattern>
        <pattern id="floor-tiles" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="var(--floor-seam)" strokeWidth="1" />
        </pattern>
        <pattern id="plant-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="var(--plant)" strokeWidth="2" />
        </pattern>
      </defs>

      <rect width="1000" height="1000" fill="url(#void-hatch)" />

      {rooms.length === 0 && <rect width="1000" height="1000" fill="var(--floor)" opacity="0.35" />}

      {/* shadow, then walls (thick strokes), then floors on top: connected areas merge into one plan */}
      <g transform="translate(5 8)" opacity="0.55">
        {rooms.map((a) => (
          <rect key={a.id} x={a.x - 7} y={a.y - 7} width={a.w + 14} height={a.h + 14} rx="6" fill="var(--shadow)" />
        ))}
      </g>
      <g>
        {rooms.map((a) => (
          <rect key={a.id} x={a.x - 7} y={a.y - 7} width={a.w + 14} height={a.h + 14} rx="6" fill="var(--wall)" />
        ))}
      </g>
      <g>
        {rooms.map((a) => (
          <rect
            key={a.id}
            x={a.x}
            y={a.y}
            width={a.w}
            height={a.h}
            rx="2"
            fill={a.site ? "var(--site-floor)" : a.spawn === "T" ? "var(--t-floor)" : a.spawn === "CT" ? "var(--ct-floor)" : "var(--floor)"}
          />
        ))}
        {rooms.map((a) => (
          <rect key={`${a.id}-tiles`} x={a.x} y={a.y} width={a.w} height={a.h} fill="url(#floor-tiles)" />
        ))}
      </g>

      {/* bombsites: hatched plant zone + stencil letter */}
      {rooms
        .filter((a) => a.site)
        .map((a) => (
          <g key={`${a.id}-site`}>
            <rect
              x={a.x + a.w * 0.22}
              y={a.y + a.h * 0.22}
              width={a.w * 0.56}
              height={a.h * 0.56}
              rx="4"
              fill="url(#plant-hatch)"
              stroke="var(--plant)"
              strokeWidth="2"
              strokeDasharray="8 6"
            />
            <text
              x={a.x + a.w / 2}
              y={a.y + a.h / 2 + 34}
              textAnchor="middle"
              fontSize="100"
              fill="var(--site-letter)"
              style={{ fontFamily: "var(--font-stencil)" }}
            >
              {a.site}
            </text>
          </g>
        ))}

      {/* cover */}
      {map.props.map((p, i) => (
        <g key={i}>
          <rect x={p.x + 3} y={p.y + 4} width={p.w} height={p.h} rx="2" fill="var(--shadow)" opacity="0.7" />
          <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="2" fill="var(--prop)" stroke="var(--prop-edge)" strokeWidth="1.5" />
        </g>
      ))}

      {/* callouts */}
      {rooms
        .filter((a) => !a.corridor)
        .map((a) => {
          const vertical = a.h > a.w * 1.6 && a.w < 90;
          const cx = a.x + a.w / 2;
          const cy = a.site ? a.y + 22 : a.y + a.h / 2 + 6;
          return (
            <text
              key={`${a.id}-name`}
              x={cx}
              y={cy}
              textAnchor="middle"
              fontSize="19"
              fontWeight="600"
              fill="var(--callout)"
              transform={vertical ? `rotate(-90 ${cx} ${cy - 6})` : undefined}
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {a.name}
            </text>
          );
        })}
      {map.callouts.map((c) => (
        <text
          key={c.text}
          x={c.x}
          y={c.y}
          textAnchor="middle"
          fontSize="14"
          fontWeight="500"
          fill="var(--callout-minor)"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          {c.text}
        </text>
      ))}

      {rooms.length > 0 && (
        <text x="986" y="988" textAnchor="end" fontSize="14" fill="var(--callout-minor)" style={{ fontFamily: "var(--font-condensed)" }}>
          {map.name}, schematic layout
        </text>
      )}
    </g>
  );
}
