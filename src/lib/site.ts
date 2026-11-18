import { APP_NAME } from "@/lib/brand";

/** Public URL of the site. Set NEXT_PUBLIC_SITE_URL (e.g. https://csrecap.com) when it goes live. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const SITE_TITLE = `${APP_NAME}: free CS2 strat planner for players, teams and coaches`;
export const SITE_DESCRIPTION =
  "Plan CS2 executes, retakes and smoke lineups on every Active Duty map, then share the strat with your team in one link. Free tactics board for players, teams, coaches and esports. No sign-up.";

export const ACTIVE_DUTY = ["Mirage", "Dust II", "Inferno", "Nuke", "Ancient", "Anubis", "Train", "Overpass"];

/** Questions players and answer engines ask, answered in one or two plain sentences each. */
export const FAQ: { q: string; a: string }[] = [
  {
    q: `What is ${APP_NAME}?`,
    a: `${APP_NAME} is a free CS2 strat planner. You draw players, routes, smokes, flashes, molotovs and the bomb on a Counter-Strike 2 map, split the round into phases, and share the strat with your team in one link.`,
  },
  {
    q: `Who is ${APP_NAME} for?`,
    a: "CS2 players, in-game leaders (IGLs), coaches, FACEIT and Premier stacks, ESEA and league teams, and esports organisations that want one place to plan and share strats.",
  },
  {
    q: `Is ${APP_NAME} free?`,
    a: "Yes. Planning, playback and sharing are free, and you don't need an account.",
  },
  {
    q: "Which CS2 maps are supported?",
    a: `Every Active Duty map: ${ACTIVE_DUTY.join(", ")}, plus a blank board.`,
  },
  {
    q: "Do teammates need an account to see a strat?",
    a: "No. The share link opens in any browser, on a computer or a phone. Teammates can play the strat phase by phase and save their own copy.",
  },
  {
    q: "Where are my strats saved?",
    a: "In your own browser, on your device. Nothing is uploaded: there is no account and no server copy. A share link carries the whole strat inside the link itself.",
  },
  {
    q: `Is ${APP_NAME} affiliated with Valve?`,
    a: `No. ${APP_NAME} is an independent tool. The map radar images are © Valve Corporation.`,
  },
];
