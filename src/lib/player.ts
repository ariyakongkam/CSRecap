import "server-only";

import { cache } from "react";
import { analyzePlayer, type PlayerReport } from "@/lib/analysis";
import { lookupPlayer, type LookupError } from "@/lib/faceit/client";
import { parsePlayerQuery } from "@/lib/faceit/query";
import type { PlayerData } from "@/lib/faceit/types";

export type PlayerReportResult =
  | { ok: true; data: PlayerData; report: PlayerReport }
  | { ok: false; error: LookupError };

/** Single entry point for a report. Cached per request so metadata + page share one lookup. */
export const getPlayerReport = cache(async (rawQuery: string): Promise<PlayerReportResult> => {
  const result = await lookupPlayer(parsePlayerQuery(rawQuery));
  if (!result.ok) return result;
  return { ok: true, data: result.data, report: analyzePlayer(result.data) };
});

export function decodeParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}
