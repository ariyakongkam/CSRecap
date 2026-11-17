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
        <h1 className="text-xl font-semibold">This strat isn&apos;t in this browser</h1>
        <p className="mt-2 text-muted">Strats are saved in the browser they were made in. Open a share link to view one from someone else.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Back to your strats
        </Link>
      </main>
    );
  }
  if (!strat || !history) return <main className="p-8 text-muted">Loading…</main>;

  const selected = strat.objects.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
        <Link href="/" className="btn !px-2.5" aria-label="Back to your strats">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="hidden sm:block">
          <Logo />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{strat.name || "Untitled strat"}</h1>
          <p className="text-xs text-muted">
            {MAPS[strat.map].name} · {strat.side} side ·{" "}
            <span className={save === "failed" ? "text-danger" : ""}>
              {save === "saved" ? "Saved in this browser" : save === "saving" ? "Saving…" : "Couldn't save (browser storage full or blocked)"}
            </span>
          </p>
        </div>
        <button type="button" className="btn !px-2.5" onClick={() => setHistory(H.undo(history))} disabled={history.past.length === 0} title="Undo (Ctrl+Z)" aria-label="Undo">
          <Undo2 className="size-4" />
        </button>
        <button type="button" className="btn !px-2.5" onClick={() => setHistory(H.redo(history))} disabled={history.future.length === 0} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
          <Redo2 className="size-4" />
        </button>
        <button type="button" className="btn btn-primary" onClick={share}>
          <Link2 className="size-4" /> Share
        </button>
      </header>

      <div className="grid flex-1 gap-3 p-3 lg:grid-cols-[auto_minmax(0,1fr)_300px]">
        <div className="lg:pt-0">
          <Toolbar tool={tool} onTool={setTool} />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm text-muted">{toolHint(tool)}</p>
          <div className="relative mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-210px))] overflow-hidden rounded-xl border border-line">
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
            {notice && (
              <div role="status" className="absolute inset-x-4 top-4 mx-auto flex max-w-md items-center gap-2 rounded-lg border border-line bg-panel/95 px-3 py-2 text-sm shadow-lg">
                <Check className="size-4 shrink-0 text-accent" /> {notice}
              </div>
            )}
          </div>
          <Timeline strat={strat} time={time} onTime={setTime} playing={playing} onPlaying={setPlaying} onSelectEvent={setSelectedId} />
        </div>

        <aside className="rounded-xl border border-line bg-panel p-4">
          <Inspector strat={strat} selected={selected} onCommit={commit} onSelect={setSelectedId} />
        </aside>
      </div>
    </div>
  );
}
