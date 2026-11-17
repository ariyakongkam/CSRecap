"use client";

import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Board } from "@/components/board";
import { Logo } from "@/components/logo";
import { Timeline } from "@/components/timeline";
import { MAPS } from "@/lib/maps";
import { duplicateStrat } from "@/lib/strat/model";
import { decodeStrat } from "@/lib/strat/share";
import { saveStrat } from "@/lib/strat/storage";
import { UTILITY_LABEL, sceneOf, type LineupObject, type PlacedPlayer, type Strat, type UtilityObject } from "@/lib/strat/types";

/** Read-only view of a shared strat; the strat lives entirely in the URL fragment. */
export function Viewer() {
  const router = useRouter();
  const [strat, setStrat] = useState<Strat | null | undefined>(undefined);
  const [stepIndex, setStepIndex] = useState(0);
  const [time, setTime] = useState<number | null>(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const read = () => {
      setStrat(decodeStrat(window.location.hash.slice(1)));
      setStepIndex(0);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (strat === undefined) return <main className="p-8 text-muted">Loading…</main>;
  if (strat === null) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">This link doesn&apos;t contain a strategy</h1>
        <p className="mt-2 text-muted">Part of the link is probably missing. Ask whoever sent it to copy it again.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Make your own
        </Link>
      </main>
    );
  }

  const step = strat.steps[Math.min(stepIndex, strat.steps.length - 1)];
  const scene = sceneOf(strat, step);
  const roster = step.objects
    .filter((o): o is PlacedPlayer => o.kind === "player" && o.team === strat.side)
    .sort((a, b) => a.n - b.n);
  const utility = step.objects.filter((o): o is UtilityObject => o.kind === "utility").sort((a, b) => a.t - b.t);
  const lineups = step.objects.filter((o): o is LineupObject => o.kind === "lineup" && !!o.url);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-4">
        <Logo />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const copy = { ...duplicateStrat(strat), name: strat.name };
            if (saveStrat(copy)) router.push(`/edit?id=${copy.id}`);
          }}
        >
          <Copy className="size-4" /> Save a copy to edit
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-3">
          {strat.steps.length > 1 && (
            <div role="tablist" aria-label="Steps" className="flex gap-1 overflow-x-auto">
              {strat.steps.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === stepIndex}
                  onClick={() => {
                    setStepIndex(i);
                    setPlaying(false);
                    setTime(0);
                  }}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${
                    i === stepIndex ? "border-chalk bg-panel-2" : "border-line text-muted hover:text-text"
                  }`}
                >
                  <span className={`grid size-5 place-items-center rounded font-display text-xs font-bold ${i === stepIndex ? "bg-chalk text-chalk-ink" : "bg-line"}`}>
                    {i + 1}
                  </span>
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <div className="mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-200px))] overflow-hidden rounded-xl border border-line">
            <Board scene={scene} time={time} readOnly />
          </div>
          <Timeline scene={scene} time={time} onTime={setTime} playing={playing} onPlaying={setPlaying} editable={false} />
        </div>

        <aside className="space-y-5 rounded-xl border border-line bg-panel p-5">
          <div>
            <h1 className="font-display text-3xl font-semibold">{strat.name}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              <span className={`inline-block size-2.5 rounded-full ${strat.side === "T" ? "bg-team-t" : "bg-team-ct"}`} aria-hidden="true" />
              {MAPS[strat.map].name}, {strat.side} side
            </p>
          </div>
          {strat.call && (
            <div>
              <h2 className="label">When to call it</h2>
              <p className="text-sm whitespace-pre-line">{strat.call}</p>
            </div>
          )}
          {roster.length > 0 && (
            <div>
              <h2 className="label">Roles in {step.name}</h2>
              <ul className="space-y-1.5">
                {roster.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className={`grid size-6 place-items-center rounded-full text-xs font-black text-bg ${p.team === "T" ? "bg-team-t" : "bg-team-ct"}`}>
                      {p.n}
                    </span>
                    {p.role || <span className="text-faint">No role</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {utility.length > 0 && (
            <div>
              <h2 className="label">Utility order</h2>
              <ol className="space-y-1 text-sm">
                {utility.map((u) => (
                  <li key={u.id}>
                    <button type="button" className="min-h-9 hover:text-chalk" onClick={() => setTime(u.t)}>
                      <span className="text-muted tabular-nums">{u.t}s</span> {UTILITY_LABEL[u.type]}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {lineups.length > 0 && (
            <div>
              <h2 className="label">Lineups</h2>
              <ul className="space-y-1 text-sm">
                {lineups.map((l) => (
                  <li key={l.id}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-2 hover:text-chalk">
                      <ExternalLink className="size-3.5" /> {l.title || "Lineup"}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {strat.notes && (
            <div>
              <h2 className="label">Notes</h2>
              <p className="text-sm whitespace-pre-line">{strat.notes}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
