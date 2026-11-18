import { Anchor, ChevronsUp, Crosshair, DoorOpen, Eye, Ghost, LifeBuoy, Megaphone, RefreshCw, Skull, TriangleAlert, type LucideIcon } from "lucide-react";
import { MARKER_LABEL, type MarkerObject, type MarkerType } from "@/lib/strat/types";

/** One plain icon per marker, from the same icon set as the rest of the app. */
export const MARKER_ICON: Record<MarkerType, LucideIcon> = {
  anchor: Anchor,
  awp: Crosshair,
  entry: DoorOpen,
  support: LifeBuoy,
  lurk: Ghost,
  igl: Megaphone,
  hold: Eye,
  boost: ChevronsUp,
  rotate: RefreshCw,
  danger: TriangleAlert,
  pick: Skull,
};

export function MarkerIcon({ icon, className = "size-5" }: { icon: MarkerType; className?: string }) {
  const Icon = MARKER_ICON[icon];
  return <Icon className={className} aria-hidden="true" />;
}

/** A marker on the board: a dark tile with the icon, so it reads on any part of the radar. */
export function MarkerGlyph({ m, selected }: { m: MarkerObject; selected: boolean }) {
  const Icon = MARKER_ICON[m.icon];
  const danger = m.icon === "danger" || m.icon === "pick";
  const s = 34;
  return (
    <g>
      {selected && <rect x={m.x - s / 2 - 6} y={m.y - s / 2 - 6} width={s + 12} height={s + 12} rx="12" fill="none" stroke="var(--select)" strokeWidth="3.5" />}
      <rect
        x={m.x - s / 2}
        y={m.y - s / 2}
        width={s}
        height={s}
        rx="9"
        fill="var(--icon-disc)"
        stroke={danger ? "var(--danger)" : "var(--brand)"}
        strokeWidth="2"
      />
      <Icon x={m.x - 11} y={m.y - 11} width={22} height={22} color={danger ? "var(--danger)" : "var(--brand)"} strokeWidth={2.25} aria-hidden="true" />
      <title>{MARKER_LABEL[m.icon]}</title>
    </g>
  );
}
