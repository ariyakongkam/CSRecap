import type { MapDef } from "@/lib/maps";

/**
 * The map: Valve's radar overview on a dark background, with the bombsite
 * letters on top. Callout names are optional.
 */
export function MapLayer({ map, callouts = false }: { map: MapDef; callouts?: boolean }) {
  return (
    <g pointerEvents="none">
      <rect width="1000" height="1000" fill="var(--void)" />
      {map.radar ? (
        <image href={map.radar} x="0" y="0" width="1000" height="1000" preserveAspectRatio="none" />
      ) : (
        <rect width="1000" height="1000" fill="var(--floor)" opacity="0.5" />
      )}

      {map.areas
        .filter((a) => a.site)
        .map((a) => (
          <text
            key={`${a.id}-letter`}
            x={a.x + a.w / 2}
            y={a.y - 8}
            textAnchor="middle"
            fontSize="28"
            fontWeight="700"
            fill="var(--site-letter)"
            stroke="var(--void)"
            strokeWidth="5"
            paintOrder="stroke"
          >
            {a.site}
          </text>
        ))}

      {callouts &&
        map.areas
          .filter((a) => a.name && !a.site)
          .map((a) => (
            <text
              key={`${a.id}-name`}
              x={a.x + a.w / 2}
              y={a.y + a.h / 2 + 5}
              textAnchor="middle"
              fontSize="16"
              fontWeight="600"
              fill="var(--ink)"
              stroke="var(--void)"
              strokeWidth="4"
              paintOrder="stroke"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {a.name}
            </text>
          ))}
      {callouts &&
        map.callouts.map((c) => (
          <text
            key={c.text}
            x={c.x}
            y={c.y}
            textAnchor="middle"
            fontSize="14"
            fill="var(--muted-ink)"
            stroke="var(--void)"
            strokeWidth="3"
            paintOrder="stroke"
            style={{ fontFamily: "var(--font-condensed)" }}
          >
            {c.text}
          </text>
        ))}
    </g>
  );
}
