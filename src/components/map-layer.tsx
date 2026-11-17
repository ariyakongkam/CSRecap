import type { MapDef } from "@/lib/maps";

/** The map itself: hatched void, merged walls and floors, cover, bombsites and callouts. */
export function MapLayer({ map }: { map: MapDef }) {
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
