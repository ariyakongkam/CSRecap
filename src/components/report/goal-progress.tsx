"use client";

import { LineChart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatTarget } from "@/lib/analysis/format";
import {
  measureProgress,
  parseTrackedGoal,
  startTracking,
  type ProgressData,
  type ProgressStatus,
  type TrackedGoal,
} from "@/lib/analysis/progress";
import type { FocusPlan } from "@/lib/analysis/types";

const STATUS: Record<ProgressStatus, { label: string; className: string }> = {
  reached: { label: "Goal reached", className: "border-good/30 bg-good/10 text-good" },
  improving: { label: "Improving", className: "border-accent/30 bg-accent/10 text-accent" },
  holding: { label: "Holding steady", className: "border-line-strong bg-surface-2 text-muted" },
  slipping: { label: "Slipping", className: "border-bad/30 bg-bad/10 text-bad" },
  waiting: { label: "Waiting for matches", className: "border-line-strong bg-surface-2 text-faint" },
};

const VERDICT: Record<Exclude<ProgressStatus, "waiting">, string> = {
  reached: "You've hit your target. Keep it there for a few more matches, then pick your next focus.",
  improving: "Moving the right way. Keep doing the tasks below.",
  holding: "No real change yet. Stick with the tasks for a few more matches.",
  slipping: "Going the wrong way so far. Check which task you've been skipping.",
};

function storageKey(playerId: string) {
  return `csrecap:tracking:${playerId}`;
}

function readTracked(playerId: string): TrackedGoal | null {
  try {
    return parseTrackedGoal(JSON.parse(localStorage.getItem(storageKey(playerId)) ?? "null"), playerId);
  } catch {
    return null;
  }
}

function writeTracked(playerId: string, goal: TrackedGoal | null) {
  try {
    if (goal) localStorage.setItem(storageKey(playerId), JSON.stringify(goal));
    else localStorage.removeItem(storageKey(playerId));
  } catch {
    /* storage unavailable: tracking just won't persist */
  }
}

/**
 * Lets the player track their focus goal and, on later visits, shows how
 * they've done since. The starting point lives in this browser; the
 * measurement comes from fresh FACEIT data.
 */
export function GoalProgress({ plan, data }: { plan: FocusPlan; data: ProgressData }) {
  const playerId = data.profile.id;
  const [tracked, setTracked] = useState<TrackedGoal | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTracked(readTracked(playerId));
    setReady(true);
  }, [playerId]);

  // Storage is only readable after hydration; render nothing until then so server and client agree.
  if (!ready) return null;

  function track() {
    const goal = startTracking(plan, data);
    writeTracked(playerId, goal);
    setTracked(goal);
  }

  function stop() {
    writeTracked(playerId, null);
    setTracked(null);
  }

  if (!tracked) {
    if (!plan.target) return null;
    return (
      <div className="mt-5">
        <button
          type="button"
          onClick={track}
          className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
        >
          <LineChart className="size-4" aria-hidden="true" /> Track this goal
        </button>
        <p className="mt-2 max-w-sm text-xs text-faint">
          Saved in this browser. Come back after a few matches to see whether it&apos;s working.
        </p>
      </div>
    );
  }

  const progress = measureProgress(tracked, data);
  const { target } = tracked;
  const status = STATUS[progress.status];
  const isCurrentGoal = tracked.goal === plan.goal;
  const started = new Date(tracked.since).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="mt-5 rounded-xl border border-line-strong bg-surface-2/70 p-4" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-faint uppercase">
            {isCurrentGoal ? "Your progress" : `Previous goal: ${tracked.goal}`}
          </p>
          <p className="mt-0.5 text-xs text-faint">
            Since {started} · {progress.matchesSince} match{progress.matchesSince === 1 ? "" : "es"}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      {progress.status === "waiting" ? (
        <p className="mt-3 text-sm text-muted">
          {progress.evidence.count} of {progress.evidence.needed} {progress.evidence.unit} played since you started.
          Play a few more and check back.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="tabular font-display text-2xl font-bold">{formatTarget(target.key, progress.value!)}</span>
            <span className="text-sm text-muted">{target.metric.replace(/^Recent /, "")} since you started</span>
          </div>
          <div className="mt-3" aria-hidden="true">
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full ${progress.status === "slipping" ? "bg-bad" : "bg-accent"}`}
                style={{ width: `${Math.max(progress.towardGoal * 100, 2)}%` }}
              />
            </div>
            <div className="tabular mt-1 flex justify-between text-xs text-faint">
              <span>Start {target.current}</span>
              <span>Goal {target.goal}</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">
            {VERDICT[progress.status]}
            {progress.early &&
              ` Early read: only ${progress.evidence.count} ${progress.evidence.unit} so far, so expect it to move.`}
          </p>
        </>
      )}

      {progress.windowFull && (
        <p className="mt-2 text-xs text-faint">Counting your last {progress.matchesSince} matches, the most FACEIT shows here.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {!isCurrentGoal && plan.target && (
          <button type="button" onClick={track} className="font-medium text-accent hover:underline">
            Track &ldquo;{plan.goal}&rdquo; instead
          </button>
        )}
        <button type="button" onClick={stop} className="inline-flex items-center gap-1 text-faint hover:text-muted">
          <X className="size-3" aria-hidden="true" /> Stop tracking
        </button>
      </div>
    </div>
  );
}
