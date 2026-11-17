import type { PlayerData } from "@/lib/faceit/types";
import { dec, pct, pct100, round } from "./format";
import type { Metrics } from "./metrics";
import { REFERENCE, VARIATION } from "./reference";
import type { Insight } from "./types";

/** z-score magnitude at which something is worth telling the player. */
const NOTABLE = 1;

/**
 * Generates every strength/weakness the data supports, then keeps the most
 * notable one per category so the report never repeats itself.
 */
export function generateInsights(m: Metrics, data: PlayerData): Insight[] {
  const lt = data.lifetime;
  const all: Insight[] = [];
  const push = (i: Insight | null | false) => {
    if (i) all.push(i);
  };

  // ---------- firepower (K/D, ADR) ----------
  const fire = Math.max(m.z.kd ?? -Infinity, m.z.adr ?? -Infinity);
  const fireLow = Math.min(m.z.kd ?? Infinity, m.z.adr ?? Infinity);
  if (fire >= NOTABLE) {
    push({
      id: "firepower_high",
      category: "firepower",
      kind: "strength",
      title: "Wins most duels",
      detail: `Your ${dec(m.kd)} K/D${m.adr !== null ? ` and ${round(m.adr)} ADR` : ""} mean you regularly come out ahead in duels. Your aim and mechanics aren't what's holding you back.`,
      evidence: `${dec(m.kd)} K/D${m.adr !== null ? ` · ${round(m.adr)} ADR` : ""}`,
      coachLine: `Mechanically you're in good shape: a ${dec(m.kd)} K/D${m.adr !== null ? ` with ${round(m.adr)} damage per round` : ""} means you win more duels than you lose.`,
      weight: fire,
    });
  } else if (fireLow <= -NOTABLE) {
    const adrLow = m.adr !== null && (m.z.adr ?? 0) <= -NOTABLE;
    push({
      id: "firepower_low",
      category: "firepower",
      kind: "weakness",
      title: "Low round impact",
      detail: adrLow
        ? `You deal ${round(m.adr!)} damage per round. Solid FACEIT players usually sit around ${REFERENCE.adr.ref}. That gap usually means fewer fights taken with a real chance of winning, not just missed shots.`
        : `A ${dec(m.kd)} K/D means you trade your life away more often than you take one. Every death below 1.0 puts your team in a 4v5.`,
      evidence: adrLow ? `${round(m.adr!)} ADR` : `${dec(m.kd)} K/D`,
      coachLine: adrLow
        ? `Your biggest gap is impact: ${round(m.adr!)} damage per round leaves your team short of what it needs to win fights.`
        : `Your biggest gap is survival: at ${dec(m.kd)} K/D you die more than you kill, which leaves your team playing short-handed.`,
      weight: -fireLow,
    });
  }

  // ---------- aim (HS%) — and conversion (good HS, poor K/D) ----------
  const hsZ = m.z.headshotPct;
  if (hsZ !== null && hsZ >= NOTABLE && (m.z.kd ?? 0) <= -0.5) {
    push({
      id: "conversion",
      category: "conversion",
      kind: "weakness",
      title: "Good aim, losing fights",
      detail: `${pct100(m.headshotPct)} of your kills are headshots, so your aim is there, yet your K/D is ${dec(m.kd)}. When aim is fine but duels are lost, it's usually about which fights you take and when: wide peeks, re-peeks and fights with no teammate nearby.`,
      evidence: `${pct100(m.headshotPct)} HS · ${dec(m.kd)} K/D`,
      coachLine: `Your aim is not the problem (${pct100(m.headshotPct)} headshots), but your ${dec(m.kd)} K/D says you lose too many fights. That points to fight selection and timing rather than mechanics.`,
      weight: hsZ + -(m.z.kd ?? 0) + 0.5,
    });
  } else if (hsZ !== null && hsZ >= NOTABLE) {
    push({
      id: "aim_high",
      category: "aim",
      kind: "strength",
      title: "Clean aim",
      detail: `${pct100(m.headshotPct)} of your kills are headshots, so your crosshair placement keeps you at head level.`,
      evidence: `${pct100(m.headshotPct)} headshots`,
      coachLine: `Your crosshair placement is a real weapon: ${pct100(m.headshotPct)} of your kills are headshots.`,
      weight: hsZ,
    });
  } else if (hsZ !== null && hsZ <= -NOTABLE && m.sniperShare !== null && m.sniperShare < 0.2) {
    push({
      id: "aim_low",
      category: "aim",
      kind: "weakness",
      title: "Crosshair placement",
      detail: `Only ${pct100(m.headshotPct)} of your kills are headshots (most solid players land around ${REFERENCE.headshotPct.ref}%). Your crosshair is often below head level when the fight starts, so duels last longer than they need to.`,
      evidence: `${pct100(m.headshotPct)} headshots`,
      coachLine: `Your fights last too long: ${pct100(m.headshotPct)} headshots suggests your crosshair isn't at head level when enemies appear.`,
      weight: -hsZ,
    });
  }

  // ---------- opening duels ----------
  if (m.entrySuccess !== null && m.z.entrySuccess !== null) {
    const takesMany = (m.z.entryRate ?? 0) >= NOTABLE;
    if (m.z.entrySuccess >= NOTABLE) {
      push({
        id: "opening_high",
        category: "opening",
        kind: "strength",
        title: "Wins opening duels",
        detail: `You win ${pct(m.entrySuccess)} of the round's first fight. Every opening kill turns the round into a 5v4, which is the single biggest swing in CS.`,
        evidence: `${pct(m.entrySuccess)} opening duels won`,
        coachLine: `You win ${pct(m.entrySuccess)} of your opening duels, which gives your team a 5v4 head start.`,
        weight: m.z.entrySuccess + (takesMany ? 0.5 : 0),
      });
    } else if (m.z.entrySuccess <= -NOTABLE) {
      push({
        id: takesMany ? "opening_overcommit" : "opening_low",
        category: "opening",
        kind: "weakness",
        title: takesMany ? "Giving away the first kill" : "Losing opening duels",
        detail: takesMany
          ? `You take the first fight in ${pct(m.entryRate!)} of rounds, which is more than most players, but you win only ${pct(m.entrySuccess)} of them. That often hands the enemy a 5v4 before your team has done anything.`
          : `When you're in the round's first fight you win only ${pct(m.entrySuccess)}. Opening duels decide a large share of rounds, so each loss here costs a lot.`,
        evidence: `${pct(m.entrySuccess)} opening duels won${takesMany ? ` · ${pct(m.entryRate!)} of rounds` : ""}`,
        coachLine: takesMany
          ? `The biggest leak is your opening duels: you take the first fight often (${pct(m.entryRate!)} of rounds) but win only ${pct(m.entrySuccess)}, which keeps putting your team in 4v5s.`
          : `Your opening duels are costing rounds: you win only ${pct(m.entrySuccess)} of the first fights you're in.`,
        weight: -m.z.entrySuccess + (takesMany ? 0.75 : 0),
      });
    }
  }

  // ---------- clutches ----------
  if (m.clutch1v1Rate !== null && m.z.clutch1v1 !== null) {
    if (m.z.clutch1v1 >= NOTABLE) {
      push({
        id: "clutch_high",
        category: "clutch",
        kind: "strength",
        title: "Calm in clutches",
        detail: `You win ${pct(m.clutch1v1Rate)} of your 1v1s (${m.clutch1v1Count} played). Most players win under 40%.`,
        evidence: `${pct(m.clutch1v1Rate)} 1v1s won`,
        coachLine: `You're reliable when it's down to you: ${pct(m.clutch1v1Rate)} of your 1v1s end in your favour.`,
        weight: m.z.clutch1v1,
      });
    } else if (m.z.clutch1v1 <= -NOTABLE) {
      push({
        id: "clutch_low",
        category: "clutch",
        kind: "weakness",
        title: "Late-round decisions",
        detail: `You win ${pct(m.clutch1v1Rate)} of your 1v1s (${m.clutch1v1Count} played). Most players win around ${pct(REFERENCE.clutch1v1.ref)}. Close rounds are slipping away at the very end.`,
        evidence: `${pct(m.clutch1v1Rate)} 1v1s won`,
        coachLine: `Close rounds are slipping: you win only ${pct(m.clutch1v1Rate)} of your 1v1s.`,
        weight: -m.z.clutch1v1,
      });
    }
  }

  // ---------- utility ----------
  if (m.z.utility !== null) {
    if (m.z.utility >= NOTABLE) {
      push({
        id: "utility_high",
        category: "utility",
        kind: "strength",
        title: "Useful utility",
        detail: `Your grenades do real work${lt.enemiesFlashedPerRound !== null ? `: you blind ${dec(lt.enemiesFlashedPerRound)} enemies per round` : ""}${lt.utilityDamagePerRound !== null ? ` and deal ${dec(lt.utilityDamagePerRound, 1)} grenade damage per round` : ""}. That's the stuff that wins rounds without showing up on the scoreboard.`,
        evidence: [
          lt.enemiesFlashedPerRound !== null ? `${dec(lt.enemiesFlashedPerRound)} enemies flashed/round` : null,
          lt.utilityDamagePerRound !== null ? `${dec(lt.utilityDamagePerRound, 1)} util dmg/round` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        coachLine: `Your utility makes your team better, and that's rarer than good aim.`,
        weight: m.z.utility,
      });
    } else if (m.z.utility <= -1.5) {
      // Utility references are sampled from high-level players, so we only flag clearly low usage.
      push({
        id: "utility_low",
        category: "utility",
        kind: "weakness",
        title: "Under-used utility",
        detail: `Your flashes and grenades aren't doing much yet${lt.enemiesFlashedPerRound !== null ? `: you blind ${dec(lt.enemiesFlashedPerRound)} enemies per round` : ""}${lt.utilityDamagePerRound !== null ? ` and deal ${dec(lt.utilityDamagePerRound, 1)} grenade damage` : ""}. Good utility makes your fights easier before you even peek.`,
        evidence: lt.flashSuccess !== null ? `${pct(lt.flashSuccess)} of flashes blind someone` : "Low utility impact",
        coachLine: `You're taking fights without help from your utility, which makes every duel harder than it needs to be.`,
        weight: -m.z.utility - 0.5,
      });
    }
  }

  // ---------- maps ----------
  if (m.maps.best) {
    const b = m.maps.best;
    push({
      id: `map_best_${b.map.toLowerCase()}`,
      category: "map",
      kind: "strength",
      title: `Strong on ${b.map}`,
      detail: `You win ${pct100(b.winRate)} on ${b.map} (${b.matches} matches) against ${pct100(m.winRate)} overall. This is your comfort pick.`,
      evidence: `${pct100(b.winRate)} win rate · ${b.matches} matches`,
      coachLine: `${b.map} is your map: you win ${pct100(b.winRate)} there.`,
      weight: (b.winRate - m.winRate) / 6,
    });
  }
  if (m.maps.worst) {
    const w = m.maps.worst;
    push({
      id: `map_worst_${w.map.toLowerCase()}`,
      category: "map",
      kind: "weakness",
      title: `Struggling on ${w.map}`,
      detail: `You win only ${pct100(w.winRate)} on ${w.map} (${w.matches} matches), against ${pct100(m.winRate)} overall${w.kd < m.kd - 0.05 ? `, and your K/D drops to ${dec(w.kd)}` : ""}. That's usually missing map knowledge (setups, timings, lineups) rather than aim.`,
      evidence: `${pct100(w.winRate)} win rate · ${w.matches} matches`,
      coachLine: `${w.map} is dragging you down: ${pct100(w.winRate)} win rate there against ${pct100(m.winRate)} overall.`,
      weight: (m.winRate - w.winRate) / 6,
    });
  }

  // ---------- recent form ----------
  if (m.recent && m.recent.adr !== null && m.adr !== null) {
    const delta = m.recent.adr - m.adr;
    if (delta >= 8) {
      push({
        id: "form_up",
        category: "form",
        kind: "strength",
        title: "In form right now",
        detail: `Over your last ${m.recent.count} matches you're averaging ${round(m.recent.adr)} ADR, ${round(delta)} above your career average. Whatever you're doing, keep doing it.`,
        evidence: `+${round(delta)} ADR recently`,
        coachLine: `You're trending up: +${round(delta)} ADR over your last ${m.recent.count} matches.`,
        weight: delta / 8,
      });
    } else if (delta <= -8) {
      push({
        id: "form_down",
        category: "form",
        kind: "weakness",
        title: "Recent dip",
        detail: `Your last ${m.recent.count} matches average ${round(m.recent.adr)} ADR, ${round(-delta)} below your career average. You've shown you can play better; this is a slump, not your level.`,
        evidence: `${round(delta)} ADR recently`,
        coachLine: `You're in a dip: your last ${m.recent.count} matches are ${round(-delta)} ADR below your usual level.`,
        weight: -delta / 8,
      });
    }
  }

  // ---------- consistency ----------
  const variation = m.recent?.variation ?? null;
  if (variation !== null && m.recent) {
    if (variation <= VARIATION.consistent) {
      push({
        id: "consistency_high",
        category: "consistency",
        kind: "strength",
        title: "Consistent output",
        detail: `Your damage barely changes from game to game (±${round(variation * 100)}% over ${m.recent.count} matches). Your team knows what it's getting.`,
        evidence: `±${round(variation * 100)}% match-to-match`,
        coachLine: `You're dependable: your output barely swings from match to match.`,
        weight: 1 + (VARIATION.consistent - variation) * 10,
      });
    } else if (variation >= VARIATION.streaky) {
      push({
        id: "consistency_low",
        category: "consistency",
        kind: "weakness",
        title: "Up-and-down matches",
        detail: `Your damage swings a lot between matches (±${round(variation * 100)}% over your last ${m.recent.count}). Big games are followed by quiet ones, and the quiet ones are where Elo leaks.`,
        evidence: `±${round(variation * 100)}% match-to-match`,
        coachLine: `Your games swing between great and quiet, and the quiet ones cost you Elo.`,
        weight: 1 + (variation - VARIATION.streaky) * 10,
      });
    }
  }

  // ---------- winning (frags not converting into wins) ----------
  if ((m.z.kd ?? 0) >= NOTABLE && (m.z.winRate ?? 0) <= -NOTABLE) {
    push({
      id: "winning_low",
      category: "winning",
      kind: "weakness",
      title: "Frags aren't turning into wins",
      detail: `You win only ${pct100(m.winRate)} of matches despite a ${dec(m.kd)} K/D. Your kills are there; the gap is in how they help the round: trading teammates, playing the bomb, and calling what you see.`,
      evidence: `${pct100(m.winRate)} wins · ${dec(m.kd)} K/D`,
      coachLine: `You frag well, but a ${pct100(m.winRate)} win rate means those kills don't turn into rounds often enough.`,
      weight: -(m.z.winRate ?? 0) + 0.5,
    });
  } else if ((m.z.winRate ?? 0) >= 1.5) {
    push({
      id: "winning_high",
      category: "winning",
      kind: "strength",
      title: "Wins games",
      detail: `You win ${pct100(m.winRate)} of your matches. Whatever your stat line, you help teams win, and that's what Elo rewards.`,
      evidence: `${pct100(m.winRate)} win rate`,
      coachLine: `You win games: ${pct100(m.winRate)} of them.`,
      weight: m.z.winRate ?? 0,
    });
  }

  // Keep the strongest insight per (category, kind).
  const best = new Map<string, Insight>();
  for (const i of all) {
    const key = `${i.category}:${i.kind}`;
    const current = best.get(key);
    if (!current || i.weight > current.weight) best.set(key, i);
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight);
}
