import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { compact, parseStrat } from "./model";
import type { Strat } from "./types";

/**
 * Share links carry the whole strat in the URL fragment (after #), so no
 * server stores it and the fragment is never sent to one.
 */
export function encodeStrat(strat: Strat): string {
  return compressToEncodedURIComponent(JSON.stringify(compact(strat)));
}

export function decodeStrat(encoded: string): Strat | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    return parseStrat(JSON.parse(json));
  } catch {
    return null;
  }
}

export function shareUrl(origin: string, strat: Strat): string {
  return `${origin}/view#${encodeStrat(strat)}`;
}

/**
 * An invite to edit: opens the strat in the other person's own planner, under the same id,
 * so when they send their link back you can update your version with their changes.
 */
export function inviteUrl(origin: string, strat: Strat): string {
  return `${origin}/join#${encodeStrat(strat)}`;
}
