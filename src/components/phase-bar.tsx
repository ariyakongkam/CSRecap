"use client";

import { ChevronLeft, ChevronRight, Play, Plus, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CarryOver } from "@/lib/strat/model";
import type { Step } from "@/lib/strat/types";

export interface PhaseBarProps {
  steps: Step[];
  current: number;
  /** How long each phase plays, in seconds (its routes, plus a short hold). */
  durations: number[];
  /** Seconds into the current phase while playing; null = editing view. */
  time: number | null;
  playing: boolean;
  /** The person picked a phase. */
  onSelect: (i: number) => void;
  /** Playback moved on to the next phase. */
  onAdvance: (i: number) => void;
  onTime: (t: number) => void;
  onPlay: () => void;
  onStop: () => void;
  /** Editing; leave out for the read-only view. */
  /** Adds the next phase, bringing everything or only the players (and bomb). */
  onAdd?: (carry: CarryOver) => void;
  onRename?: (name: string) => void;
  onMove?: (dir: -1 | 1) => void;
  onDelete?: () => void;
}

/**
 * Phases of the round (default, execute, post-plant …): pick one to edit it, add the next one
 * (it starts with everything already placed), and play them all in order.
 */
export function PhaseBar(props: PhaseBarProps) {
  const { steps, current, playing, time, durations, onSelect, onPlay, onStop, onAdd, onRename, onMove, onDelete } = props;
  const editable = !!onAdd;
  const live = useRef(props);
  live.current = props;

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last: number | null = null;
    let phase = live.current.current;
    let t = live.current.time ?? 0;
    const tick = (now: number) => {
      const p = live.current;
      t += last === null ? 0 : (now - last) / 1000;
      last = now;
      if (t >= (p.durations[phase] ?? 1.5)) {
        if (phase >= p.steps.length - 1) {
          p.onStop();
          return;
        }
        phase += 1;
        t = 0;
        p.onAdvance(phase);
      }
      p.onTime(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const step = steps[current];
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);
  const add = (carry: CarryOver) => {
    setMenu(false);
    onAdd?.(carry);
  };
  const progress = playing && time !== null ? Math.min(1, time / (durations[current] || 1)) : 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-2.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={playing ? onStop : onPlay}
          className="btn btn-primary min-w-24 shrink-0"
          aria-label={playing ? "Stop" : "Play all phases"}
          title={playing ? "Stop (Space)" : "Play all phases (Space)"}
        >
          {playing ? <Square className="size-4" /> : <Play className="size-4" />}
          {playing ? "Stop" : "Play"}
        </button>

        <div role="group" aria-label="Phases" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-current={i === current ? "step" : undefined}
              onClick={() => onSelect(i)}
              className={`relative flex min-h-11 shrink-0 items-center gap-2 overflow-hidden rounded-lg border px-3 text-sm font-medium transition-colors ${
                i === current ? "border-chalk bg-panel-2 text-text" : "border-line text-muted hover:border-line-strong hover:text-text"
              }`}
            >
              <span className={`grid size-5 place-items-center rounded font-display text-xs font-bold ${i === current ? "bg-chalk text-chalk-ink" : "bg-line"}`}>
                {i + 1}
              </span>
              <span className="max-w-36 truncate">{s.name}</span>
              {i === current && playing && (
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-chalk" style={{ transform: `scaleX(${progress})` }} />
              )}
            </button>
          ))}
        </div>

        {editable && (
          <div ref={menuRef} className="relative shrink-0">
            <button type="button" onClick={() => setMenu((m) => !m)} className="btn" aria-expanded={menu} aria-controls="new-phase-menu">
              <Plus className="size-4" />
              <span className="max-sm:hidden">New phase</span>
              <span className="sr-only sm:hidden">New phase</span>
            </button>
            {menu && (
              <div
                id="new-phase-menu"
                className="absolute right-0 bottom-full z-30 mb-2 w-72 space-y-1 rounded-xl border border-line bg-bg p-1.5 shadow-2xl"
              >
                <button type="button" className="flex min-h-11 w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-panel-2" onClick={() => add("all")}>
                  <span className="font-medium">Keep everything</span>
                  <span className="text-sm text-muted">Players, grenades, enemies, markers and notes come along.</span>
                </button>
                <button type="button" className="flex min-h-11 w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-panel-2" onClick={() => add("players")}>
                  <span className="font-medium">Players and bomb only</span>
                  <span className="text-sm text-muted">A clean board: your team, enemies and the bomb. Good for the post-plant.</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {playing ? `Playing phase ${current + 1} of ${steps.length}: ${step.name}` : ""}
      </p>

      {editable && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
          <label className="sr-only" htmlFor="phase-name">
            Name of phase {current + 1}
          </label>
          <input
            id="phase-name"
            className="field !min-h-11 min-w-0 basis-full sm:max-w-56 sm:flex-1 sm:basis-0"
            value={step.name}
            maxLength={40}
            placeholder={`Phase ${current + 1}`}
            onChange={(e) => onRename?.(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => onMove?.(-1)}
            disabled={current === 0}
            title="Move this phase earlier"
            aria-label={`Move phase ${current + 1} earlier`}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => onMove?.(1)}
            disabled={current === steps.length - 1}
            title="Move this phase later"
            aria-label={`Move phase ${current + 1} later`}
          >
            <ChevronRight className="size-4" />
          </button>
          <button type="button" className="btn ml-auto text-danger" onClick={onDelete} disabled={steps.length === 1} title="You can undo this with Ctrl+Z">
            <Trash2 className="size-4" />
            Delete phase {current + 1}
          </button>
        </div>
      )}
    </div>
  );
}

/** How long a phase plays: until its last route ends, with a short hold so each phase can be seen. */
export function phaseDuration(routesEnd: number): number {
  return Math.max(1.5, routesEnd + 1);
}
