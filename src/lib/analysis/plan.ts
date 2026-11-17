import type { PlayerData } from "@/lib/faceit/types";
import { article, formatTarget } from "./format";
import type { Metrics } from "./metrics";
import { REFERENCE } from "./reference";
import type { FocusPlan, FocusTarget, Insight, Playstyle, TargetKey } from "./types";

function target(key: TargetKey, metric: string, start: number, goalValue: number, map?: string): FocusTarget {
  return {
    key,
    metric,
    current: formatTarget(key, start),
    goal: formatTarget(key, goalValue),
    start,
    goalValue,
    ...(map ? { map } : {}),
  };
}

/** The player's most-played maps, for concrete tasks. */
function topMaps(data: PlayerData, n = 2): string[] {
  return data.maps.slice(0, n).map((m) => m.map);
}

function mapsPhrase(maps: string[]): string {
  if (maps.length === 0) return "your most-played maps";
  return maps.length === 1 ? maps[0] : `${maps[0]} and ${maps[1]}`;
}

/**
 * Turns the player's top weakness into one focused, measurable goal with
 * three concrete tasks. One focus at a time; a coach doesn't hand out ten.
 */
export function buildFocusPlan(
  weakness: Insight | undefined,
  m: Metrics,
  data: PlayerData,
  playstyle: Playstyle,
): FocusPlan {
  const maps = mapsPhrase(topMaps(data));
  const lt = data.lifetime;

  if (!weakness) {
    return {
      goal: playstyle.id === "balanced" ? "Find your role" : `Lean into being ${article(playstyle.name)} ${playstyle.name}`,
      why: "Nothing in your numbers is clearly holding you back. The next step is turning a solid all-round game into something teams build around.",
      target: m.adr !== null ? target("adr", "ADR", m.adr, m.adr + 5) : null,
      tasks: [
        `Before your next 5 matches, agree a role with your team (entry, support or anchor) and stick to it all match.`,
        `On ${maps}, learn one new utility setup per site that helps your role.`,
        `After each match, write down the one round you influenced most and why. Repeat that pattern.`,
      ],
      insightId: null,
    };
  }

  const id = weakness.id;

  if (id === "opening_overcommit") {
    return {
      goal: "Pick your opening duels",
      why: weakness.coachLine,
      target: target("entrySuccess", "Opening duels won", m.entrySuccess!, Math.min(m.entrySuccess! + 0.05, 0.55)),
      tasks: [
        `For your next 5 matches, only take the first fight with a flash thrown or a teammate close enough to trade you. No dry peeks in the first 20 seconds.`,
        `On ${maps}, pick one default position per side where you hold an angle instead of pushing. Let the enemy come to you.`,
        `After each match, re-watch the rounds where you died first (FACEIT lets you download the demo). Look for the same angle or timing repeating.`,
      ],
      insightId: id,
    };
  }

  if (id === "opening_low") {
    return {
      goal: "Win more first fights",
      why: weakness.coachLine,
      target: target("entrySuccess", "Opening duels won", m.entrySuccess!, Math.min(m.entrySuccess! + 0.05, 0.55)),
      tasks: [
        `Warm up with 10 minutes of a prefire map for ${maps} before you queue, so the common angles are already in your hands.`,
        `In your next 5 matches, peek the first angle with a teammate's flash or your own pop-flash, never dry.`,
        `Re-watch 3 rounds where you lost the first fight: was your crosshair already where the enemy appeared?`,
      ],
      insightId: id,
    };
  }

  if (id === "conversion") {
    return {
      goal: "Choose better fights",
      why: weakness.coachLine,
      target: target("kd", "K/D", m.kd, Math.max(m.kd + 0.08, REFERENCE.kd.ref)),
      tasks: [
        `After you get a kill, move. In your next 5 matches, never re-peek the same angle right after a kill.`,
        `Stop taking wide swings alone: stay within trading distance of a teammate (a few seconds' walk).`,
        `Re-watch your deaths from one match and sort them into "good fight, lost aim duel" and "bad fight". Count the bad ones; that's the number to shrink.`,
      ],
      insightId: id,
    };
  }

  if (id === "firepower_low") {
    return {
      goal: "Make every round count",
      why: weakness.coachLine,
      target:
        m.adr !== null
          ? target("adr", "ADR", m.adr, m.adr + 6)
          : target("kd", "K/D", m.kd, m.kd + 0.08),
      tasks: [
        `Use all your utility every round. An HE or molotov that deals 30 damage is free ADR and makes the next fight easier.`,
        `Play near a teammate so every death gets traded and every fight is a 2v1, not a 1v1.`,
        `Warm up for 10 minutes in deathmatch before you queue, focusing only on keeping your crosshair at head height.`,
      ],
      insightId: id,
    };
  }

  if (id === "aim_low") {
    return {
      goal: "Fix your crosshair placement",
      why: weakness.coachLine,
      target: target("headshotPct", "Headshot %", m.headshotPct, Math.min(m.headshotPct + 4, 55)),
      tasks: [
        `Before each session, play 10 minutes of headshot-only deathmatch.`,
        `Walk through ${maps} in an empty server and pre-place your crosshair at head height on every common angle.`,
        `In matches, stop and burst at range instead of spraying while moving. Accuracy beats speed.`,
      ],
      insightId: id,
    };
  }

  if (id === "clutch_low") {
    return {
      goal: "Close out late rounds",
      why: weakness.coachLine,
      target: target("clutch1v1", "1v1s won", m.clutch1v1Rate!, Math.min(m.clutch1v1Rate! + 0.05, 0.45)),
      tasks: [
        `In 1v1s, check the clock and bomb before you move. Let time pressure force the enemy to come to you.`,
        `Use sound: stop moving and listen for 2 seconds before committing to a fight.`,
        `Spend 15 minutes on a retake or clutch practice server once a week to rehearse 1vX decisions.`,
      ],
      insightId: id,
    };
  }

  if (id === "utility_low") {
    return {
      goal: "Make your utility work",
      why: weakness.coachLine,
      target:
        lt.enemiesFlashedPerRound !== null
          ? target("enemiesFlashedPerRound", "Enemies flashed / round", lt.enemiesFlashedPerRound, lt.enemiesFlashedPerRound + 0.1)
          : null,
      tasks: [
        `Learn 2 pop-flashes and 1 molotov for each site on ${maps}. Practise them in an empty server until they're automatic.`,
        `For your next 5 matches, buy a full utility kit whenever you buy a rifle.`,
        `Before peeking an angle, ask: "Can I flash this first?" If yes, do it.`,
      ],
      insightId: id,
    };
  }

  if (id.startsWith("map_worst_")) {
    const w = m.maps.worst!;
    return {
      goal: `Fix your ${w.map}`,
      why: weakness.coachLine,
      target: target("mapWinRate", `${w.map} win rate`, w.winRate, Math.min(w.winRate + 8, m.winRate), w.map),
      tasks: [
        `Watch one pro demo or POV on ${w.map} and note where the player stands on each side in the first 30 seconds.`,
        `Learn 3 utility lineups for ${w.map}: one smoke and one flash for your usual site, plus one retake molotov.`,
        `Until it improves, play ${w.map} with one set position per side instead of improvising.`,
      ],
      insightId: id,
    };
  }

  if (id === "form_down") {
    return {
      goal: "Break the slump",
      why: weakness.coachLine,
      target: m.recent?.adr != null && m.adr != null ? target("adr", "Recent ADR", m.recent.adr, m.adr) : null,
      tasks: [
        `Warm up for 15 minutes (deathmatch plus a prefire map) before your first match of the day.`,
        `Stop for the day after 2 losses in a row. Tilted matches are the most expensive ones.`,
        `Keep sessions to 3–4 matches for the next week and check whether your average comes back.`,
      ],
      insightId: id,
    };
  }

  if (id === "consistency_low") {
    return {
      goal: "Raise your floor",
      why: weakness.coachLine,
      target: null,
      tasks: [
        `Use the same 15-minute warm-up before every session so every match starts from the same baseline.`,
        `In quiet games, switch to playing for your team: throw utility, trade, and stay alive for late rounds.`,
        `Note what was different in your worst recent match (tired, tilted, new role?) and avoid that setup.`,
      ],
      insightId: id,
    };
  }

  // winning_low (and any future weakness without a dedicated plan)
  return {
    goal: "Turn frags into rounds",
    why: weakness.coachLine,
    target: target("winRate", "Win rate", m.winRate, Math.min(m.winRate + 4, 60)),
    tasks: [
      `Play close enough to teammates that you can trade them. A trade kill is worth more than a solo kill.`,
      `When you get an opening kill, call it and the position immediately so your team can use it.`,
      `In post-plant and retake rounds, play the bomb and the clock, not the kill count.`,
    ],
    insightId: id,
  };
}
