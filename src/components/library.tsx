"use client";

import { CircleHelp, Download, Plus, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ImportDialog } from "@/components/import-dialog";
import { OpenFileButton, SharePlaybookDialog, downloadBundle } from "@/components/playbook-tools";
import { StratCard } from "@/components/strat-card";
import { Logo } from "@/components/logo";
import { MAPS, MAP_IDS, type MapId } from "@/lib/maps";
import type { Bundle } from "@/lib/strat/bundle";
import { createStrat } from "@/lib/strat/model";
import { listStrats, saveStrat } from "@/lib/strat/storage";
import { STRAT_TYPES, STRAT_TYPE_LABEL, type Side, type Strat, type StratType } from "@/lib/strat/types";
import { AiAnalyzeCard } from "@/components/ai-analyze";
import { MapCard } from "@/components/map-card";
import { Welcome } from "@/components/welcome";
import { loadPref, savePref } from "@/lib/strat/storage";

export function Library() {
  const router = useRouter();
  const [strats, setStrats] = useState<Strat[] | null>(null);
  const [map, setMap] = useState<MapId>("mirage");
  const [side, setSide] = useState<Side>("T");
  const [error, setError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [query, setQuery] = useState("");
  const [mapFilter, setMapFilter] = useState<MapId | "all">("all");
  const [sideFilter, setSideFilter] = useState<Side | "all">("all");
  const [typeFilter, setTypeFilter] = useState<StratType | "all">("all");
  const [bookFilter, setBookFilter] = useState("all");
  const [sharing, setSharing] = useState<Bundle | null>(null);
  const [incoming, setIncoming] = useState<Bundle | null>(null);
  const [importMessage, setImportMessage] = useState("");

  const books = useMemo(() => [...new Set((strats ?? []).map((s) => s.playbook ?? "").filter(Boolean))].sort((a, b) => a.localeCompare(b)), [strats]);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = (strats ?? []).filter(
      (s) =>
        (mapFilter === "all" || s.map === mapFilter) &&
        (sideFilter === "all" || s.side === sideFilter) &&
        (typeFilter === "all" || s.type === typeFilter) &&
        (bookFilter === "all" || (bookFilter === "__none" ? !s.playbook : s.playbook === bookFilter)) &&
        (!q || `${s.name} ${s.call} ${s.notes} ${s.playbook ?? ""}`.toLowerCase().includes(q)),
    );
    const byBook = new Map<string, Strat[]>();
    for (const s of shown) byBook.set(s.playbook ?? "", [...(byBook.get(s.playbook ?? "") ?? []), s]);
    // Playbooks A–Z, strats without a playbook last.
    return [...byBook.entries()].sort(([a], [b]) => (!a ? 1 : !b ? -1 : a.localeCompare(b)));
  }, [strats, query, mapFilter, sideFilter, typeFilter, bookFilter]);

  useEffect(() => {
    setStrats(listStrats());
    // First visit in this browser: introduce the app.
    if (!loadPref("welcomed", false, (v): v is boolean => typeof v === "boolean")) setWelcome(true);
  }, []);

  function closeWelcome() {
    savePref("welcomed", true);
    setWelcome(false);
  }

  function open(s: Strat) {
    if (!saveStrat(s)) {
      setError("Your browser didn't let us save. Storage is full or blocked, for example in a private window.");
      return;
    }
    router.push(`/edit?id=${s.id}`);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <div className="flex items-center gap-1">
          <a href="#new" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted hover:text-text">
            New strat
          </a>
          <button type="button" className="btn btn-icon border-transparent bg-transparent" onClick={() => setWelcome(true)} aria-label="What can I do here?" title="What can I do here?">
            <CircleHelp className="size-5" />
          </button>
        </div>
      </header>
      <Welcome
        open={welcome}
        onClose={closeWelcome}
        onBlank={() => {
          closeWelcome();
          // Let the coach pick the map and side first: go to the picker and put focus on the selected map.
          requestAnimationFrame(() => {
            document.getElementById("new")?.scrollIntoView({ behavior: "smooth", block: "start" });
            document.querySelector<HTMLButtonElement>("#new [aria-pressed=true]")?.focus({ preventScroll: true });
          });
        }}
      />

      <section id="new" className="mt-4 scroll-mt-6 rounded-2xl border border-line bg-panel p-5 sm:p-7">
        <h1 className="font-display text-4xl font-semibold">Start a strat</h1>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="label">Map</span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MAP_IDS.map((id) => (
                <MapCard key={id} id={id} selected={map === id} onClick={() => setMap(id)} />
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6">
            <div>
              <span className="label" id="side-label">
                Side
              </span>
              <div className="seg" role="group" aria-labelledby="side-label">
                {(["T", "CT"] as Side[]).map((s) => (
                  <button key={s} type="button" onClick={() => setSide(s)} aria-pressed={side === s}>
                    <span className={`mr-2 inline-block size-2.5 rounded-full ${s === "T" ? "bg-team-t" : "bg-team-ct"}`} aria-hidden="true" />
                    {s} side
                  </button>
                ))}
              </div>
            </div>
            <div>
              <button
                type="button"
                className="btn btn-primary w-full sm:w-auto"
                onClick={() => open(createStrat(map, side, `${MAPS[map].name} ${side} strat`))}
              >
                <Plus className="size-4" /> Create {MAPS[map].name} {side} strat
              </button>
              {error && (
                <p className="mt-2 text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="ai" className="mt-6">
        <AiAnalyzeCard headingId="ai" />
      </section>

      <section className="mt-12" aria-labelledby="your-strats">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="your-strats" className="font-display text-3xl font-semibold">
              Your strats
            </h2>
            <p className="mt-1 text-muted">Saved in this browser. Keep a backup file, so a cleared browser never costs you your playbook.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              disabled={!strats || strats.length === 0}
              onClick={() => strats && downloadBundle({ kind: "backup", name: "", strats })}
            >
              <Download className="size-4" aria-hidden="true" />
              Save backup
            </button>
            <OpenFileButton onBundle={setIncoming} onError={setImportMessage} />
          </div>
        </div>
        <p className="mt-2 min-h-6 text-sm text-muted" role="status">
          {importMessage}
        </p>

        {strats && strats.length > 0 && (
          <div className="mt-2 grid gap-3 rounded-xl border border-line bg-panel p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_auto_1fr_1fr]">
            <label className="block">
              <span className="label">Search</span>
              <input className="field" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, call or notes" />
            </label>
            <label className="block">
              <span className="label">Map</span>
              <select className="field" value={mapFilter} onChange={(e) => setMapFilter(e.target.value as MapId | "all")}>
                <option value="all">All maps</option>
                {MAP_IDS.map((m) => (
                  <option key={m} value={m}>
                    {MAPS[m].name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="label" id="side-filter">
                Side
              </span>
              <div className="seg" role="group" aria-labelledby="side-filter">
                {(["all", "T", "CT"] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={sideFilter === v} onClick={() => setSideFilter(v)}>
                    {v === "all" ? "Both" : v}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="label">Type</span>
              <select className="field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as StratType | "all")}>
                <option value="all">All types</option>
                {STRAT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {STRAT_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Playbook</span>
              <select className="field" value={bookFilter} onChange={(e) => setBookFilter(e.target.value)}>
                <option value="all">All playbooks</option>
                {books.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="__none">Not in a playbook</option>
              </select>
            </label>
          </div>
        )}

        {strats === null ? null : strats.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-line-strong p-8 text-center">
            <p className="text-muted">Nothing saved yet. Your strats show up here as soon as you start one, or open a backup or playbook file.</p>
            <a href="#new" className="btn mt-4">
              Start a strat
            </a>
          </div>
        ) : groups.length === 0 ? (
          <p className="mt-6 text-muted">No strats match these filters.</p>
        ) : (
          groups.map(([book, list]) => (
            <section key={book || "__none"} className="mt-8" aria-label={book ? `Playbook ${book}` : "Not in a playbook"}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                <h3 className="font-display text-2xl font-semibold">
                  {book || "Not in a playbook"} <span className="text-base font-normal text-muted">· {list.length}</span>
                </h3>
                {book && (
                  <button type="button" className="btn" onClick={() => setSharing({ kind: "playbook", name: book, strats: strats.filter((s) => s.playbook === book) })}>
                    <Share2 className="size-4" aria-hidden="true" />
                    Share playbook
                  </button>
                )}
              </div>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {list.map((s) => (
                  <StratCard key={s.id} s={s} onChanged={() => setStrats(listStrats())} />
                ))}
              </ul>
            </section>
          ))
        )}
      </section>

      <SharePlaybookDialog bundle={sharing} onClose={() => setSharing(null)} />
      <ImportDialog
        bundle={incoming}
        onClose={() => setIncoming(null)}
        onDone={(message) => {
          setIncoming(null);
          setImportMessage(message);
          setStrats(listStrats());
        }}
      />
    </main>
  );
}
