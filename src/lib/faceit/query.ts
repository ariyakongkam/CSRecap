/**
 * Turns whatever the user typed into something we can look up on FACEIT.
 *
 * Supported:
 *  - FACEIT nickname                         → "s1mple"
 *  - FACEIT profile URL                      → faceit.com/en/players/s1mple
 *  - SteamID64                               → 76561198034202275
 *  - Steam profile URL with a numeric ID     → steamcommunity.com/profiles/7656…
 *
 * Not supported yet: Steam custom URLs (steamcommunity.com/id/name). Resolving
 * them needs a Steam Web API key, which the MVP intentionally avoids.
 */

export type PlayerQuery =
  | { kind: "nickname"; value: string }
  | { kind: "steam64"; value: string }
  | { kind: "invalid"; reason: string };

const STEAM64 = /^7656119\d{10}$/;

export function parsePlayerQuery(raw: string): PlayerQuery {
  const input = raw.trim();
  if (!input) return { kind: "invalid", reason: "Enter a FACEIT nickname or Steam ID." };

  if (STEAM64.test(input)) return { kind: "steam64", value: input };

  const steamProfile = input.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (steamProfile) {
    return STEAM64.test(steamProfile[1])
      ? { kind: "steam64", value: steamProfile[1] }
      : { kind: "invalid", reason: "That Steam profile link doesn't contain a valid Steam ID." };
  }

  if (/steamcommunity\.com\/id\//i.test(input)) {
    return {
      kind: "invalid",
      reason:
        "Custom Steam links aren't supported yet. Use your FACEIT nickname or your 17-digit Steam ID (steamcommunity.com/profiles/…).",
    };
  }

  const faceitProfile = input.match(/faceit\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?players\/([^/?#\s]+)/i);
  if (faceitProfile) return { kind: "nickname", value: decodeURIComponent(faceitProfile[1]) };

  if (/^\d+$/.test(input)) {
    return { kind: "invalid", reason: "That doesn't look like a Steam ID. SteamID64s are 17 digits and start with 7656119." };
  }

  // FACEIT nicknames: letters, digits, "-" and "_", up to 32 chars.
  if (!/^[A-Za-z0-9_-]{2,32}$/.test(input)) {
    return { kind: "invalid", reason: "FACEIT nicknames only contain letters, numbers, - and _." };
  }

  return { kind: "nickname", value: input };
}
