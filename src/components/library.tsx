"use client";

import { CircleHelp, Copy, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Board } from "@/components/board";
import { Logo } from "@/components/logo";
import { MAPS, MAP_IDS, type MapId } from "@/lib/maps";
import { createStrat, duplicateStrat } from "@/lib/strat/model";
import { deleteStrat, listStrats, saveStrat } from "@/lib/strat/storage";
import { sceneOf, type Side, type Strat } from "@/lib/strat/types";
import { MapCard } from "@/components/map-card";
import { Welcome } from "@/components/welcome";
import { loadPref, savePref } from "@/lib/strat/storage";

export function Library() {
  const router = useRouter();
  const [strats, setStrats] = useState<Strat[] | null>(null);
  const [map, setMap] = useState<MapId>("mirage");
  const [side, setSide] = useState<Side>("T");
  const [error, setError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    setStrats(listStrats());
    // First visit in this browser: introduce the app.
    if (!loadPref("welcomed", false, (v): v is boolean => typeof v === "boolean")) setWelcome(true);
  }, []);

  function closeWelcome() {
    savePref("welcomed", true);
    setWelcome(false);
  }

  function open(s: Strat) {
    if (!saveStrat(s)) {
      setError("Your browser didn't let us save. Storage is full or blocked, for example in a private window.");
      return;
    }
    router.push(`/edit?id=${s.id}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <div className="flex items-center gap-1">
          <a href="#new" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted hover:text-text">
            New strat
          </a>
          <button type="button" className="btn btn-icon border-transparent bg-transparent" onClick={() => setWelcome(true)} aria-label="What can I do here?" title="What can I do here?">
            <CircleHelp className="size-5" />
          </button>
        </div>
      </header>
      <Welcome
        open={welcome}
        onClose={closeWelcome}
        onBlank={() => {
          closeWelcome();
          open(createStrat("mirage", "T", "Mirage T strat"));
        }}
      />

      <section id="new" className="mt-4 scroll-mt-6 rounded-2xl border border-line bg-panel p-5 sm:p-7">
        <h1 className="font-display text-4xl font-semibold">Start a strat</h1>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="label">Map</span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MAP_IDS.map((id) => (
                <MapCard key={id} id={id} selected={map === id} onClick={() => setMap(id)} />
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
                    <Board scene={sceneOf(s, s.steps[0])} time={null} readOnly />
                  </span>
                  <span className="block px-4 pt-3">
                    <span className="block truncate font-display text-xl font-semibold">{s.name}</span>
                    <span className="block text-sm text-muted">
                      {s.steps.length} {s.steps.length === 1 ? "step" : "steps"}
                    </span>
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
        Map radar overviews and screenshots are © Valve Corporation. csgg is not affiliated with or endorsed by Valve.
      </footer>
    </main>
  );
}
