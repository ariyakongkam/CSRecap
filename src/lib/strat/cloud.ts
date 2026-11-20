"use client";

/**
 * Saving strats to the player's Steam account, so they show up on every PC.
 * The browser stays the main copy (fast, works offline); when signed in, every save and delete
 * is also sent to the account, and opening radstrat pulls in what changed on other PCs.
 * The newest version of a strat wins (by its save time).
 */
import { parseStrat } from "./model";
import { listStrats, setSyncHook, writeFromCloud } from "./storage";
import type { Strat } from "./types";

export interface Account {
  /** The server side exists (a database is set up). Without it, there is no sign-in. */
  enabled: boolean;
  signedIn: boolean;
  steamId?: string;
}

export type SyncStatus = "off" | "syncing" | "synced" | "offline";

const listeners = new Set<(s: SyncStatus) => void>();
let status: SyncStatus = "off";
function setStatus(s: SyncStatus) {
  status = s;
  for (const l of listeners) l(s);
}
export function onSyncStatus(l: (s: SyncStatus) => void): () => void {
  listeners.add(l);
  l(status);
  return () => listeners.delete(l);
}

let account: Promise<Account> | null = null;
export function getAccount(refresh = false): Promise<Account> {
  if (!account || refresh) {
    account = fetch("/api/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => (r.ok ? ((await r.json()) as Account) : { enabled: false, signedIn: false }))
      .catch(() => ({ enabled: false, signedIn: false }));
  }
  return account;
}

const send = (path: string, init: RequestInit) =>
  fetch(path, { credentials: "same-origin", headers: { "content-type": "application/json" }, ...init }).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r;
  });

/** What syncing would do: pure, so it can be tested. */
export function planSync(local: Strat[], remote: Strat[], tombstones: { id: string; deletedAt: string }[]) {
  const mine = new Map(local.map((s) => [s.id, s]));
  const theirs = new Map(remote.map((s) => [s.id, s]));
  const download: Strat[] = [];
  const upload: Strat[] = [];
  const removeLocal: string[] = [];
  for (const t of tombstones) {
    const l = mine.get(t.id);
    if (l && l.updatedAt <= t.deletedAt) removeLocal.push(t.id);
  }
  for (const r of remote) {
    const l = mine.get(r.id);
    if (!l || l.updatedAt < r.updatedAt) download.push(r);
    else if (l.updatedAt > r.updatedAt) upload.push(l);
  }
  for (const l of local) {
    if (theirs.has(l.id) || removeLocal.includes(l.id)) continue;
    const t = tombstones.find((x) => x.id === l.id);
    if (!t || l.updatedAt > t.deletedAt) upload.push(l);
  }
  return { download, upload, removeLocal };
}

/** Brings this browser and the account in line. Returns how many strats changed here. */
export async function syncNow(): Promise<number> {
  setStatus("syncing");
  try {
    const r = await send("/api/strats", { method: "GET" });
    const data = (await r.json()) as { strats: unknown[]; deleted: { id: string; deletedAt: string }[] };
    const remote = data.strats.map(parseStrat).filter((s): s is Strat => s !== null);
    const plan = planSync(listStrats(), remote, data.deleted);
    if (plan.download.length || plan.removeLocal.length) writeFromCloud(plan.download, plan.removeLocal);
    await Promise.all(plan.upload.map((s) => send(`/api/strats/${s.id}`, { method: "PUT", body: JSON.stringify(s) })));
    setStatus("synced");
    return plan.download.length + plan.removeLocal.length;
  } catch {
    setStatus("offline");
    return 0;
  }
}

/** From now on, send every save and delete to the account (saves are bundled per strat for a moment). */
export function startAutoSync(): void {
  const pending = new Map<string, Strat>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = async () => {
    timer = null;
    const batch = [...pending.values()];
    pending.clear();
    setStatus("syncing");
    try {
      await Promise.all(batch.map((s) => send(`/api/strats/${s.id}`, { method: "PUT", body: JSON.stringify(s) })));
      setStatus("synced");
    } catch {
      for (const s of batch) if (!pending.has(s.id)) pending.set(s.id, s);
      setStatus("offline");
    }
  };
  setSyncHook({
    saved: (list) => {
      for (const s of list) pending.set(s.id, s);
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 1200);
    },
    deleted: (id) => {
      pending.delete(id);
      send(`/api/strats/${id}`, { method: "DELETE" }).catch(() => setStatus("offline"));
    },
  });
}

export async function signOut(): Promise<void> {
  setSyncHook(null);
  await send("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  setStatus("off");
  await getAccount(true);
}

export async function deleteAccount(): Promise<boolean> {
  try {
    await send("/api/account", { method: "DELETE" });
    setSyncHook(null);
    setStatus("off");
    await getAccount(true);
    return true;
  } catch {
    return false;
  }
}
