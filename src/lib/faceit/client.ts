import "server-only";

import type { LifetimeStats, MapStats, PlayerData, PlayerProfile, RecentMatch } from "./types";
import type { PlayerQuery } from "./query";

/**
 * FACEIT Data API v4 client (server-side only — the API key must never reach
 * the browser).
 *
 * Endpoints used per report (3 requests):
 *   GET /players?nickname=… | /players?game=cs2&game_player_id=…   profile, level, Elo
 *   GET /players/{id}/stats/cs2                                      lifetime + per-map
 *   GET /players/{id}/games/cs2/stats?limit=20                       last 20 matches
 *
 * Rate limit observed: ~20 requests/second per key. Responses are cached
 * for 10 minutes via Next's fetch cache to stay well inside it.
 */

const BASE_URL = "https://open.faceit.com/data/v4";
const REVALIDATE_SECONDS = 600;
const RECENT_MATCHES = 20;

export type LookupError =
  | { code: "invalid_query"; message: string }
  | { code: "not_found"; message: string }
  | { code: "no_cs2"; message: string; nickname: string }
  | { code: "rate_limited"; message: string }
  | { code: "unavailable"; message: string }
  | { code: "not_configured"; message: string };

export type LookupResult = { ok: true; data: PlayerData } | { ok: false; error: LookupError };

class FaceitHttpError extends Error {
  constructor(public status: number) {
    super(`FACEIT API responded with ${status}`);
  }
}

async function faceitGet<T>(path: string): Promise<T> {
  const apiKey = process.env.FACEIT_API_KEY;
  if (!apiKey) throw new FaceitHttpError(-1);

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new FaceitHttpError(res.status);
  return (await res.json()) as T;
}

// ---------- raw response shapes (only the fields we use) ----------

interface RawPlayer {
  player_id: string;
  nickname: string;
  avatar?: string;
  country?: string;
  faceit_url?: string;
  steam_id_64?: string;
  games?: Record<string, { region?: string; skill_level?: number; faceit_elo?: number; game_player_id?: string } | undefined>;
}

type RawStatValue = string | number | string[] | undefined;
type RawStats = Record<string, RawStatValue>;

interface RawPlayerStats {
  lifetime?: RawStats;
  segments?: { type?: string; mode?: string; label?: string; img_regular?: string; img_small?: string; stats?: RawStats }[];
}

interface RawMatchStats {
  items?: { stats?: RawStats }[];
}

// ---------- parsing helpers ----------

function num(stats: RawStats | undefined, key: string): number | null {
  const v = stats?.[key];
  if (v === undefined || v === null || v === "" || Array.isArray(v)) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function int(stats: RawStats | undefined, key: string): number {
  return Math.round(num(stats, key) ?? 0);
}

/** "de_dust2" → "Dust2", "de_mirage" → "Mirage" */
export function mapDisplayName(raw: string): string {
  const name = raw.replace(/^(de|cs|ar)_/i, "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function parseProfile(raw: RawPlayer): PlayerProfile | null {
  const cs2 = raw.games?.cs2;
  if (!cs2) return null;
  return {
    id: raw.player_id,
    nickname: raw.nickname,
    avatar: raw.avatar || null,
    country: raw.country || null,
    region: cs2.region || null,
    level: cs2.skill_level ?? null,
    elo: cs2.faceit_elo ?? null,
    steamId64: cs2.game_player_id || raw.steam_id_64 || null,
    faceitUrl: raw.faceit_url ? raw.faceit_url.replace("{lang}", "en") : null,
  };
}

function parseMaps(raw: RawPlayerStats): MapStats[] {
  return (raw.segments ?? [])
    .filter((s) => s.type === "Map" && s.mode === "5v5" && s.label && s.stats)
    .map((s): MapStats => {
      const st = s.stats!;
      const matches = int(st, "Matches");
      const kills = num(st, "Kills");
      return {
        map: s.label!,
        image: s.img_regular || s.img_small || null,
        matches,
        wins: int(st, "Wins"),
        winRate: num(st, "Win Rate %") ?? 0,
        kd: num(st, "Average K/D Ratio") ?? 0,
        adr: num(st, "ADR"),
        avgKills: num(st, "Average Kills") ?? (kills !== null && matches > 0 ? kills / matches : null),
        headshotPct: num(st, "Average Headshots %") ?? 0,
      };
    })
    .filter((m) => m.matches > 0)
    .sort((a, b) => b.matches - a.matches);
}

function parseLifetime(raw: RawPlayerStats, maps: MapStats[], recent: RecentMatch[]): LifetimeStats {
  const lt = raw.lifetime ?? {};
  const matches = int(lt, "Matches");
  const wins = int(lt, "Wins");

  // Lifetime has no "average kills"; derive it from per-map totals, falling back to recent matches.
  const mapMatches = maps.reduce((s, m) => s + m.matches, 0);
  const mapKills = maps.reduce((s, m) => s + (m.avgKills ?? 0) * m.matches, 0);
  const avgKills =
    mapMatches > 0
      ? mapKills / mapMatches
      : recent.length > 0
        ? recent.reduce((s, m) => s + m.kills, 0) / recent.length
        : null;

  const recentResults = Array.isArray(lt["Recent Results"])
    ? (lt["Recent Results"] as string[]).map((r) => r === "1")
    : [];

  return {
    matches,
    wins,
    winRate: num(lt, "Win Rate %") ?? (matches > 0 ? (wins / matches) * 100 : 0),
    kd: num(lt, "Average K/D Ratio") ?? 0,
    adr: num(lt, "ADR"),
    headshotPct: num(lt, "Average Headshots %") ?? 0,
    avgKills,
    longestWinStreak: num(lt, "Longest Win Streak"),
    recentResults,
    extendedRounds: int(lt, "Total Rounds with extended stats"),
    entryRate: num(lt, "Entry Rate"),
    entrySuccess: num(lt, "Entry Success Rate"),
    entryCount: int(lt, "Total Entry Count"),
    clutch1v1Rate: num(lt, "1v1 Win Rate"),
    clutch1v1Count: int(lt, "Total 1v1 Count"),
    clutch1v2Rate: num(lt, "1v2 Win Rate"),
    clutch1v2Count: int(lt, "Total 1v2 Count"),
    flashesPerRound: num(lt, "Flashes per Round"),
    enemiesFlashedPerRound: num(lt, "Enemies Flashed per Round"),
    flashSuccess: num(lt, "Flash Success Rate"),
    utilityDamagePerRound: num(lt, "Utility Damage per Round"),
    sniperKillRate: num(lt, "Sniper Kill Rate"),
    entryWins: int(lt, "Total Entry Wins"),
    clutch1v1Wins: int(lt, "Total 1v1 Wins"),
    enemiesFlashedTotal: int(lt, "Total Enemies Flashed"),
  };
}

function parseRecent(raw: RawMatchStats): RecentMatch[] {
  return (raw.items ?? [])
    .map((i) => i.stats)
    .filter((st): st is RawStats => !!st && (st["Game Mode"] === undefined || st["Game Mode"] === "5v5"))
    .map((st): RecentMatch => {
      const finished = st["Match Finished At"];
      return {
        id: String(st["Match Id"] ?? ""),
        map: mapDisplayName(String(st["Map"] ?? "Unknown")),
        won: String(st["Result"]) === "1",
        score: typeof st["Score"] === "string" ? st["Score"] : null,
        kills: int(st, "Kills"),
        deaths: int(st, "Deaths"),
        assists: int(st, "Assists"),
        kd: num(st, "K/D Ratio") ?? 0,
        adr: num(st, "ADR"),
        headshotPct: num(st, "Headshots %") ?? 0,
        rounds: num(st, "Rounds"),
        finishedAt: typeof finished === "number" ? new Date(finished).toISOString() : null,
      };
    });
}

// ---------- public API ----------

async function findPlayer(query: Exclude<PlayerQuery, { kind: "invalid" }>): Promise<RawPlayer | null> {
  try {
    if (query.kind === "steam64") {
      return await faceitGet<RawPlayer>(`/players?game=cs2&game_player_id=${query.value}`);
    }
    return await faceitGet<RawPlayer>(`/players?nickname=${encodeURIComponent(query.value)}`);
  } catch (e) {
    if (!(e instanceof FaceitHttpError) || e.status !== 404 || query.kind !== "nickname") throw e;
  }

  // Nickname lookups are case-sensitive; fall back to search for a case-insensitive exact match.
  const search = await faceitGet<{ items?: { nickname: string; player_id: string }[] }>(
    `/search/players?nickname=${encodeURIComponent(query.value)}&game=cs2&limit=20`,
  );
  const match = search.items?.find((p) => p.nickname.toLowerCase() === query.value.toLowerCase());
  if (!match) return null;
  return faceitGet<RawPlayer>(`/players/${match.player_id}`);
}

function toLookupError(e: unknown): LookupError {
  if (e instanceof FaceitHttpError) {
    if (e.status === -1 || e.status === 401 || e.status === 403) {
      return { code: "not_configured", message: "CSRecap can't reach FACEIT right now (API access is not configured)." };
    }
    if (e.status === 404) return { code: "not_found", message: "We couldn't find that player on FACEIT." };
    if (e.status === 429) {
      return { code: "rate_limited", message: "Too many requests right now. Give it a few seconds and try again." };
    }
  }
  return { code: "unavailable", message: "FACEIT didn't respond as expected. Please try again in a moment." };
}

export async function lookupPlayer(query: PlayerQuery): Promise<LookupResult> {
  if (query.kind === "invalid") return { ok: false, error: { code: "invalid_query", message: query.reason } };

  try {
    const rawPlayer = await findPlayer(query);
    if (!rawPlayer) {
      return {
        ok: false,
        error: {
          code: "not_found",
          message:
            query.kind === "steam64"
              ? "No FACEIT account is linked to that Steam ID."
              : `We couldn't find a FACEIT player called "${query.value}".`,
        },
      };
    }

    const profile = parseProfile(rawPlayer);
    if (!profile) {
      return {
        ok: false,
        error: { code: "no_cs2", nickname: rawPlayer.nickname, message: `${rawPlayer.nickname} hasn't played CS2 on FACEIT yet.` },
      };
    }

    const [rawStats, rawMatches] = await Promise.all([
      faceitGet<RawPlayerStats>(`/players/${profile.id}/stats/cs2`).catch((e) => {
        // Players with a CS2 profile but zero finished matches have no stats document.
        if (e instanceof FaceitHttpError && e.status === 404) return {} as RawPlayerStats;
        throw e;
      }),
      faceitGet<RawMatchStats>(`/players/${profile.id}/games/cs2/stats?limit=${RECENT_MATCHES}`).catch((e) => {
        if (e instanceof FaceitHttpError && e.status === 404) return {} as RawMatchStats;
        throw e;
      }),
    ]);

    const maps = parseMaps(rawStats);
    const recentMatches = parseRecent(rawMatches);
    const lifetime = parseLifetime(rawStats, maps, recentMatches);

    return { ok: true, data: { profile, lifetime, maps, recentMatches, fetchedAt: new Date().toISOString() } };
  } catch (e) {
    return { ok: false, error: toLookupError(e) };
  }
}
