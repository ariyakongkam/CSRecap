import type { PlayerData } from "@/lib/faceit/types";
import { article, lowerFirst } from "./format";
import { generateInsights } from "./insights";
import { computeMetrics } from "./metrics";
import { buildFocusPlan } from "./plan";
import { detectPlaystyle } from "./playstyle";
import { MIN_SAMPLE } from "./reference";
import type { InsightCategory, PlayerReport, PlaystyleId } from "./types";

export type { PlayerReport } from "./types";

const MAX_PER_KIND = 3;

/** The insight category a playstyle's own reasons already cover, so the summary doesn't repeat it. */
const PLAYSTYLE_CATEGORY: Partial<Record<PlaystyleId, InsightCategory>> = {
  impact: "firepower",
  entry: "opening",
  clutch: "clutch",
  support: "utility",
  consistent: "consistency",
};

/**
 * Builds the full player report from FACEIT data. Pure and deterministic:
 * same input, same report. That keeps it testable and makes a future
 * LLM-written summary an optional layer on top, not a dependency.
 */
export function analyzePlayer(data: PlayerData): PlayerReport {
  const m = computeMetrics(data);
  const playstyle = detectPlaystyle(m, data);
  const insights = generateInsights(m, data);

  const strengths = insights.filter((i) => i.kind === "strength").slice(0, MAX_PER_KIND);
  const weaknesses = insights.filter((i) => i.kind === "weakness").slice(0, MAX_PER_KIND);
  const focus = buildFocusPlan(weaknesses[0], m, data, playstyle);

  const summary: string[] = [];
  const name = playstyle.name.toLowerCase();
  summary.push(`You play like ${article(name)} ${name}. ${playstyle.reasons[0] ?? ""}`.trim());
  const covered = PLAYSTYLE_CATEGORY[playstyle.id];
  const leadStrength = strengths.find((s) => s.category !== covered);
  if (leadStrength) summary.push(leadStrength.coachLine);
  if (weaknesses[0]) {
    summary.push(weaknesses[0].coachLine);
    summary.push(`So your next focus is simple: ${lowerFirst(focus.goal)}.`);
  } else {
    summary.push("Nothing in your numbers stands out as a clear leak, which is a good place to be. Now it's about raising your ceiling.");
  }

  const dataNotes: string[] = [];
  if (!m.hasEnoughMatches) {
    dataNotes.push(
      `This report is based on only ${m.matches} match${m.matches === 1 ? "" : "es"}. Play at least ${MIN_SAMPLE.matches} on FACEIT for a reliable read.`,
    );
  }
  if (!m.hasExtended) {
    dataNotes.push("FACEIT has little detailed round data for you yet, so opening duels, clutches and utility aren't analysed.");
  }

  return { playstyle, strengths, weaknesses, summary, focus, dataNotes };
}
