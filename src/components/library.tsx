"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Board } from "@/components/board";
import { Logo } from "@/components/logo";
import { roundClock } from "@/components/timeline";
import { MAPS, MAP_IDS, type MapId } from "@/lib/maps";
import { createStrat, duplicateStrat } from "@/lib/strat/model";
import { deleteStrat, listStrats, saveStrat } from "@/lib/strat/storage";
import { TEMPLATES } from "@/lib/strat/templates";
import { stratDuration } from "@/lib/strat/timeline";
import type { Side, Strat } from "@/lib/strat/types";

/** The hero: the Mirage example playing on a loop, the way a team would see it. */
function LiveDemo({ onOpen }: { onOpen: (s: Strat) => void }) {
  const strat = useMemo(() => TEMPLATES[0].build(), []);
  const end = stratDuration(strat) + 2;
  const [time, setTime] = useState(13);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last: number | null = null;
    let t = 0;
    const tick = (now: number) => {
      t += last === null ? 0 : (now - last) / 1000;
      last = now;
      if (t > end + 1.5) t = 0; // hold the final frame, then loop
      setTime(Math.min(t, end));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [end]);

  return (
    <div className="relative">
      <div className="aspect-square overflow-hidden rounded-2xl border border-line shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
        <Board strat={strat} time={time} readOnly />
      </div>
      <div className="absolute top-3 left-3 flex items-center gap-3 rounded-lg border border-line bg-bg/90 px-3 py-2">
        <span className="font-display text-2xl leading-none font-semibold tabular-nums">{roundClock(time)}</span>
        <span className="text-sm text-muted">{strat.name}</span>
      </div>
      <button type="button" onClick={() => onOpen(strat)} className="btn btn-primary absolute right-3 bottom-3">
        Open this strat
      </button>
    </div>
  );
}

export function Library() {
  const router = useRouter();
  const [strats, setStrats] = useState<Strat[] | null>(null);
  const [map, setMap] = useState<MapId>("mirage");
  const [side, setSide] = useState<Side>("T");
  const [error, setError] = useState<string | null>(null);
  const previews = useMemo(() => Object.fromEntries(MAP_IDS.map((id) => [id, createStrat(id, "T")])) as Record<MapId, Strat>, []);
  const examples = useMemo(() => TEMPLATES.map((t) => ({ t, strat: t.build() })), []);

  useEffect(() => setStrats(listStrats()), []);

  function open(s: Strat) {
    if (!saveStrat(s)) {
      setError("Your browser didn't let us save. Storage is full or blocked, for example in a private window.");
      return;
    }
    router.push(`/edit?id=${s.id}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <a href="#new" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted hover:text-text">
          New strat
        </a>
      </header>

      <section className="grid items-center gap-8 py-6 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-10">
        <div>
          <h1 className="font-display text-5xl leading-[0.95] font-bold text-balance sm:text-6xl lg:text-7xl">
            Draw the execute once. Your team watches it play.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Put five players on the map, draw their routes and drop each smoke at the second it lands. Press play, then send the link
            to your team. They don&apos;t need an account to open it.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#new" className="btn btn-primary">
              <Plus className="size-4" /> Start a strat
            </a>
            <button type="button" className="btn" onClick={() => open(examples[1].t.build())}>
              Try the Dust II example
            </button>
          </div>
        </div>
        <LiveDemo onOpen={open} />
      </section>

      <section id="new" className="mt-10 scroll-mt-6 rounded-2xl border border-line bg-panel p-5 sm:p-7">
        <h2 className="font-display text-3xl font-semibold">Start a strat</h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="label">Map</span>
            <div className="grid grid-cols-3 gap-3">
              {MAP_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMap(id)}
                  aria-pressed={map === id}
                  className={`overflow-hidden rounded-xl border text-left transition-colors ${
                    map === id ? "border-chalk ring-1 ring-chalk" : "border-line hover:border-line-strong"
                  }`}
                >
                  <span className="block aspect-square">
                    <Board strat={previews[id]} time={null} readOnly />
                  </span>
                  <span className="block px-3 py-2 font-display text-lg font-semibold">{MAPS[id].name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6">
            <div>
              <span className="label" id="side-label">
                Side
              </span>
              <div className="seg" role="group" aria-labelledby="side-label">
                {(["T", "CT"] as Side[]).map((s) => (
                  <button key={s} type="button" onClick={() => setSide(s)} aria-pressed={side === s}>
                    <span className={`mr-2 inline-block size-2.5 rounded-full ${s === "T" ? "bg-team-t" : "bg-team-ct"}`} aria-hidden="true" />
                    {s} side
                  </button>
                ))}
              </div>
            </div>
            <div>
              <button
                type="button"
                className="btn btn-primary w-full sm:w-auto"
                onClick={() => open(createStrat(map, side, `${MAPS[map].name} ${side} strat`))}
              >
                <Plus className="size-4" /> Create {MAPS[map].name} {side} strat
              </button>
              {error && (
                <p className="mt-2 text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl font-semibold">Examples</h2>
        <p className="mt-1 text-muted">Open one to see how a full execute is laid out, then make it yours.</p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {examples.map(({ t, strat }) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => open(t.build())}
                className="flex w-full items-center gap-4 rounded-xl border border-line bg-panel p-3 text-left transition-colors hover:border-line-strong"
              >
                <span className="size-28 shrink-0 overflow-hidden rounded-lg border border-line sm:size-32">
                  <Board strat={strat} time={null} readOnly />
                </span>
                <span>
                  <span className="block font-display text-xl font-semibold">{t.name}</span>
                  <span className="mt-1 block text-sm text-muted">{t.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl font-semibold">Your strats</h2>
        <p className="mt-1 text-muted">Saved in this browser.</p>
        {strats === null ? null : strats.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-line-strong p-8 text-center">
            <p className="text-muted">Nothing saved yet. Your strats show up here as soon as you start one.</p>
            <a href="#new" className="btn mt-4">
              Start a strat
            </a>
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {strats.map((s) => (
              <li key={s.id} className="overflow-hidden rounded-xl border border-line bg-panel">
                <button type="button" onClick={() => router.push(`/edit?id=${s.id}`)} className="block w-full text-left">
                  <span className="block aspect-square border-b border-line">
                    <Board strat={s} time={null} readOnly />
                  </span>
                  <span className="block px-4 pt-3">
                    <span className="block truncate font-display text-xl font-semibold">{s.name}</span>
                    <span className="mt-1 flex items-center gap-2 text-sm text-muted">
                      <span className={`inline-block size-2.5 rounded-full ${s.side === "T" ? "bg-team-t" : "bg-team-ct"}`} aria-hidden="true" />
                      {MAPS[s.map].name}, {s.side} side
                      <span className="ml-auto">
                        {new Date(s.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </span>
                  </span>
                </button>
                <div className="flex gap-2 p-3">
                  <button
                    type="button"
                    className="btn flex-1"
                    onClick={() => {
                      saveStrat(duplicateStrat(s));
                      setStrats(listStrats());
                    }}
                  >
                    <Copy className="size-4" /> Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon text-danger"
                    aria-label={`Delete ${s.name}`}
                    title="Delete"
                    onClick={() => {
                      if (!window.confirm(`Delete "${s.name}"? This can't be undone.`)) return;
                      deleteStrat(s.id);
                      setStrats(listStrats());
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-16 border-t border-line pt-6 text-sm text-faint">
        Maps are simplified layouts drawn for planning, not official radar images. Not affiliated with Valve.
      </footer>
    </div>
  );
}
