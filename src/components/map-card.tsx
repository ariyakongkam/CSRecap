import { MapLayer } from "@/components/map-layer";
import { MAPS, type MapId } from "@/lib/maps";

/** A map choice: the map's name over a soft, blurred picture of its layout. */
export function MapCard({
  id,
  selected,
  onClick,
  size = "md",
}: {
  id: MapId;
  selected: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  const map = MAPS[id];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative isolate overflow-hidden rounded-xl border text-left transition-colors ${
        selected ? "border-chalk ring-2 ring-chalk" : "border-line hover:border-line-strong"
      } ${size === "sm" ? "h-24" : "h-36 sm:h-44"}`}
    >
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 -z-10 h-full w-full scale-110 opacity-80 blur-[3px] transition duration-300 group-hover:scale-[1.15] group-hover:blur-[2px]"
        aria-hidden="true"
      >
        <MapLayer map={map} />
      </svg>
      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-bg/90 via-bg/30 to-transparent" aria-hidden="true" />
      <span className={`absolute bottom-0 left-0 p-3 font-display font-bold ${size === "sm" ? "text-xl" : "text-2xl sm:text-3xl"}`}>
        {map.name}
      </span>
    </button>
  );
}
