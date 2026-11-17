import type { MapDef } from "@/lib/maps";

/**
 * The map, kept deliberately plain: one floor colour, one thin outline for
 * walls and cover, a soft highlight on each bombsite with its letter.
 * Callout names are optional.
 */
export function MapLayer({ map, callouts = false }: { map: MapDef; callouts?: boolean }) {
  const t = map.traced;
  const clip = `floor-clip-${map.id}`;
  return (
    <g pointerEvents="none">
      <rect width="1000" height="1000" fill="var(--void)" />
      {!t && <rect width="1000" height="1000" fill="var(--floor)" opacity="0.5" />}

      {t && (
        <>
          <defs>
            <clipPath id={clip}>
              <path d={t.floor} clipRule="evenodd" />
            </clipPath>
          </defs>
          <path d={t.floor} fillRule="evenodd" fill="var(--floor)" stroke="var(--map-line)" strokeWidth="1.6" strokeLinejoin="round" />
          <g clipPath={`url(#${clip})`}>
            {map.areas
              .filter((a) => a.site)
              .map((a) => (
                <rect key={a.id} x={a.x} y={a.y} width={a.w} height={a.h} fill="var(--site)" />
              ))}
          </g>
          {t.props.map((p, i) => (
            <polygon
              key={i}
              points={p.map(([x, y]) => `${x},${y}`).join(" ")}
              fill="var(--floor)"
              stroke="var(--map-line)"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          ))}
        </>
      )}

      {map.areas
        .filter((a) => a.site)
        .map((a) => (
          <text key={`${a.id}-letter`} x={a.x + a.w - 14} y={a.y + 30} textAnchor="end" fontSize="26" fontWeight="600" fill="var(--site-letter)">
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
              fontSize="15"
              fill="var(--callout)"
              style={{ fontFamily: "var(--font-condensed)" }}
            >
              {a.name}
            </text>
          ))}
      {callouts &&
        map.callouts.map((c) => (
          <text key={c.text} x={c.x} y={c.y} textAnchor="middle" fontSize="13" fill="var(--callout-minor)" style={{ fontFamily: "var(--font-condensed)" }}>
            {c.text}
          </text>
        ))}
    </g>
  );
}
