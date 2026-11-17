import { MAPS, type MapId } from "@/lib/maps";

/** A map choice: the map's name over a soft, blurred in-game picture of it. */
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
      className={`group relative isolate overflow-hidden rounded-xl border bg-panel-2 text-left transition-colors ${
        selected ? "border-chalk ring-2 ring-chalk" : "border-line hover:border-line-strong"
      } ${size === "sm" ? "h-24" : "h-28 sm:h-32"}`}
    >
      {map.thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={map.thumb}
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-75 blur-[2px] transition duration-300 group-hover:scale-[1.15] group-hover:blur-[1px]"
        />
      )}
      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-bg/90 via-bg/35 to-transparent" aria-hidden="true" />
      <span className={`absolute bottom-0 left-0 p-3 font-display font-bold ${size === "sm" ? "text-xl" : "text-2xl"}`}>{map.name}</span>
    </button>
  );
}
