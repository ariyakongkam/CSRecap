/**
 * Builds per-level (FACEIT levels 1–10) baselines for the analysis and writes
 * them to src/lib/analysis/baselines.json.
 *
 *   FACEIT_API_KEY=… npm run baselines -- [--per-level 200] [--out path]
 *
 * (Node ≥ 22.21: runs the .ts file directly. NODE_USE_ENV_PROXY=1 makes Node's
 * fetch honour HTTPS_PROXY if you're behind one.)
 *
 * Sampling:
 *  1. Seeds: for each region, find how deep its CS2 ranking goes (binary search
 *     on an empty page), then read pages at random offsets across the whole
 *     ranking, with more pages for bigger regions. Rankings are sorted by Elo,
 *     so uniform offsets sample each level roughly in proportion to its
 *     population. All regions' seeds are shuffled into one pool.
 *  2. Snowball: while a level is short of players, walk the match history of
 *     already-accepted players at or near that level. History rosters carry each
 *     player's skill level at match time, so we only fetch candidates whose level
 *     is still needed.
 *  3. Each candidate's *current* level comes from /players/{id} (that is what the
 *     app compares against); stats come from /players/{id}/stats/cs2. Only players
 *     with ≥300 rounds of extended stats are kept.
 *
 * Requests are throttled to ~15/s (the key's limit is ~20/s) and retried on 429/5xx.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const BASE_URL = "https://open.faceit.com/data/v4";
const REGIONS = ["EU", "NA", "SA", "SEA", "OCE"];
const MIN_EXTENDED_ROUNDS = 300;
/** Same threshold the app uses before it makes clutch claims. */
const MIN_CLUTCHES = 20;
/** Same threshold the app uses before it makes opening-duel claims. */
const MIN_ENTRIES = 30;
const REQUESTS_PER_SECOND = 15;
/** Ranking pages read for the seed, split across regions by player count. */
const SEED_PAGES = 300;
const MIN_SEED_PAGES_PER_REGION = 15;
const PAGE_SIZE = 100;

const args = process.argv.slice(2);
function arg(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const PER_LEVEL = Number(arg("per-level", "200"));
const OUT = resolve(arg("out", "src/lib/analysis/baselines.json"));
/** Hard stop so a run can't spin forever if some level is unreachable. */
const MAX_REQUESTS = Number(arg("max-requests", "20000"));

const API_KEY = process.env.FACEIT_API_KEY ?? "";

// ---------- metrics ----------

type RawStats = Record<string, string | number | string[] | undefined>;

interface MetricDef {
  key: string;
  /** FACEIT lifetime stat name. */
  stat: string;
  /** Extra per-player evidence a value needs before it counts. */
  minCount?: { stat: string; min: number };
}

const METRICS: MetricDef[] = [
  { key: "adr", stat: "ADR" },
  { key: "headshotPct", stat: "Average Headshots %" },
  { key: "clutch1v1", stat: "1v1 Win Rate", minCount: { stat: "Total 1v1 Count", min: MIN_CLUTCHES } },
  { key: "flashSuccess", stat: "Flash Success Rate" },
  { key: "flashesPerRound", stat: "Flashes per Round" },
  { key: "enemiesFlashedPerRound", stat: "Enemies Flashed per Round" },
  { key: "utilityDamagePerRound", stat: "Utility Damage per Round" },
  { key: "entrySuccess", stat: "Entry Success Rate", minCount: { stat: "Total Entry Count", min: MIN_ENTRIES } },
];

function num(stats: RawStats, key: string): number | null {
  const v = stats[key];
  if (v === undefined || v === "" || Array.isArray(v)) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function round(x: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

// ---------- HTTP ----------

let requests = 0;
let nextSlot = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + 1000 / REQUESTS_PER_SECOND;
  if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
}

class HttpError extends Error {
  status: number;
  constructor(status: number, path: string) {
    super(`${status} on ${path}`);
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    if (requests >= MAX_REQUESTS) throw new Error(`request budget (${MAX_REQUESTS}) exhausted`);
    await throttle();
    requests++;
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" },
      });
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new HttpError(res.status, path);
  }
}

// ---------- sampling ----------

interface RankingPage {
  items?: { player_id: string; game_skill_level?: number }[];
}
interface HistoryPage {
  items?: { teams?: Record<string, { players?: { player_id: string; skill_level?: number }[] }> }[];
}
interface RawPlayer {
  games?: { cs2?: { skill_level?: number; region?: string } };
}

interface Accepted {
  id: string;
  level: number;
  region: string | null;
  stats: RawStats;
}

const seen = new Set<string>();
const accepted = new Map<number, Accepted[]>();
for (let l = 1; l <= 10; l++) accepted.set(l, []);
const counts = { candidates: 0, rejectedRounds: 0, rejectedFull: 0, errors: 0 };

function needed(level: number | undefined): boolean {
  return level !== undefined && level >= 1 && level <= 10 && accepted.get(level)!.length < PER_LEVEL;
}

function allFull(): boolean {
  return [...accepted.values()].every((a) => a.length >= PER_LEVEL);
}

async function consider(id: string, hintLevel: number | undefined): Promise<void> {
  if (seen.has(id)) return;
  seen.add(id);
  if (hintLevel !== undefined && !needed(hintLevel) && !needed(hintLevel - 1) && !needed(hintLevel + 1)) return;
  counts.candidates++;
  try {
    const player = await get<RawPlayer>(`/players/${id}`);
    const level = player.games?.cs2?.skill_level;
    if (!needed(level)) {
      counts.rejectedFull++;
      return;
    }
    const raw = await get<{ lifetime?: RawStats }>(`/players/${id}/stats/cs2`);
    const lt = raw.lifetime ?? {};
    if ((num(lt, "Total Rounds with extended stats") ?? 0) < MIN_EXTENDED_ROUNDS) {
      counts.rejectedRounds++;
      return;
    }
    if (!needed(level)) return; // filled while we waited
    accepted.get(level!)!.push({ id, level: level!, region: player.games?.cs2?.region ?? null, stats: lt });
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return;
    if (e instanceof Error && e.message.includes("request budget")) throw e;
    counts.errors++;
  }
}

/** Runs `fn` over `items` with a small worker pool (the throttle does the pacing). */
async function pool<T>(items: T[], fn: (t: T) => Promise<void>, workers = 8): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

async function rankingDepth(region: string): Promise<number> {
  const has = async (offset: number) =>
    ((await get<RankingPage>(`/rankings/games/cs2/regions/${region}?offset=${offset}&limit=1`)).items ?? []).length > 0;
  if (!(await has(0))) return 0;
  let lo = 0;
  let hi = 1000;
  while (await has(hi)) {
    lo = hi;
    hi *= 2;
    if (hi > 50_000_000) return hi;
  }
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (await has(mid)) lo = mid;
    else hi = mid;
  }
  return lo + 1;
}

function shuffle<T>(xs: T[]): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

function progress(stage: string): void {
  const filled = [...accepted.entries()].map(([l, a]) => `${l}:${a.length}`).join(" ");
  console.error(`[${stage}] requests=${requests} ${filled}`);
}

async function seedFromRankings(): Promise<void> {
  const depths = new Map<string, number>();
  for (const region of REGIONS) {
    depths.set(region, await rankingDepth(region));
    console.error(`${region} ranking depth ≈ ${depths.get(region)}`);
  }
  const total = [...depths.values()].reduce((s, d) => s + d, 0);

  // Pages per region in proportion to its player count (with a floor so small regions still appear),
  // then one shuffled pool so no region fills the quotas before the others are looked at.
  const jobs: { region: string; offset: number }[] = [];
  for (const [region, depth] of depths) {
    if (depth === 0) continue;
    const n = Math.max(MIN_SEED_PAGES_PER_REGION, Math.round((SEED_PAGES * depth) / total));
    // The API requires offset to be a multiple of limit.
    const pages = Math.max(1, Math.floor(depth / PAGE_SIZE));
    for (let i = 0; i < n; i++) jobs.push({ region, offset: Math.floor(Math.random() * pages) * PAGE_SIZE });
  }

  const candidates: { id: string; level?: number }[] = [];
  await pool(jobs, async ({ region, offset }) => {
    let page: RankingPage;
    try {
      page = await get<RankingPage>(`/rankings/games/cs2/regions/${region}?offset=${offset}&limit=${PAGE_SIZE}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes("request budget")) throw e;
      counts.errors++;
      return;
    }
    // A handful per page keeps the seed spread across the ranking instead of clustered at one Elo.
    for (const p of shuffle(page.items ?? []).slice(0, 10)) candidates.push({ id: p.player_id, level: p.game_skill_level });
  });
  await pool(shuffle(candidates), (c) => consider(c.id, c.level));
  progress("seed");
}

async function snowball(): Promise<void> {
  const walked = new Set<string>();
  for (let round = 0; round < 50 && !allFull(); round++) {
    const short = [...accepted.entries()].filter(([, a]) => a.length < PER_LEVEL).map(([l]) => l);
    // Walk players at a short level or one away from it: their lobbies are full of the levels we need.
    const sources = [...accepted.values()]
      .flat()
      .filter((p) => !walked.has(p.id) && short.some((l) => Math.abs(l - p.level) <= 1))
      .slice(0, 20);
    if (sources.length === 0) break;
    const candidates: { id: string; level?: number }[] = [];
    await pool(sources, async (p) => {
      walked.add(p.id);
      try {
        const h = await get<HistoryPage>(`/players/${p.id}/history?game=cs2&limit=20`);
        for (const m of h.items ?? [])
          for (const team of Object.values(m.teams ?? {}))
            for (const pl of team.players ?? []) {
              if (needed(pl.skill_level)) candidates.push({ id: pl.player_id, level: pl.skill_level });
            }
      } catch {
        counts.errors++;
      }
    });
    await pool(shuffle(candidates), (c) => consider(c.id, c.level));
    progress(`snowball ${round + 1}`);
  }
}

// ---------- output ----------

function summarize() {
  const levels: Record<string, unknown> = {};
  for (const [level, players] of accepted) {
    const metrics: Record<string, { median: number; p25: number; p75: number; n: number }> = {};
    for (const def of METRICS) {
      const values = players
        .filter((p) => !def.minCount || (num(p.stats, def.minCount.stat) ?? 0) >= def.minCount.min)
        .map((p) => num(p.stats, def.stat))
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b);
      if (values.length === 0) continue;
      const digits = def.key === "adr" || def.key === "headshotPct" || def.key === "utilityDamagePerRound" ? 2 : 4;
      metrics[def.key] = {
        median: round(quantile(values, 0.5), digits),
        p25: round(quantile(values, 0.25), digits),
        p75: round(quantile(values, 0.75), digits),
        n: values.length,
      };
    }
    const regions: Record<string, number> = {};
    for (const p of players) regions[p.region ?? "?"] = (regions[p.region ?? "?"] ?? 0) + 1;
    levels[String(level)] = { players: players.length, regions, metrics };
  }
  return {
    generatedAt: new Date().toISOString(),
    source: "FACEIT Data API v4 (lifetime CS2 stats); see scripts/build-baselines.ts",
    minExtendedRounds: MIN_EXTENDED_ROUNDS,
    minClutches: MIN_CLUTCHES,
    minEntries: MIN_ENTRIES,
    levels,
  };
}

async function main(): Promise<void> {
  if (!API_KEY) console.error("warning: FACEIT_API_KEY is not set; requests will fail unless a proxy adds auth.");
  const started = Date.now();
  try {
    await seedFromRankings();
    await snowball();
  } catch (e) {
    console.error(`stopped early: ${(e as Error).message}`);
  }
  const out = summarize();
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.error(
    `done in ${Math.round((Date.now() - started) / 1000)}s, ${requests} requests, ` +
      `${counts.candidates} candidates (${counts.rejectedRounds} <${MIN_EXTENDED_ROUNDS} rounds, ` +
      `${counts.rejectedFull} level full, ${counts.errors} errors) → ${OUT}`,
  );
}

main();
