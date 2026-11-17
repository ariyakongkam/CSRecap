import type { MapDef } from "@/lib/maps";

/**
 * The map itself, drawn from our traced geometry: hatched void, a drop
 * shadow, thick walls, the floor with tile seams, cover, team-tinted
 * spawns, hatched bombsites with a stencil letter, and callouts.
 */
export function MapLayer({ map }: { map: MapDef }) {
  const t = map.traced;
  const clip = `floor-clip-${map.id}`;
  return (
    <g pointerEvents="none">
      <defs>
        <pattern id="void-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="14" height="14" fill="var(--void)" />
          <line x1="0" y1="0" x2="0" y2="14" stroke="var(--void-line)" strokeWidth="3" />
        </pattern>
        <pattern id="floor-tiles" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="var(--floor-seam)" strokeWidth="1" />
        </pattern>
        <pattern id="plant-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="var(--plant)" strokeWidth="2" />
        </pattern>
        {t && (
          <clipPath id={clip}>
            <path d={t.floor} clipRule="evenodd" />
          </clipPath>
        )}
      </defs>

      <rect width="1000" height="1000" fill="url(#void-hatch)" />
      {!t && <rect width="1000" height="1000" fill="var(--floor)" opacity="0.35" />}

      {t && (
        <>
          <path d={t.floor} fillRule="evenodd" fill="var(--shadow)" opacity="0.6" transform="translate(4 7)" />
          <path d={t.floor} fillRule="evenodd" fill="var(--wall)" stroke="var(--wall)" strokeWidth="9" strokeLinejoin="round" />
          <path d={t.floor} fillRule="evenodd" fill="var(--floor)" />
          <path d={t.floor} fillRule="evenodd" fill="url(#floor-tiles)" />

          {/* spawns and bombsites, kept inside the floor */}
          <g clipPath={`url(#${clip})`}>
            {map.areas
              .filter((a) => a.spawn || a.site)
              .map((a) => (
                <rect
                  key={a.id}
                  x={a.x}
                  y={a.y}
                  width={a.w}
                  height={a.h}
                  rx="6"
                  fill={a.site ? "var(--site-floor)" : a.spawn === "T" ? "var(--t-floor)" : "var(--ct-floor)"}
                  opacity="0.9"
                />
              ))}
            {map.areas
              .filter((a) => a.site)
              .map((a) => (
                <rect
                  key={`${a.id}-plant`}
                  x={a.x + a.w * 0.18}
                  y={a.y + a.h * 0.18}
                  width={a.w * 0.64}
                  height={a.h * 0.64}
                  rx="4"
                  fill="url(#plant-hatch)"
                  stroke="var(--plant)"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                />
              ))}
          </g>

          {t.props.map((p, i) => {
            const pts = p.map(([x, y]) => `${x},${y}`).join(" ");
            return (
              <g key={i}>
                <polygon points={pts} fill="var(--shadow)" opacity="0.7" transform="translate(2 3)" />
                <polygon points={pts} fill="var(--prop)" stroke="var(--prop-edge)" strokeWidth="1.2" strokeLinejoin="round" />
              </g>
            );
          })}
        </>
      )}

      {map.areas
        .filter((a) => a.site)
        .map((a) => (
          <text
            key={`${a.id}-letter`}
            x={a.x + a.w / 2}
            y={a.y + a.h / 2 + 30}
            textAnchor="middle"
            fontSize="88"
            fill="var(--site-letter)"
            style={{ fontFamily: "var(--font-stencil)" }}
          >
            {a.site}
          </text>
        ))}

      {map.areas
        .filter((a) => a.name)
        .map((a) => {
          const vertical = a.h > a.w * 1.6 && a.w < 80;
          const cx = a.x + a.w / 2;
          const cy = a.site ? a.y + 18 : a.y + a.h / 2 + 6;
          return (
            <text
              key={`${a.id}-name`}
              x={cx}
              y={cy}
              textAnchor="middle"
              fontSize="18"
              fontWeight="600"
              fill="var(--callout)"
              stroke="var(--wall)"
              strokeWidth="4"
              paintOrder="stroke"
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
          stroke="var(--wall)"
          strokeWidth="3"
          paintOrder="stroke"
          style={{ fontFamily: "var(--font-condensed)" }}
        >
          {c.text}
        </text>
      ))}

      {t && (
        <text x="986" y="988" textAnchor="end" fontSize="14" fill="var(--callout-minor)" style={{ fontFamily: "var(--font-condensed)" }}>
          {map.name}, traced layout
        </text>
      )}
    </g>
  );
}
