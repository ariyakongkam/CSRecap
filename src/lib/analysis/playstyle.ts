import type { PlayerData } from "@/lib/faceit/types";
import { dec, pct, round } from "./format";
import type { Metrics } from "./metrics";
import { AWPER_SNIPER_SHARE, REFERENCE, VARIATION } from "./reference";
import type { Playstyle, PlaystyleId } from "./types";

interface Candidate {
  id: PlaystyleId;
  score: number;
  reasons: string[];
}

const NAMES: Record<PlaystyleId, string> = {
  awper: "Dedicated AWPer",
  entry: "Aggressive Entry",
  support: "Supportive Player",
  clutch: "Clutch Player",
  consistent: "Consistent Rifler",
  impact: "Impact Fragger",
  balanced: "Balanced Player",
};

const TAGLINES: Record<PlaystyleId, string> = {
  awper: "You hold the big rifle and the team builds around your picks.",
  entry: "You go first. You create space and decide how rounds start.",
  support: "You make your teammates better: flashes, damage nades and setups.",
  clutch: "When the round is on you alone, you stay calm and close it out.",
  consistent: "You show up every match. Teams can count on your baseline.",
  impact: "You carry the damage load. Rounds swing on your fights.",
  balanced: "No single trait dominates yet. You cover a bit of everything.",
};

const TRAITS: Record<PlaystyleId, string[]> = {
  awper: ["Picks", "Angle control", "Economy weight"],
  entry: ["Space creation", "Opening duels", "Tempo"],
  support: ["Flashes", "Utility damage", "Team play"],
  clutch: ["Composure", "Late-round", "1vX"],
  consistent: ["Reliable", "Steady output", "Low variance"],
  impact: ["High damage", "Multi-kills", "Firepower"],
  balanced: ["Flexible", "All-round", "Developing"],
};

function candidates(m: Metrics, data: PlayerData): Candidate[] {
  const out: Candidate[] = [];
  const lt = data.lifetime;

  if (m.sniperShare !== null && m.sniperShare >= AWPER_SNIPER_SHARE) {
    out.push({
      id: "awper",
      score: 2 + (m.sniperShare - AWPER_SNIPER_SHARE) * 10,
      reasons: [`${pct(m.sniperShare)} of your kills come from sniper rifles.`],
    });
  }

  if (m.z.entryRate !== null && m.z.entryRate >= 1 && m.entryRate !== null) {
    const reasons = [
      `You take the opening duel in ${pct(m.entryRate)} of rounds. The typical share is ${pct(REFERENCE.entryRate.ref)}.`,
    ];
    if (m.entrySuccess !== null) reasons.push(`You win ${pct(m.entrySuccess)} of those first fights.`);
    out.push({ id: "entry", score: m.z.entryRate + Math.max(0, m.z.entrySuccess ?? 0) * 0.5, reasons });
  }

  if (m.z.utility !== null && m.z.utility >= 0.8 && (m.z.entryRate ?? 0) <= 0.5) {
    const reasons: string[] = [];
    if (lt.enemiesFlashedPerRound !== null) reasons.push(`You blind ${dec(lt.enemiesFlashedPerRound)} enemies per round.`);
    if (lt.utilityDamagePerRound !== null) reasons.push(`Your grenades deal ${dec(lt.utilityDamagePerRound, 1)} damage per round.`);
    out.push({ id: "support", score: 0.5 + m.z.utility, reasons });
  }

  if (m.z.clutch1v1 !== null && m.z.clutch1v1 >= 1 && m.clutch1v1Rate !== null) {
    const reasons = [`You win ${pct(m.clutch1v1Rate)} of your 1v1s across ${m.clutch1v1Count} situations.`];
    if (lt.clutch1v2Rate !== null && lt.clutch1v2Count >= 20) reasons.push(`Even in 1v2s you win ${pct(lt.clutch1v2Rate)}.`);
    out.push({ id: "clutch", score: m.z.clutch1v1, reasons });
  }

  const variation = m.recent?.variation ?? null;
  if (variation !== null && variation <= VARIATION.consistent && m.kd >= 1) {
    out.push({
      id: "consistent",
      score: Math.min(2, 1 + (VARIATION.consistent - variation) * 10),
      reasons: [
        `Your damage barely swings from match to match: your ADR moved only ±${round(variation * 100)}% over your last ${m.recent!.count} games.`,
        `You do it while keeping a ${dec(m.kd)} K/D.`,
      ],
    });
  }

  const firepower = Math.max(m.z.adr ?? -Infinity, m.z.kd ?? -Infinity);
  if (firepower >= 1.5) {
    const reasons: string[] = [];
    if (m.adr !== null) reasons.push(`You average ${round(m.adr)} damage per round.`);
    reasons.push(`Your K/D sits at ${dec(m.kd)}.`);
    out.push({ id: "impact", score: firepower * 0.8, reasons });
  }

  return out.sort((a, b) => b.score - a.score);
}

export function detectPlaystyle(m: Metrics, data: PlayerData): Playstyle {
  const ranked = candidates(m, data);
  const top = ranked[0];
  const confidence: Playstyle["confidence"] = !m.hasEnoughMatches
    ? "low"
    : m.hasExtended && data.lifetime.extendedRounds >= 1000
      ? "high"
      : "medium";

  if (!top) {
    return {
      id: "balanced",
      name: NAMES.balanced,
      tagline: TAGLINES.balanced,
      reasons: m.hasExtended
        ? ["No single role (entry, support, clutch or AWP) clearly dominates your numbers yet."]
        : ["There isn't enough detailed round data yet to see a clear role."],
      traits: TRAITS.balanced,
      secondary: null,
      confidence,
    };
  }

  const second = ranked[1] && ranked[1].score >= 1 ? ranked[1] : null;
  return {
    id: top.id,
    name: NAMES[top.id],
    tagline: TAGLINES[top.id],
    reasons: top.reasons,
    traits: TRAITS[top.id],
    secondary: second ? { id: second.id, name: NAMES[second.id] } : null,
    confidence,
  };
}
