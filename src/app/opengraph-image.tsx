import { ImageResponse } from "next/og";
import { LOGO_PATHS } from "@/components/logo-mark";
import { APP_NAME } from "@/lib/brand";

export const alt = `${APP_NAME}: free CS2 strat planner and tactics board`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview shown when the site is shared on Discord, X or in search results. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#101a24", padding: 80, gap: 64 }}>
        <svg viewBox="80 160 870 700" width="300" height="242">
          {LOGO_PATHS.map((d) => (
            <path key={d} d={d} fill="#90b8f8" />
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 96, fontWeight: 700, color: "#ece5d3" }}>{APP_NAME}</div>
          <div style={{ fontSize: 44, color: "#ece5d3", lineHeight: 1.2, maxWidth: 680 }}>The free CS2 strat planner for players, teams and coaches</div>
          <div style={{ fontSize: 28, color: "#90b8f8" }}>Plan it. Time it. Share it in one link.</div>
        </div>
      </div>
    ),
    size,
  );
}
