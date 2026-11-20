import { compact, parseStrat } from "./model";
import type { Strat } from "./types";

/**
 * The strat library lives in this browser (localStorage). Every read and
 * write is wrapped: storage can be full, blocked or missing.
 */
const KEY = "execute:strats:v1";

function readAll(): Record<string, unknown> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, unknown>): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

export function listStrats(): Strat[] {
  return Object.values(readAll())
    .map(parseStrat)
    .filter((s): s is Strat => s !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function loadStrat(id: string): Strat | null {
  return parseStrat(readAll()[id]);
}

/** Saves a strat; false when the browser refused (storage full or blocked). */
export function saveStrat(strat: Strat): boolean {
  const all = readAll();
  all[strat.id] = compact({ ...strat, updatedAt: new Date().toISOString() });
  return writeAll(all);
}

/** Saves several strats in one write (imports); false when the browser refused. */
export function saveStrats(list: Strat[]): boolean {
  const all = readAll();
  const now = new Date().toISOString();
  for (const s of list) all[s.id] = compact({ ...s, updatedAt: now });
  return writeAll(all);
}

export function deleteStrat(id: string): void {
  const all = readAll();
  delete all[id];
  writeAll(all);
}

// ---------- small UI preferences (last tool, pen colour, open step per strat) ----------

const PREFS_KEY = "execute:prefs:v1";

export function loadPref<T>(key: string, fallback: T, valid: (v: unknown) => v is T): T {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    const v = all?.[key];
    return valid(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: unknown): void {
  try {
    const all = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") ?? {};
    all[key] = value;
    localStorage.setItem(PREFS_KEY, JSON.stringify(all));
  } catch {
    /* preferences are a convenience; ignore */
  }
}
