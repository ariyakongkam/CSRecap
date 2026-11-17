"use client";

import { Pause, Play, RotateCcw, PencilRuler } from "lucide-react";
import { useEffect, useRef } from "react";
import { stratDuration, timelineEvents } from "@/lib/strat/timeline";
import type { Strat } from "@/lib/strat/types";

const EVENT_COLOR: Record<string, string> = {
  route: "var(--muted)",
  utility: "var(--smoke)",
  text: "var(--accent)",
};

export interface TimelineProps {
  strat: Strat;
  time: number | null;
  onTime: (t: number | null) => void;
  playing: boolean;
  onPlaying: (p: boolean) => void;
  onSelectEvent?: (id: string) => void;
  /** Hides the "back to editing" button on read-only views. */
  editable?: boolean;
}

/** Round-clock scrubber: play the plan, scrub to a moment, or go back to the editing view. */
export function Timeline({ strat, time, onTime, playing, onPlaying, onSelectEvent, editable = true }: TimelineProps) {
  const max = Math.max(20, stratDuration(strat) + 3);
  const events = timelineEvents(strat);
  const last = useRef<number | null>(null);
  const timeRef = useRef(time);
  timeRef.current = time;

  useEffect(() => {
    if (!playing) {
      last.current = null;
      return;
    }
    let frame = 0;
    const tick = (now: number) => {
      const dt = last.current === null ? 0 : (now - last.current) / 1000;
      last.current = now;
      const next = (timeRef.current ?? 0) + dt;
      if (next >= max) {
        onTime(max);
        onPlaying(false);
        return;
      }
      onTime(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, max, onTime, onPlaying]);

  function togglePlay() {
    if (playing) return onPlaying(false);
    if (time === null || time >= max) onTime(0);
    onPlaying(true);
  }

  const shown = time ?? 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2">
      <button type="button" onClick={togglePlay} className="btn btn-primary !px-3" aria-label={playing ? "Pause" : "Play the plan"}>
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        <span className="hidden sm:inline">{playing ? "Pause" : "Play"}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onPlaying(false);
          onTime(0);
        }}
        className="btn !px-2.5"
        aria-label="Back to the start of the round"
        title="Back to 0s"
      >
        <RotateCcw className="size-4" />
      </button>

      <div className="relative flex-1 py-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2">
          {events.map((e) => (
            <button
              key={e.id}
              type="button"
              title={`${e.t}s · ${e.label}`}
              onClick={() => {
                onPlaying(false);
                onTime(e.t);
                onSelectEvent?.(e.id);
              }}
              className="pointer-events-auto absolute top-0 h-2.5 w-1.5 -translate-x-1/2 rounded-full"
              style={{ left: `${(e.t / max) * 100}%`, background: EVENT_COLOR[e.kind] }}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={max}
          step={0.1}
          value={shown}
          onChange={(e) => {
            onPlaying(false);
            onTime(Number(e.target.value));
          }}
          aria-label="Round time"
          className="w-full accent-[var(--accent)]"
        />
      </div>

      <span className="tabular-nums w-14 text-right text-sm font-semibold">{time === null ? "all" : `${shown.toFixed(1)}s`}</span>

      {editable && (
        <button
          type="button"
          onClick={() => {
            onPlaying(false);
            onTime(null);
          }}
          disabled={time === null}
          className="btn !px-2.5"
          title="Show everything (editing view)"
          aria-label="Show everything"
        >
          <PencilRuler className="size-4" />
        </button>
      )}
    </div>
  );
}
