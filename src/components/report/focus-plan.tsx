"use client";

import { ArrowRight, Check, Target } from "lucide-react";
import { useEffect, useState } from "react";
import type { FocusPlan } from "@/lib/analysis/types";

/**
 * "Your next focus": one goal, a measurable target and three tasks the player
 * can tick off. Ticks live in this browser only (per player + goal); real
 * progress tracking comes later with accounts.
 */
export function FocusPlanCard({ plan, playerId }: { plan: FocusPlan; playerId: string }) {
  const storageKey = `csrecap:focus:${playerId}:${plan.goal}`;
  const [done, setDone] = useState<boolean[]>(() => plan.tasks.map(() => false));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (Array.isArray(saved) && saved.length === plan.tasks.length) setDone(saved.map(Boolean));
    } catch {
      /* storage unavailable: ticks just won't persist */
    }
  }, [storageKey, plan.tasks.length]);

  function toggle(i: number) {
    setDone((prev) => {
      const next = prev.map((d, j) => (j === i ? !d : d));
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const completed = done.filter(Boolean).length;

  return (
    <section aria-labelledby="focus-heading" className="relative overflow-hidden rounded-2xl border border-accent/25 bg-surface">
      <div className="glow-accent pointer-events-none absolute -right-32 -bottom-40 size-[420px]" aria-hidden="true" />
      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p id="focus-heading" className="flex items-center gap-2 text-xs font-medium tracking-widest text-accent uppercase">
            <Target className="size-4" aria-hidden="true" /> Your next focus
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight font-bold text-balance sm:text-4xl">{plan.goal}</h2>
          <p className="mt-3 text-pretty text-muted">{plan.why}</p>

          {plan.target && (
            <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-xl border border-line-strong bg-surface-2 px-4 py-3">
              <span className="text-xs text-faint">{plan.target.metric}</span>
              <span className="tabular font-display text-xl font-bold text-muted">{plan.target.current}</span>
              <ArrowRight className="size-4 text-faint" aria-hidden="true" />
              <span className="tabular font-display text-xl font-bold text-accent">{plan.target.goal}</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold">Over your next matches</h3>
            <span className="tabular text-xs text-faint">
              {completed}/{plan.tasks.length} done
            </span>
          </div>
          <ol className="mt-3 space-y-2.5">
            {plan.tasks.map((task, i) => (
              <li key={task}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={done[i]}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                    done[i] ? "border-accent/30 bg-accent/[0.06]" : "border-line bg-surface-2/60 hover:border-line-strong"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition ${
                      done[i] ? "border-accent bg-accent text-accent-ink" : "border-line-strong"
                    }`}
                    aria-hidden="true"
                  >
                    {done[i] && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className={`text-sm leading-relaxed ${done[i] ? "text-muted line-through decoration-faint" : "text-text/90"}`}>
                    {task}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
