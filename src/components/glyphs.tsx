import type { Side } from "@/lib/strat/types";
import { UTILITY_RADIUS, type BombObject, type LineupObject, type UtilityObject } from "@/lib/strat/types";

export const TEAM_COLOR: Record<Side, string> = { T: "var(--t)", CT: "var(--ct)" };

export function UtilityGlyph({ u, selected }: { u: UtilityObject; selected: boolean }) {
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


/** The C4: a dark olive brick with a green display, a red light and two wires. */
export function BombGlyph({ b, selected }: { b: BombObject; selected: boolean }) {
  const w = 46;
  const h = 30;
  const x = b.x - w / 2;
  const y = b.y - h / 2;
  return (
    <g>
      {selected && <rect x={x - 7} y={y - 7} width={w + 14} height={h + 14} rx="7" fill="none" stroke="var(--select)" strokeWidth="3.5" />}
      <rect x={x + 3} y={y + 4} width={w} height={h} rx="3" fill="var(--shadow)" opacity="0.7" />
      <rect x={x} y={y} width={w} height={h} rx="3" fill="var(--c4)" stroke="var(--c4-edge)" strokeWidth="2" />
      <rect x={x + 6} y={y + 6} width="22" height="10" rx="1.5" fill="var(--c4-screen)" />
      <rect x={x + 6} y={y + 19} width="22" height="5" rx="1" fill="var(--c4-keys)" />
      <circle cx={x + w - 9} cy={y + 10} r="3.5" fill="var(--c4-led)" />
      <path d={`M${x + w - 12} ${y + h - 4}c4 -8 10 -6 12 -14`} fill="none" stroke="var(--c4-wire-red)" strokeWidth="2" />
      <path d={`M${x + w - 6} ${y + h - 3}c2 -6 6 -8 4 -14`} fill="none" stroke="var(--c4-wire-blue)" strokeWidth="2" />
    </g>
  );
}

/** A map pin with a play triangle (video) or a frame (image). */
export function LineupGlyph({ l, selected }: { l: LineupObject; selected: boolean }) {
  const isVideo = /youtu\.?be/.test(l.url);
  return (
    <g transform={`translate(${l.x} ${l.y})`}>
      {selected && <circle cy="-24" r="20" fill="none" stroke="var(--select)" strokeWidth="3.5" />}
      <path d="M0 0c-4-8-15-14-15-24a15 15 0 0 1 30 0c0 10-11 16-15 24z" fill="var(--chalk)" stroke="var(--wall)" strokeWidth="2.5" />
      {isVideo ? (
        <path d="M-4 -30l10 6-10 6z" fill="var(--chalk-ink)" />
      ) : (
        <g fill="none" stroke="var(--chalk-ink)" strokeWidth="2">
          <rect x="-7" y="-30" width="14" height="11" rx="1.5" />
          <path d="M-6 -21l4-4 3 3 2-2 4 3" />
        </g>
      )}
      {l.title && (
        <text y="18" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--ink)" stroke="var(--wall)" strokeWidth="5" paintOrder="stroke" style={{ fontFamily: "var(--font-condensed)" }}>
          {l.title}
        </text>
      )}
    </g>
  );
}

/** A view cone: where a player is looking. 90° wide. */
export function VisionCone({ x, y, facing, team }: { x: number; y: number; facing: number; team: Side }) {
  const R = 125;
  const half = 45;
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = rad(facing - half);
  const b = rad(facing + half);
  const d = `M${x} ${y}L${x + R * Math.cos(a)} ${y + R * Math.sin(a)}A${R} ${R} 0 0 1 ${x + R * Math.cos(b)} ${y + R * Math.sin(b)}Z`;
  return (
    <g pointerEvents="none">
      <path d={d} fill={TEAM_COLOR[team]} fillOpacity="0.14" stroke={TEAM_COLOR[team]} strokeOpacity="0.55" strokeWidth="1.5" />
      <line
        x1={x}
        y1={y}
        x2={x + R * Math.cos(rad(facing))}
        y2={y + R * Math.sin(rad(facing))}
        stroke={TEAM_COLOR[team]}
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeDasharray="6 6"
      />
    </g>
  );
}
