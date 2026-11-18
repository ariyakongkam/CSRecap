"use client";

import { ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import type { Step } from "@/lib/strat/types";

/**
 * The strat's sequence: one tab per step, in order. Actions apply to the
 * open step: move it earlier or later, continue from it, or delete it.
 */
export function StepBar({
  steps,
  current,
  onSelect,
  onAdd,
  onContinue,
  onMove,
  onRename,
  onDelete,
}: {
  steps: Step[];
  current: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onContinue: () => void;
  onMove: (dir: -1 | 1) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const step = steps[current];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Steps" className="flex min-w-0 basis-full gap-1 overflow-x-auto md:flex-1 md:basis-0">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-current={i === current ? "step" : undefined}
            onClick={() => onSelect(i)}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
              i === current ? "border-chalk bg-panel-2 text-text" : "border-line text-muted hover:border-line-strong hover:text-text"
            }`}
          >
            <span className={`grid size-5 place-items-center rounded font-display text-xs font-bold ${i === current ? "bg-chalk text-chalk-ink" : "bg-line"}`}>
              {i + 1}
            </span>
            <span className="max-w-36 truncate">{s.name}</span>
          </button>
        ))}
        <button type="button" onClick={onAdd} className="btn shrink-0" title="Add an empty step">
          <Plus className="size-4" /> <span className="hidden sm:inline">Add step</span>
        </button>
      </div>

      <div className="flex w-full items-center gap-1 md:w-auto" aria-label={`Actions for step ${current + 1}`}>
        <label className="sr-only" htmlFor="step-name">
          Step name
        </label>
        <input
          id="step-name"
          className="field !min-h-11 min-w-0 flex-1 md:w-36 md:flex-none"
          value={step.name}
          maxLength={40}
          onChange={(e) => onRename(e.target.value)}
        />
        <button type="button" className="btn btn-icon" onClick={() => onMove(-1)} disabled={current === 0} title="Move step earlier" aria-label="Move step earlier">
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => onMove(1)}
          disabled={current === steps.length - 1}
          title="Move step later"
          aria-label="Move step later"
        >
          <ChevronRight className="size-4" />
        </button>
        <button type="button" className="btn btn-icon" onClick={onContinue} title="Next step from here: players start where this step ends" aria-label="Continue in a new step">
          <Copy className="size-4" />
        </button>
        <button
          type="button"
          className="btn btn-icon text-danger"
          onClick={onDelete}
          disabled={steps.length === 1}
          title="Delete this step"
          aria-label="Delete this step"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
