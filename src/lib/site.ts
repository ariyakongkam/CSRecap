import { APP_NAME } from "@/lib/brand";

/** Public URL of the site. Set NEXT_PUBLIC_SITE_URL (e.g. https://csrecap.com) when it goes live. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const SITE_TITLE = `${APP_NAME}: free CS2 strat planner and tactics board`;
export const SITE_DESCRIPTION =
  "Plan CS2 executes, retakes and setups on accurate radar maps. Time every smoke, flash and molotov, then share the strat with your team in one link. Free, no sign-up.";

export const ACTIVE_DUTY = ["Mirage", "Dust II", "Inferno", "Nuke", "Ancient", "Anubis", "Train", "Overpass"];

/** Questions people (and answer engines) ask about the product, answered in one or two sentences each. */
export const FAQ: { q: string; a: string }[] = [
  {
    q: `What is ${APP_NAME}?`,
    a: `${APP_NAME} is a free online CS2 tactics board. You place players, routes, grenades and the bomb on a 2D radar map, set when each thing happens, and share the finished strat with your team as a link.`,
  },
  {
    q: `Is ${APP_NAME} free?`,
    a: `Yes. Planning, playback and sharing are free, and you don't need an account.`,
  },
  {
    q: "Do my teammates need an account to see a strat?",
    a: "No. The share link opens in any browser. Teammates can watch the strat play out step by step and save their own copy to edit.",
  },
  {
    q: "Which CS2 maps can I plan on?",
    a: `All Active Duty maps: ${ACTIVE_DUTY.join(", ")}. Nuke shows the upper level. There is also a blank board for anything else.`,
  },
  {
    q: "Can I add smoke and flash lineups?",
    a: "Yes. Place a lineup pin where the grenade lands and link a YouTube video or a screenshot. Teammates click the pin to open it.",
  },
  {
    q: "Where are my strats saved?",
    a: "In your browser, automatically, as you work. They stay on that device; to move a strat to another device or person, send its share link.",
  },
  {
    q: "Does it work on a phone?",
    a: "Viewing and playing a shared strat works on phones. Drawing a strat is easiest on a computer with a mouse.",
  },
  {
    q: `Is ${APP_NAME} made by Valve?`,
    a: `No. ${APP_NAME} is an independent tool and is not affiliated with Valve. The map radar images are © Valve Corporation.`,
  },
];
