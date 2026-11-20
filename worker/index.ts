/**
 * radstrat's small server: Steam sign-in and saving strats to the player's account.
 * Everything else is the static site in out/, served by Cloudflare before this code runs
 * (only /api/* reaches it, see wrangler.jsonc).
 *
 * What is stored, and nothing more: the SteamID64, the player's strats, and login sessions
 * (only a SHA-256 fingerprint of the session code, never the code itself).
 * Without a D1 database bound as DB, every API answers "not enabled" and the site works as before.
 */
import { compact, parseStrat } from "../src/lib/strat/model";
import { steamLoginUrl, verifySteamCallback } from "./steam";

export interface Env {
  DB?: D1Database;
}

const SESSION_COOKIE = "__Host-rs";
const STATE_COOKIE = "__Host-rs-state";
const SESSION_DAYS = 30;
const MAX_STRATS = 1000;
const MAX_BODY = 256 * 1024;

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS users (steam_id TEXT PRIMARY KEY, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, steam_id TEXT NOT NULL, expires_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions (steam_id)",
  "CREATE TABLE IF NOT EXISTS strats (steam_id TEXT NOT NULL, id TEXT NOT NULL, data TEXT, updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (steam_id, id))",
  "CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, created_at INTEGER NOT NULL)",
];
let schemaReady: Promise<void> | null = null;
function ensureSchema(db: D1Database): Promise<void> {
  schemaReady ??= db.batch(SCHEMA.map((s) => db.prepare(s))).then(() => undefined);
  return schemaReady;
}

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

function cookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function randomToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** The signed-in player for this request, or null. */
async function currentUser(req: Request, db: D1Database): Promise<string | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const row = await db
    .prepare("SELECT steam_id FROM sessions WHERE token_hash = ? AND expires_at > ?")
    .bind(await sha256(token), Date.now())
    .first<{ steam_id: string }>();
  return row?.steam_id ?? null;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    if (!path.startsWith("/api/")) return new Response("Not found", { status: 404 });
    if (!env.DB) return json({ enabled: false }, path === "/api/me" ? 200 : 503);
    const db = env.DB;
    await ensureSchema(db);

    // Changes must come from radstrat itself (on top of SameSite cookies).
    if (req.method !== "GET" && req.headers.get("origin") !== url.origin) return json({ error: "forbidden" }, 403);

    const callback = `${url.origin}/api/auth/steam/callback`;

    if (path === "/api/auth/steam" && req.method === "GET") {
      // A one-time value ties Steam's answer to this browser, so nobody can sign you in to their account.
      const state = randomToken();
      return new Response(null, {
        status: 302,
        headers: { location: steamLoginUrl(url.origin, `${callback}?state=${state}`), "set-cookie": cookie(STATE_COOKIE, state, 600), "cache-control": "no-store" },
      });
    }

    if (path === "/api/auth/steam/callback" && req.method === "GET") {
      const state = url.searchParams.get("state") ?? "";
      const expected = readCookie(req, STATE_COOKIE);
      const fail = (reason: string) =>
        new Response(null, {
          status: 302,
          headers: { location: `/app?signin=failed&why=${encodeURIComponent(reason)}`, "set-cookie": cookie(STATE_COOKIE, "", 0) },
        });
      if (!state || !expected || state !== expected) return fail("expired");
      const check = await verifySteamCallback(url, `${callback}?state=${state}`);
      if (!check.ok) return fail(check.reason);
      // Each Steam answer can be used once.
      const fresh = await db.prepare("INSERT OR IGNORE INTO nonces (nonce, created_at) VALUES (?, ?)").bind(check.nonce, Date.now()).run();
      if (!fresh.meta.changes) return fail("used twice");
      const token = randomToken();
      const now = Date.now();
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO users (steam_id, created_at) VALUES (?, ?)").bind(check.steamId, now),
        db.prepare("INSERT INTO sessions (token_hash, steam_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), check.steamId, now + SESSION_DAYS * 864e5),
        db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
        db.prepare("DELETE FROM nonces WHERE created_at < ?").bind(now - 864e5),
      ]);
      const headers = new Headers({ location: "/app?signedin=1", "cache-control": "no-store" });
      headers.append("set-cookie", cookie(SESSION_COOKIE, token, SESSION_DAYS * 86400));
      headers.append("set-cookie", cookie(STATE_COOKIE, "", 0));
      return new Response(null, { status: 302, headers });
    }

    const steamId = await currentUser(req, db);

    if (path === "/api/me" && req.method === "GET") return json({ enabled: true, signedIn: !!steamId, steamId });

    if (path === "/api/auth/logout" && req.method === "POST") {
      const token = readCookie(req, SESSION_COOKIE);
      if (token) await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
      return json({ ok: true }, 200, { "set-cookie": cookie(SESSION_COOKIE, "", 0) });
    }

    if (!steamId) return json({ error: "sign in first" }, 401);

    if (path === "/api/strats" && req.method === "GET") {
      const { results } = await db.prepare("SELECT id, data, updated_at, deleted FROM strats WHERE steam_id = ?").bind(steamId).all<{
        id: string;
        data: string | null;
        updated_at: string;
        deleted: number;
      }>();
      return json({
        strats: results.filter((r) => !r.deleted && r.data).map((r) => JSON.parse(r.data as string)),
        deleted: results.filter((r) => r.deleted).map((r) => ({ id: r.id, deletedAt: r.updated_at })),
      });
    }

    const one = /^\/api\/strats\/([A-Za-z0-9_-]{1,40})$/.exec(path);
    if (one && req.method === "PUT") {
      const text = await req.text();
      if (text.length > MAX_BODY) return json({ error: "too big" }, 413);
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        return json({ error: "not json" }, 400);
      }
      const strat = parseStrat(raw);
      if (!strat || strat.id !== one[1]) return json({ error: "not a strat" }, 400);
      const exists = await db.prepare("SELECT 1 FROM strats WHERE steam_id = ? AND id = ?").bind(steamId, strat.id).first();
      if (!exists) {
        const count = await db.prepare("SELECT COUNT(*) AS n FROM strats WHERE steam_id = ? AND deleted = 0").bind(steamId).first<{ n: number }>();
        if ((count?.n ?? 0) >= MAX_STRATS) return json({ error: "too many strats" }, 409);
      }
      await db
        .prepare(
          "INSERT INTO strats (steam_id, id, data, updated_at, deleted) VALUES (?, ?, ?, ?, 0) ON CONFLICT (steam_id, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, deleted = 0",
        )
        .bind(steamId, strat.id, JSON.stringify(compact(strat)), strat.updatedAt)
        .run();
      return json({ ok: true });
    }
    if (one && req.method === "DELETE") {
      // Kept as a marker without the strat itself, so your other PC knows to remove it too.
      await db
        .prepare(
          "INSERT INTO strats (steam_id, id, data, updated_at, deleted) VALUES (?, ?, NULL, ?, 1) ON CONFLICT (steam_id, id) DO UPDATE SET data = NULL, updated_at = excluded.updated_at, deleted = 1",
        )
        .bind(steamId, one[1], new Date().toISOString())
        .run();
      return json({ ok: true });
    }

    if (path === "/api/account/export" && req.method === "GET") {
      const { results } = await db.prepare("SELECT data FROM strats WHERE steam_id = ? AND deleted = 0").bind(steamId).all<{ data: string }>();
      const body = { app: "radstrat", v: 1, kind: "backup", name: "", exportedAt: new Date().toISOString(), account: { steamId }, strats: results.map((r) => JSON.parse(r.data)) };
      return new Response(JSON.stringify(body, null, 1), {
        headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="radstrat-my-data.json"', "cache-control": "no-store" },
      });
    }

    if (path === "/api/account" && req.method === "DELETE") {
      await db.batch([
        db.prepare("DELETE FROM strats WHERE steam_id = ?").bind(steamId),
        db.prepare("DELETE FROM sessions WHERE steam_id = ?").bind(steamId),
        db.prepare("DELETE FROM users WHERE steam_id = ?").bind(steamId),
      ]);
      return json({ ok: true }, 200, { "set-cookie": cookie(SESSION_COOKIE, "", 0) });
    }

    return json({ error: "not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
