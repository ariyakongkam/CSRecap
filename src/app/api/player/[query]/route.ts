import { NextResponse } from "next/server";
import { decodeParam, getPlayerReport } from "@/lib/player";

/**
 * JSON version of the player report (data + analysis). The web page doesn't
 * use it; it's the stable surface for future clients (weekly reports, a
 * companion app, progress tracking).
 */
const STATUS = {
  invalid_query: 400,
  not_found: 404,
  no_cs2: 404,
  rate_limited: 429,
  unavailable: 502,
  not_configured: 503,
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ query: string }> }) {
  const result = await getPlayerReport(decodeParam((await params).query));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: STATUS[result.error.code] });
  return NextResponse.json(
    { player: result.data, report: result.report },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } },
  );
}
