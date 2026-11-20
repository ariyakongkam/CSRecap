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

/**
 * Told about every save and delete, so a signed-in player's account can follow along (see cloud.ts).
 * Writes that come from the account itself (writeFromCloud) don't call it.
 */
export interface SyncHook {
  saved: (strats: Strat[]) => void;
  deleted: (id: string) => void;
}
let hook: SyncHook | null = null;
export function setSyncHook(h: SyncHook | null): void {
  hook = h;
}

/** Saves a strat; false when the browser refused (storage full or blocked). */
export function saveStrat(strat: Strat): boolean {
  const all = readAll();
  const saved = compact({ ...strat, updatedAt: new Date().toISOString() });
  all[strat.id] = saved;
  const ok = writeAll(all);
  if (ok) hook?.saved([saved]);
  return ok;
}

/** Saves several strats in one write (imports); false when the browser refused. */
export function saveStrats(list: Strat[]): boolean {
  const all = readAll();
  const now = new Date().toISOString();
  const saved = list.map((s) => compact({ ...s, updatedAt: now }));
  for (const s of saved) all[s.id] = s;
  const ok = writeAll(all);
  if (ok) hook?.saved(saved);
  return ok;
}

export function deleteStrat(id: string): void {
  const all = readAll();
  delete all[id];
  writeAll(all);
  hook?.deleted(id);
}

/** Applies changes that came from the player's account, keeping their own save times. */
export function writeFromCloud(save: Strat[], remove: string[]): boolean {
  const all = readAll();
  for (const s of save) all[s.id] = compact(s);
  for (const id of remove) delete all[id];
  return writeAll(all);
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
