"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Board } from "@/components/board";
import { Logo } from "@/components/logo";
import { MAPS, MAP_IDS, type MapId } from "@/lib/maps";
import { createStrat, duplicateStrat } from "@/lib/strat/model";
import { deleteStrat, listStrats, saveStrat } from "@/lib/strat/storage";
import { TEMPLATES } from "@/lib/strat/templates";
import type { Side, Strat } from "@/lib/strat/types";

export function Library() {
  const router = useRouter();
  const [strats, setStrats] = useState<Strat[] | null>(null);
  const [map, setMap] = useState<MapId>("mirage");
  const [side, setSide] = useState<Side>("T");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setStrats(listStrats()), []);

  function open(s: Strat) {
    if (!saveStrat(s)) {
      setError("Your browser refused to save. Storage may be full or blocked (private window?).");
      return;
    }
    router.push(`/edit?id=${s.id}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <p className="hidden text-sm text-muted sm:block">Plan it. Time it. Share it in one link.</p>
      </header>

      <section className="grid gap-6 rounded-2xl border border-line bg-panel p-5 sm:p-7 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">Draw the execute once. Your team sees it play out.</h1>
          <p className="mt-3 max-w-prose text-muted">
            Place players, draw their routes, drop smokes and flashes at the second they pop, then press play. Share it as a link: no
            account needed to view.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <span className="mb-2 block text-xs font-medium tracking-wide text-faint uppercase">Map</span>
              <div className="flex flex-wrap gap-2">
                {MAP_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMap(id)}
                    aria-pressed={map === id}
                    className={`btn ${map === id ? "!border-accent !text-accent" : ""}`}
                  >
                    {MAPS[id].name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-2 block text-xs font-medium tracking-wide text-faint uppercase">Side</span>
              <div className="flex gap-2">
                {(["T", "CT"] as Side[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    aria-pressed={side === s}
                    className={`btn ${side === s ? (s === "T" ? "!border-t !text-t" : "!border-ct !text-ct") : ""}`}
                  >
                    {s} side
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => open(createStrat(map, side, `${MAPS[map].name} ${side} strat`))}>
              <Plus className="size-4" /> New blank strat
            </button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium tracking-wide text-faint uppercase">Or start from an example</span>
          <ul className="space-y-2">
            {TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => open(t.build())}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-bg p-3 text-left transition hover:border-accent/60"
                >
                  <span className="size-16 shrink-0 overflow-hidden rounded-lg border border-line">
                    <Board strat={t.build()} time={null} readOnly />
                  </span>
                  <span>
                    <span className="block font-semibold">{t.name}</span>
                    <span className="block text-sm text-muted">{t.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Your strats</h2>
        <p className="text-sm text-muted">Saved in this browser.</p>
        {strats === null ? null : strats.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-muted">
            No strats yet. Start one above, or open an example.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {strats.map((s) => (
              <li key={s.id} className="group overflow-hidden rounded-xl border border-line bg-panel">
                <button type="button" onClick={() => router.push(`/edit?id=${s.id}`)} className="block w-full text-left">
                  <span className="block aspect-[16/10] overflow-hidden border-b border-line">
                    <Board strat={s} time={null} readOnly />
                  </span>
                  <span className="block p-3">
                    <span className="block truncate font-semibold">{s.name}</span>
                    <span className="block text-sm text-muted">
                      {MAPS[s.map].name} · {s.side} · {new Date(s.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </span>
                </button>
                <div className="flex gap-2 px-3 pb-3">
                  <button
                    type="button"
                    className="btn !px-2.5 !py-1.5 text-xs"
                    onClick={() => {
                      saveStrat(duplicateStrat(s));
                      setStrats(listStrats());
                    }}
                  >
                    <Copy className="size-3.5" /> Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn !px-2.5 !py-1.5 text-xs text-danger"
                    onClick={() => {
                      if (!window.confirm(`Delete "${s.name}"? This can't be undone.`)) return;
                      deleteStrat(s.id);
                      setStrats(listStrats());
                    }}
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-16 text-xs text-faint">
        Maps are simplified schematics, not official radar images. Not affiliated with Valve.
      </footer>
    </div>
  );
}
