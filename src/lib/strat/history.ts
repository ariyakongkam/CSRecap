import type { Strat } from "./types";

/** Undo/redo stacks around the strat being edited. Pure, so it's easy to test. */
export interface History {
  present: Strat;
  past: Strat[];
  future: Strat[];
}

const LIMIT = 100;

export function initHistory(strat: Strat): History {
  return { present: strat, past: [], future: [] };
}

/** A finished change: the old state becomes undoable. */
export function commit(h: History, next: Strat): History {
  if (next === h.present) return h;
  return { present: next, past: [...h.past, h.present].slice(-LIMIT), future: [] };
}

/**
 * Marks the current state as an undo point before a live change (a drag or
 * a stroke), so the whole gesture undoes in one step.
 */
export function checkpoint(h: History): History {
  return { present: h.present, past: [...h.past, h.present].slice(-LIMIT), future: [] };
}

/** A change in the middle of a gesture: no new undo point. */
export function live(h: History, next: Strat): History {
  return { ...h, present: next };
}

export function undo(h: History): History {
  const prev = h.past.at(-1);
  if (!prev) return h;
  return { present: prev, past: h.past.slice(0, -1), future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  const next = h.future[0];
  if (!next) return h;
  return { present: next, past: [...h.past, h.present], future: h.future.slice(1) };
}
