"use client";

import { Bomb, Cloud, Eye, Flame, Footprints, Pause, Play, RotateCcw, Type, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { stratDuration, timelineEvents, type TimelineEvent } from "@/lib/strat/timeline";
import type { Scene } from "@/lib/strat/types";

/** A CS2 round lasts 1:55 after freeze time. */
const ROUND_SECONDS = 115;

export function roundClock(t: number): string {
  const left = Math.max(0, Math.ceil(ROUND_SECONDS - t));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

function EventIcon({ e }: { e: TimelineEvent }) {
  const c = "size-3.5";
  if (e.kind === "route") return <Footprints className={c} />;
  if (e.kind === "text") return <Type className={c} />;
  if (e.kind === "bomb") return <Bomb className={c} />;
  if (e.label === "smoke") return <Cloud className={c} />;
  if (e.label === "flash") return <Zap className={c} />;
  if (e.label === "molotov") return <Flame className={c} />;
  return <Bomb className={c} />;
}

export interface TimelineProps {
  scene: Scene;
  time: number | null;
  onTime: (t: number | null) => void;
  playing: boolean;
  onPlaying: (p: boolean) => void;
  onSelectEvent?: (id: string) => void;
  /** Shows the "show everything" button that returns to the editing view. */
  editable?: boolean;
}

/** Round-clock scrubber: play the plan, scrub to a moment, or go back to the editing view. */
export function Timeline({ scene, time, onTime, playing, onPlaying, onSelectEvent, editable = true }: TimelineProps) {
  const max = Math.max(20, stratDuration(scene) + 3);
  const events = timelineEvents(scene);
  const last = useRef<number | null>(null);
  const timeRef = useRef(time);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(600);

  // Markers are placed in pixels so they never overlap, whatever the track's width.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setTrackWidth(entry.contentRect.width || 600));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    timeRef.current = time;
  }, [time]);

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
      timeRef.current = next;
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
    if (time === null || time >= max) {
      timeRef.current = 0;
      onTime(0);
    }
    onPlaying(true);
  }

  const shown = time ?? 0;
  // One marker per kind of event per second ("3 moves at 2s"); overlapping kinds go on a second row.
  const groups = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const k = `${e.kind === "utility" ? e.label : e.kind}@${Math.round(e.t)}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  // Greedy packing: each marker takes the first row where it clears the previous one by 30px.
  const rowEnds: number[] = [];
  const placed = [...groups.values()]
    .sort((a, b) => a[0].t - b[0].t)
    .map((group) => {
      const e = group[0];
      let x = (e.t / max) * trackWidth;
      let row = rowEnds.findIndex((end) => x - end >= 30);
      if (row === -1) {
        if (rowEnds.length < 2) row = rowEnds.length;
        else {
          row = rowEnds[0] <= rowEnds[1] ? 0 : 1;
          x = rowEnds[row] + 30; // both rows full here: slide right
        }
      }
      rowEnds[row] = x;
      return { e, count: group.length, row, x };
    });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-panel px-3 py-2.5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={togglePlay} className="btn btn-primary min-w-24" aria-label={playing ? "Pause" : "Play the plan"}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            onPlaying(false);
            onTime(0);
          }}
          className="btn btn-icon"
          aria-label="Back to the start of the round"
          title="Back to the start"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      <div className="w-20 leading-none" aria-live="off">
        <div className={`font-display text-3xl font-semibold tabular-nums ${time === null ? "text-faint" : ""}`}>{roundClock(shown)}</div>
        <div className="mt-1 text-xs text-muted">{time === null ? "Editing view" : `${shown.toFixed(1)}s in`}</div>
      </div>

      <div className="relative order-last min-w-48 basis-full pt-11 pb-1 md:order-none md:basis-auto md:flex-1">
        <div ref={trackRef} className="absolute inset-x-2 top-0 h-10">
          {placed.map(({ e, count, row, x }) => {
            const active = time !== null && Math.abs(time - e.t) < 0.6;
            return (
              <button
                key={e.id}
                type="button"
                title={count > 1 ? `${e.t}s: ${count} ${e.kind === "route" ? "players move" : `${e.label}s`}` : `${e.t}s: ${e.label}`}
                aria-label={`Jump to ${e.t}s: ${count > 1 ? `${count} events` : e.label}`}
                onClick={() => {
                  onPlaying(false);
                  onTime(e.t);
                  onSelectEvent?.(e.id);
                }}
                className={`absolute grid size-6 -translate-x-1/2 place-items-center rounded-full border transition-colors ${
                  active ? "border-chalk bg-chalk text-chalk-ink" : "border-line-strong bg-bg text-muted hover:text-text"
                }`}
                style={{ left: x, top: row * 22 }}
              >
                <EventIcon e={e} />
                {count > 1 && (
                  <span className="absolute -top-1.5 -right-2 grid size-4 place-items-center rounded-full bg-chalk font-display text-[10px] font-bold text-chalk-ink">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
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
          aria-valuetext={`${shown.toFixed(1)} seconds into the round`}
          className="w-full accent-[var(--chalk)]"
        />
      </div>

      {editable && (
        <button
          type="button"
          onClick={() => {
            onPlaying(false);
            onTime(null);
          }}
          disabled={time === null}
          className="btn"
          title="Show every object at once, for editing"
        >
          <Eye className="size-4" />
          <span className="hidden sm:inline">Show all</span>
        </button>
      )}
    </div>
  );
}
