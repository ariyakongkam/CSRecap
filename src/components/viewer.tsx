"use client";

import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Board } from "@/components/board";
import { CalloutToggle } from "@/components/callout-toggle";
import { Logo } from "@/components/logo";
import { PhaseBar, phaseDuration } from "@/components/phase-bar";
import { MAPS } from "@/lib/maps";
import { duplicateStrat } from "@/lib/strat/model";
import { decodeStrat } from "@/lib/strat/share";
import { stratDuration } from "@/lib/strat/timeline";
import { saveStrat } from "@/lib/strat/storage";
import { UTILITY_LABEL, sceneOf, type LineupObject, type PlacedPlayer, type Strat, type UtilityObject } from "@/lib/strat/types";

/** Read-only view of a shared strat; the strat lives entirely in the URL fragment. */
export function Viewer() {
  const router = useRouter();
  const [strat, setStrat] = useState<Strat | null | undefined>(undefined);
  const [stepIndex, setStepIndex] = useState(0);
  const [time, setTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [callouts, setCallouts] = useState(false);

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
        <Link href="/app" className="btn btn-primary mt-6">
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
    <main className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
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
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-3xl leading-tight font-semibold break-words">{strat.name}</h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                <span className={`inline-block size-2.5 rounded-full ${strat.side === "T" ? "bg-team-t" : "bg-team-ct"}`} aria-hidden="true" />
                {MAPS[strat.map].name}, {strat.side} side
              </p>
            </div>
            <CalloutToggle on={callouts} onChange={setCallouts} />
          </div>
          <div className="mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-200px))] overflow-hidden rounded-xl border border-line">
            <Board scene={scene} time={time} readOnly callouts={callouts} />
          </div>
          <PhaseBar
            steps={strat.steps}
            current={step === strat.steps[stepIndex] ? stepIndex : 0}
            durations={strat.steps.map((st) => phaseDuration(stratDuration(sceneOf(strat, st))))}
            time={time}
            playing={playing}
            onSelect={(i) => {
              setStepIndex(i);
              setPlaying(false);
              setTime(null);
            }}
            onAdvance={setStepIndex}
            onTime={setTime}
            onPlay={() => {
              setStepIndex(0);
              setTime(0);
              setPlaying(true);
            }}
            onStop={() => {
              setPlaying(false);
              setTime(null);
            }}
          />
          {step.note && (
            <section aria-label={`Plan for ${step.name}`} className="rounded-xl border border-line bg-panel p-4">
              <h2 className="label">Plan for {step.name}</h2>
              <p className="text-sm whitespace-pre-line">{step.note}</p>
            </section>
          )}
        </div>

        {(strat.call || strat.notes || roster.length > 0 || utility.length > 0 || lineups.length > 0) && (
        <aside className="space-y-5 rounded-xl border border-line bg-panel p-5">
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
              <h2 className="label">Utility in {step.name}</h2>
              <ol className="space-y-1 text-sm">
                {utility.map((u) => {
                  const by = u.from ? step.objects.find((o): o is PlacedPlayer => o.kind === "player" && o.id === u.from) : undefined;
                  return (
                    <li key={u.id}>
                      {UTILITY_LABEL[u.type]}
                      {by && (
                        <span className="text-muted">
                          {" "}
                          thrown by {by.n}
                          {by.role ? ` (${by.role})` : ""}
                        </span>
                      )}
                    </li>
                  );
                })}
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
        )}
      </div>
    </main>
  );
}
