import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { backupCopy, compact, parseStrat, sameContent } from "./model";
import type { Strat } from "./types";

/**
 * Several strats in one package: a backup of everything, or one playbook to share.
 * The same format is used for files (JSON) and for playbook links (compressed, after #).
 */
export interface Bundle {
  kind: "backup" | "playbook";
  /** The playbook's name (empty for a backup). */
  name: string;
  strats: Strat[];
}

const APP = "radstrat";
const MAX_STRATS = 500;
/** Files bigger than this are refused before reading (a backup of hundreds of strats is far smaller). */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

function toPlain(b: Bundle) {
  return { app: APP, v: 1, kind: b.kind, name: b.name, exportedAt: new Date().toISOString(), strats: b.strats.map(compact) };
}

/** Reads a bundle from untrusted data: every strat goes through parseStrat; anything else is dropped. */
export function parseBundle(raw: unknown): Bundle | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.app !== APP || !Array.isArray(o.strats)) return null;
  const strats = o.strats
    .slice(0, MAX_STRATS)
    .map(parseStrat)
    .filter((s): s is Strat => s !== null);
  if (strats.length === 0) return null;
  return { kind: o.kind === "playbook" ? "playbook" : "backup", name: typeof o.name === "string" ? o.name.slice(0, 40) : "", strats };
}

export function bundleToFile(b: Bundle): string {
  return JSON.stringify(toPlain(b), null, 1);
}

export function bundleFromFile(text: string): Bundle | null {
  try {
    return parseBundle(JSON.parse(text));
  } catch {
    return null;
  }
}

export function playbookUrl(origin: string, b: Bundle): string {
  return `${origin}/playbook#${compressToEncodedURIComponent(JSON.stringify(toPlain(b)))}`;
}

export function bundleFromHash(hash: string): Bundle | null {
  try {
    const json = decompressFromEncodedURIComponent(hash);
    return json ? parseBundle(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}

export function fileName(b: Bundle): string {
  const day = new Date().toISOString().slice(0, 10);
  if (b.kind === "backup") return `radstrat-backup-${day}.json`;
  const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "playbook";
  return `radstrat-playbook-${slug}.json`;
}

export interface MergePlan {
  /** Strats you don't have yet. */
  add: Strat[];
  /** Strats you have in another version: theirs replaces yours, and yours is kept as a copy. */
  update: { incoming: Strat; mine: Strat }[];
  /** Strats you already have exactly like this. */
  same: Strat[];
}

/** What importing a bundle would do, given the strats already saved (matched by id). */
export function planMerge(incoming: Strat[], mine: (id: string) => Strat | null): MergePlan {
  const plan: MergePlan = { add: [], update: [], same: [] };
  for (const s of incoming) {
    const existing = mine(s.id);
    if (!existing) plan.add.push(s);
    else if (sameContent(existing, s)) plan.same.push(s);
    else plan.update.push({ incoming: s, mine: existing });
  }
  return plan;
}

/** The strats to save to carry out a plan: new ones, updated ones, and a copy of each replaced version. */
export function stratsToSave(plan: MergePlan): Strat[] {
  return [...plan.add, ...plan.update.flatMap(({ incoming, mine }) => [backupCopy(mine), incoming])];
}
