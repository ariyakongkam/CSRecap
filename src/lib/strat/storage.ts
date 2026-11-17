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

export function deleteStrat(id: string): void {
  const all = readAll();
  delete all[id];
  writeAll(all);
}
