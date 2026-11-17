import { UtilityShape } from "@/components/utility-icons";
import { CONE_DEGREES, UTILITY_RADIUS, type BombObject, type LineupObject, type Side, type UtilityObject, type VisionObject } from "@/lib/strat/types";

export const TEAM_COLOR: Record<Side, string> = { T: "var(--t)", CT: "var(--ct)" };

const UTILITY_COLOR: Record<UtilityObject["type"], string> = {
  smoke: "var(--smoke)",
  flash: "var(--flash)",
  molotov: "var(--molotov)",
  he: "var(--he)",
};

/** A grenade on the board: its area, with the grenade's icon on a disc in the middle. */
export function UtilityGlyph({ u, selected }: { u: UtilityObject; selected: boolean }) {
  const r = UTILITY_RADIUS[u.type];
  const color = UTILITY_COLOR[u.type];
  const fill = u.type === "smoke" ? 0.5 : u.type === "flash" ? 0.28 : 0.3;
  return (
    <g>
      {selected && <circle cx={u.x} cy={u.y} r={r + 7} fill="none" stroke="var(--select)" strokeWidth="3.5" />}
      <circle
        cx={u.x}
        cy={u.y}
        r={r}
        fill={color}
        fillOpacity={fill}
        stroke={color}
        strokeWidth="2"
        strokeDasharray={u.type === "molotov" ? "5 4" : undefined}
      />
      <circle cx={u.x} cy={u.y} r="13" fill="var(--icon-disc)" stroke={color} strokeWidth="1.5" />
      <g transform={`translate(${u.x - 9} ${u.y - 9}) scale(0.75)`} color={color}>
        <UtilityShape type={u.type} />
      </g>
    </g>
  );
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

/** The end of a sight cone's centre line: where its length handle sits. */
export function coneTip(v: VisionObject): { x: number; y: number } {
  const a = (v.angle * Math.PI) / 180;
  return { x: v.x + v.length * Math.cos(a), y: v.y + v.length * Math.sin(a) };
}

/** A sight cone: where someone is looking and how far. Selected cones show their two drag handles. */
export function VisionCone({ v, selected }: { v: VisionObject; selected: boolean }) {
  const half = CONE_DEGREES[v.cone] / 2;
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = rad(v.angle - half);
  const b = rad(v.angle + half);
  const R = v.length;
  const d = `M${v.x} ${v.y}L${v.x + R * Math.cos(a)} ${v.y + R * Math.sin(a)}A${R} ${R} 0 0 1 ${v.x + R * Math.cos(b)} ${v.y + R * Math.sin(b)}Z`;
  const tip = coneTip(v);
  return (
    <g>
      <path d={d} fill="var(--cone)" stroke={selected ? "var(--select)" : "var(--cone-edge)"} strokeWidth={selected ? 2.5 : 1.5} />
      <circle cx={v.x} cy={v.y} r="7" fill="var(--chalk)" stroke="var(--void)" strokeWidth="2" data-handle="origin" />
      {selected && (
        <>
          <line x1={v.x} y1={v.y} x2={tip.x} y2={tip.y} stroke="var(--select)" strokeWidth="1.5" strokeDasharray="5 5" pointerEvents="none" />
          <circle cx={tip.x} cy={tip.y} r="10" fill="var(--select)" stroke="var(--void)" strokeWidth="2.5" data-handle="tip" style={{ cursor: "grab" }} />
        </>
      )}
    </g>
  );
}
