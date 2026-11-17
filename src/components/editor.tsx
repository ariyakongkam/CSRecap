"use client";

import { ArrowLeft, Check, Link2, Redo2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Board, type Tool } from "@/components/board";
import { Inspector } from "@/components/inspector";
import { Logo } from "@/components/logo";
import { Timeline } from "@/components/timeline";
import { Toolbar, TOOL_KEYS, toolHint } from "@/components/toolbar";
import { MAPS } from "@/lib/maps";
import * as H from "@/lib/strat/history";
import { removeObject } from "@/lib/strat/model";
import { shareUrl } from "@/lib/strat/share";
import { loadStrat, saveStrat } from "@/lib/strat/storage";
import type { Strat } from "@/lib/strat/types";

type SaveState = "saved" | "saving" | "failed";

export function Editor({ id }: { id: string }) {
  const [history, setHistory] = useState<H.History | null>(null);
  const [missing, setMissing] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [save, setSave] = useState<SaveState>("saved");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const s = loadStrat(id);
    if (s) setHistory(H.initHistory(s));
    else setMissing(true);
  }, [id]);

  const strat = history?.present ?? null;

  // Autosave shortly after the last change.
  const firstLoad = useRef(true);
  useEffect(() => {
    if (!strat) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setSave("saving");
    const t = setTimeout(() => setSave(saveStrat(strat) ? "saved" : "failed"), 400);
    return () => clearTimeout(t);
  }, [strat]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const commit = useCallback((next: Strat) => setHistory((h) => (h ? H.commit(h, next) : h)), []);
  const checkpoint = useCallback(() => setHistory((h) => (h ? H.checkpoint(h) : h)), []);
  const live = useCallback((next: Strat) => setHistory((h) => (h ? H.live(h, next) : h)), []);

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setHistory((h) => (h ? (e.shiftKey ? H.redo(h) : H.undo(h)) : h));
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        setHistory((h) => (h ? H.redo(h) : h));
        return;
      }
      if (mod) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        setHistory((h) => (h ? H.commit(h, removeObject(h.present, selectedId)) : h));
        setSelectedId(null);
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setTool("select");
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => {
          if (!p) setTime((t) => (t === null ? 0 : t));
          return !p;
        });
        return;
      }
      const next = TOOL_KEYS[e.key.toLowerCase()];
      if (next) setTool(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  async function share() {
    if (!strat) return;
    const url = shareUrl(window.location.origin, strat);
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Share link copied. Anyone with it can view this strat.");
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  if (missing) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">This strat isn&apos;t in this browser</h1>
        <p className="mt-2 text-muted">Strats are saved in the browser they were made in. To see someone else&apos;s, open their share link.</p>
        <Link href="/" className="btn btn-primary mt-6">
          All strats
        </Link>
      </main>
    );
  }
  if (!strat || !history) return <main className="p-8 text-muted">Loading…</main>;

  const selected = strat.objects.find((o) => o.id === selectedId) ?? null;

  const saveLabel = save === "saved" ? "Saved" : save === "saving" ? "Saving…" : "Not saved: browser storage is full or blocked";
  const isEmpty = strat.objects.length === 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2 sm:gap-3 sm:px-4">
        <Link href="/" className="btn btn-icon shrink-0" aria-label="All strats">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="hidden shrink-0 md:block">
          <Logo />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-semibold">{strat.name || "Untitled strat"}</h1>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="rounded border border-line px-1.5 py-0.5">{MAPS[strat.map].name}</span>
            <span className={`rounded px-1.5 py-0.5 font-semibold text-bg ${strat.side === "T" ? "bg-team-t" : "bg-team-ct"}`}>{strat.side} side</span>
            <span className={`hidden sm:inline ${save === "failed" ? "text-danger" : ""}`} role="status">
              {saveLabel}
            </span>
          </div>
        </div>
        <button type="button" className="btn btn-icon hidden shrink-0 sm:inline-flex" onClick={() => setHistory(H.undo(history))} disabled={history.past.length === 0} title="Undo (Ctrl+Z)" aria-label="Undo">
          <Undo2 className="size-4" />
        </button>
        <button type="button" className="btn btn-icon hidden shrink-0 sm:inline-flex" onClick={() => setHistory(H.redo(history))} disabled={history.future.length === 0} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
          <Redo2 className="size-4" />
        </button>
        <button type="button" className="btn btn-primary shrink-0" onClick={share}>
          <Link2 className="size-4" /> Share
        </button>
      </header>

      <div className="grid flex-1 gap-3 p-3 lg:grid-cols-[auto_minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Toolbar tool={tool} onTool={setTool} />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <p className="mx-auto w-full max-w-[min(100%,calc(100dvh-190px))] text-sm text-muted" aria-live="polite">
            {toolHint(tool)}
          </p>
          <div className="relative mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-190px))] overflow-hidden rounded-xl border border-line">
            <Board
              strat={strat}
              time={time}
              tool={tool}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCommit={commit}
              onCheckpoint={checkpoint}
              onLive={live}
              onNotice={setNotice}
            />
            {isEmpty && tool === "select" && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
                <div className="pointer-events-auto max-w-xs rounded-xl border border-line bg-bg/95 p-5 text-center shadow-2xl">
                  <h2 className="font-display text-2xl font-semibold">Place your five</h2>
                  <p className="mt-1 text-sm text-muted">Start with the players, then draw where each one goes.</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <button type="button" className="btn btn-primary" onClick={() => setTool(strat.side)}>
                      Place {strat.side} players
                    </button>
                  </div>
                </div>
              </div>
            )}
            {notice && (
              <div role="status" className="absolute inset-x-4 top-4 mx-auto flex max-w-md items-center gap-2 rounded-lg border border-line bg-panel/95 px-3 py-2 text-sm shadow-lg">
                <Check className="size-4 shrink-0 text-chalk" /> {notice}
              </div>
            )}
          </div>
          <Timeline strat={strat} time={time} onTime={setTime} playing={playing} onPlaying={setPlaying} onSelectEvent={setSelectedId} />
        </div>

        <aside className="min-w-0 rounded-xl border border-line bg-panel p-4">
          <Inspector strat={strat} selected={selected} onCommit={commit} onSelect={setSelectedId} />
        </aside>
      </div>
    </div>
  );
}
