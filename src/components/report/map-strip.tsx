import type { MapStats } from "@/lib/faceit/types";
import { Bar } from "@/components/motion";

export function MapStrip({ maps, overallWinRate }: { maps: MapStats[]; overallWinRate: number }) {
  // Every map with a few games, most-played first (best/worst maps named in the report always appear).
  const shown = maps.filter((m) => m.matches >= 3).slice(0, 10);
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="maps-heading">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 id="maps-heading" className="font-display text-lg font-bold">
          Map pool
        </h2>
        <p className="text-xs text-faint">Win rate per map · overall {Math.round(overallWinRate)}%</p>
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:overflow-visible sm:px-0">
        {shown.map((m, i) => {
          const diff = m.winRate - overallWinRate;
          const tone = m.matches < 10 ? "text-muted" : diff >= 5 ? "text-good" : diff <= -5 ? "text-bad" : "text-text";
          const bar = m.matches < 10 ? "bg-faint" : diff >= 5 ? "bg-good" : diff <= -5 ? "bg-bad" : "bg-muted";
          return (
            <div key={m.map} className="card relative w-40 shrink-0 snap-start overflow-hidden sm:w-auto">
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element -- decorative map art from FACEIT CDN
                <img src={m.image} alt="" className="absolute inset-0 size-full object-cover opacity-[0.18]" loading="lazy" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent" aria-hidden="true" />
              <div className="relative p-4">
                <p className="font-semibold">{m.map}</p>
                <p className={`tabular mt-3 font-display text-2xl font-bold ${tone}`}>{Math.round(m.winRate)}%</p>
                <div className="mt-2">
                  <Bar value={m.winRate / 100} className={bar} delay={0.05 * i} />
                </div>
                <p className="tabular mt-2 flex justify-between text-xs text-faint">
                  <span>{m.matches} matches</span>
                  <span>{m.kd.toFixed(2)} K/D</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
