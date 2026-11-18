"use client";

import { ArrowLeft, Check, Eraser, Link2, Redo2, Save, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Board, type Tool } from "@/components/board";
import { CalloutToggle } from "@/components/callout-toggle";
import { ConfirmDialog, Modal } from "@/components/dialog";
import { Inspector } from "@/components/inspector";
import { Logo } from "@/components/logo";
import { MapCard } from "@/components/map-card";
import { PhaseBar, phaseDuration } from "@/components/phase-bar";
import { Toolbar, TOOL_KEYS, toolHint } from "@/components/toolbar";
import { MAPS, MAP_IDS } from "@/lib/maps";
import * as H from "@/lib/strat/history";
import { continueStep, move, removeObject } from "@/lib/strat/model";
import { shareUrl } from "@/lib/strat/share";
import { deleteStrat, loadPref, loadStrat, savePref, saveStrat } from "@/lib/strat/storage";
import { stratDuration } from "@/lib/strat/timeline";
import { DEFAULT_PEN, MARKER_TYPES, isHexColor, sceneOf, type MarkerType, type BoardObject, type DrawShape, type PenSettings, type Strat } from "@/lib/strat/types";

type SaveState = { status: "saved" | "saving" | "failed"; at: Date | null };
type Confirm = "clear" | "delete" | null;

const TOOLS = new Set<string>(Object.values(TOOL_KEYS));
const isTool = (v: unknown): v is Tool => typeof v === "string" && TOOLS.has(v);
const isMarker = (v: unknown): v is MarkerType => typeof v === "string" && (MARKER_TYPES as string[]).includes(v);
const SHAPES: DrawShape[] = ["free", "line", "arrow", "rect", "dashed", "dashed-arrow"];
const isPen = (v: unknown): v is PenSettings => {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    SHAPES.includes(p.shape as DrawShape) &&
    isHexColor(p.color) &&
    typeof p.opacity === "number" &&
    p.opacity >= 0.1 &&
    p.opacity <= 1 &&
    typeof p.width === "number" &&
    p.width >= 1 &&
    p.width <= 16
  );
};
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isIndex = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

export function Editor({ id }: { id: string }) {
  const router = useRouter();
  const [history, setHistory] = useState<H.History | null>(null);
  const [missing, setMissing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tool, setTool] = useState<Tool>("select");
  const [pen, setPen] = useState<PenSettings>(DEFAULT_PEN);
  const [marker, setMarker] = useState<MarkerType>("anchor");
  const [relocate, setRelocate] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // "Move to…" belongs to the selected item; picking something else cancels it.
  if (relocate && relocate !== selectedId) setRelocate(null);
  const [time, setTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [save, setSave] = useState<SaveState>({ status: "saved", at: null });
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [mapPicker, setMapPicker] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [callouts, setCallouts] = useState(false);

  // Load the strat and the cached editor preferences.
  useEffect(() => {
    const s = loadStrat(id);
    if (!s) {
      setMissing(true);
      return;
    }
    setHistory(H.initHistory(s));
    setStepIndex(Math.min(loadPref(`step:${id}`, 0, isIndex), s.steps.length - 1));
    setTool(loadPref("tool", "select", isTool));
    setPen(loadPref("pen2", DEFAULT_PEN, isPen));
    setMarker(loadPref("marker", "anchor", isMarker));
    setCallouts(loadPref("callouts", false, isBool));
    setPrefsLoaded(true);
  }, [id]);

  useEffect(() => {
    if (!prefsLoaded) return;
    savePref("tool", tool);
    savePref("pen2", pen);
    savePref("marker", marker);
    savePref(`step:${id}`, stepIndex);
    savePref("callouts", callouts);
  }, [prefsLoaded, id, tool, pen, marker, stepIndex, callouts]);

  const strat = history?.present ?? null;

  // Everything is written to the browser cache shortly after each change.
  const firstLoad = useRef(true);
  const doSave = useCallback((s: Strat) => {
    const ok = saveStrat(s);
    setSave({ status: ok ? "saved" : "failed", at: ok ? new Date() : null });
    return ok;
  }, []);
  useEffect(() => {
    if (!strat) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setSave((s) => ({ ...s, status: "saving" }));
    const t = setTimeout(() => doSave(strat), 400);
    return () => clearTimeout(t);
  }, [strat, doSave]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2800);
    return () => clearTimeout(t);
  }, [notice]);

  const step = strat ? strat.steps[Math.min(stepIndex, strat.steps.length - 1)] : null;
  const withObjects = useCallback(
    (s: Strat, objects: BoardObject[]): Strat => ({
      ...s,
      steps: s.steps.map((st, i) => (i === Math.min(stepIndex, s.steps.length - 1) ? { ...st, objects } : st)),
    }),
    [stepIndex],
  );

  const commitObjects = useCallback((o: BoardObject[]) => setHistory((h) => (h ? H.commit(h, withObjects(h.present, o)) : h)), [withObjects]);
  const liveObjects = useCallback((o: BoardObject[]) => setHistory((h) => (h ? H.live(h, withObjects(h.present, o)) : h)), [withObjects]);
  const checkpoint = useCallback(() => setHistory((h) => (h ? H.checkpoint(h) : h)), []);

  // Typing in a field is one undo step per burst, not one per key.
  const lastTyping = useRef(0);
  const commitStrat = useCallback((next: Strat) => {
    const now = Date.now();
    const burst = now - lastTyping.current < 1200;
    lastTyping.current = now;
    setHistory((h) => (h ? (burst ? H.live(h, next) : H.commit(h, next)) : h));
  }, []);
  const commitStratNow = useCallback((next: Strat) => setHistory((h) => (h ? H.commit(h, next) : h)), []);

  function goToStep(i: number) {
    setStepIndex(i);
    setSelectedId(null);
    setPlaying(false);
    setTime(null);
  }

  /** Plays every phase in order, from the first. */
  const startPlay = useCallback(() => {
    setSelectedId(null);
    setStepIndex(0);
    setTime(0);
    setPlaying(true);
  }, []);
  const stopPlay = useCallback(() => {
    setPlaying(false);
    setTime(null);
  }, []);

  // Keyboard shortcuts (ignored while typing in a field or a dialog is open).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, dialog")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (strat && doSave(strat)) setNotice("Strategy saved.");
        return;
      }
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
        setHistory((h) => {
          if (!h) return h;
          const i = Math.min(stepIndex, h.present.steps.length - 1);
          return H.commit(h, withObjects(h.present, removeObject(h.present.steps[i].objects, selectedId)));
        });
        setSelectedId(null);
        return;
      }
      if (e.key === "Escape") {
        setRelocate(null);
        setSelectedId(null);
        setTool("select");
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        if (playing) stopPlay();
        else startPlay();
        return;
      }
      const next = TOOL_KEYS[e.key.toLowerCase()];
      if (next) setTool(next);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, stepIndex, withObjects, strat, doSave, playing, startPlay, stopPlay]);

  async function share() {
    if (!strat) return;
    const url = shareUrl(window.location.origin, strat);
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Share link copied. Anyone with it can view this strategy.");
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  if (missing) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">This strategy isn&apos;t in this browser</h1>
        <p className="mt-2 text-muted">Strategies are saved in the browser they were made in. To see someone else&apos;s, open their share link.</p>
        <Link href="/app" className="btn btn-primary mt-6">
          All strategies
        </Link>
      </main>
    );
  }
  if (!strat || !history || !step) return <main className="p-8 text-muted">Loading…</main>;

  const current = Math.min(stepIndex, strat.steps.length - 1);
  const scene = sceneOf(strat, step);
  const selected = step.objects.find((o) => o.id === selectedId) ?? null;
  const isEmpty = step.objects.length === 0;
  const savedLabel =
    save.status === "saving"
      ? "Saving…"
      : save.at
        ? `Saved at ${save.at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} in this browser`
        : "Saved in this browser";

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2 sm:gap-3 sm:px-4">
        <Link href="/app" className="btn btn-icon shrink-0" aria-label="All strategies">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="hidden shrink-0 xl:block">
          <Logo href="/app" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-semibold" title={strat.name || "Untitled strat"}>{strat.name || "Untitled strat"}</h1>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setMapPicker(true)}
              className="inline-flex min-h-6 items-center rounded border border-line px-2 text-muted hover:border-line-strong hover:text-text"
              title="Change map"
              aria-label={`Map: ${MAPS[strat.map].name}. Change map`}
            >
              {MAPS[strat.map].name}
            </button>
            <span className={`rounded px-1.5 py-0.5 font-semibold text-bg ${strat.side === "T" ? "bg-team-t" : "bg-team-ct"}`}>{strat.side} side</span>
            <span id="save-status" role="status" className={`hidden sm:inline ${save.status === "failed" ? "text-danger" : "text-muted"}`}>
              {save.status === "failed" ? "Not saved: this browser's storage is full or blocked" : savedLabel}
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <button type="button" className="btn btn-icon" onClick={() => setHistory(H.undo(history))} disabled={history.past.length === 0} title="Undo (Ctrl+Z)" aria-label="Undo">
            <Undo2 className="size-4" />
          </button>
          <button type="button" className="btn btn-icon" onClick={() => setHistory(H.redo(history))} disabled={history.future.length === 0} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
            <Redo2 className="size-4" />
          </button>
        </div>
        <button type="button" className="btn shrink-0 max-lg:w-11 max-lg:px-0" onClick={() => setConfirm("clear")} disabled={isEmpty} title="Clear this phase's board" aria-label="Clear board">
          <Eraser className="size-4" />
          <span className="max-lg:hidden">Clear board</span>
        </button>
        <button
          type="button"
          className={`btn shrink-0 max-sm:w-11 max-sm:px-0 ${save.status === "failed" ? "border-danger text-danger" : ""}`}
          onClick={() => {
            if (doSave(strat)) setNotice("Strategy saved.");
          }}
          title="Save (Ctrl+S)"
          aria-label="Save strategy"
          aria-describedby="save-status"
        >
          {save.status === "saved" ? <Check className="size-4" /> : <Save className="size-4" />}
          <span className="max-sm:hidden">{save.status === "saved" ? "Saved" : "Save"}</span>
        </button>
        <button type="button" className="btn btn-primary shrink-0 max-sm:w-11 max-sm:px-0" onClick={share} aria-label="Copy share link">
          <Link2 className="size-4" />
          <span className="max-sm:hidden">Share</span>
        </button>
      </header>

      <div className="grid flex-1 gap-3 p-3 lg:grid-cols-[auto_minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Toolbar tool={tool} onTool={setTool} side={strat.side} />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="mx-auto flex w-full max-w-[min(100%,calc(100dvh-250px))] lg:max-w-[min(100%,calc(100dvh-285px))] xl:max-w-[min(100%,calc(100dvh-275px))] items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {relocate ? "Click where it should go. Esc cancels." : toolHint(tool)}
            </p>
            <CalloutToggle on={callouts} onChange={setCallouts} />
          </div>
          <div className="board-frame relative mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-250px))] lg:max-w-[min(100%,calc(100dvh-285px))] xl:max-w-[min(100%,calc(100dvh-275px))] overflow-hidden rounded-xl border border-line">
            <Board
              scene={scene}
              time={time}
              tool={tool}
              pen={pen}
              marker={marker}
              relocate={relocate}
              onRelocated={() => setRelocate(null)}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCommit={commitObjects}
              onCheckpoint={checkpoint}
              onLive={liveObjects}
              onNotice={setNotice}
              callouts={callouts}
              onToolDone={() => setTool("select")}
            />
            <p id="board-keys" className="sr-only">
              Arrow keys move the cursor, or the selected item when Select is on. Hold Shift to move further. Enter places
              with the current tool, or selects what is under the cursor. Delete removes the selected item and Escape deselects it. The letters on
              the toolbar buttons switch tools.
            </p>
            {isEmpty && tool === "select" && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
                <div className="pointer-events-auto max-w-xs rounded-xl border border-line bg-bg/95 p-5 text-center shadow-2xl">
                  <h2 className="font-display text-2xl font-semibold">Place your five</h2>
                  <p className="mt-1 text-sm text-muted">Each click places one item, then you&apos;re back on the cursor. Pick the teammate tool again for the next one.</p>
                  <button type="button" className="btn btn-primary mt-4" onClick={() => setTool("mate")}>
                    Place a teammate
                  </button>
                </div>
              </div>
            )}
            {notice && (
              <div role="status" className="absolute inset-x-4 top-4 mx-auto flex max-w-md items-center gap-2 rounded-lg border border-line bg-panel/95 px-3 py-2 text-sm shadow-lg">
                <Check className="size-4 shrink-0 text-chalk" /> {notice}
              </div>
            )}
          </div>
          <PhaseBar
            steps={strat.steps}
            current={current}
            durations={strat.steps.map((st) => phaseDuration(stratDuration(sceneOf(strat, st))))}
            time={time}
            playing={playing}
            onSelect={goToStep}
            onAdvance={setStepIndex}
            onTime={setTime}
            onPlay={startPlay}
            onStop={stopPlay}
            onAdd={() => {
              const next = continueStep(step, `Phase ${strat.steps.length + 1}`);
              const steps = [...strat.steps.slice(0, current + 1), next, ...strat.steps.slice(current + 1)];
              commitStratNow({ ...strat, steps });
              goToStep(current + 1);
              setNotice(`Phase ${current + 2} added with everything from phase ${current + 1}. Players start where their routes ended.`);
            }}
            onRename={(name) => commitStrat({ ...strat, steps: strat.steps.map((s, i) => (i === current ? { ...s, name } : s)) })}
            onMove={(dir) => {
              commitStratNow({ ...strat, steps: move(strat.steps, current, current + dir) });
              setStepIndex(current + dir);
            }}
            onDelete={() => {
              commitStratNow({ ...strat, steps: strat.steps.filter((_, i) => i !== current) });
              goToStep(Math.max(0, current - 1));
              setNotice(`Phase ${current + 1} deleted. Undo with Ctrl+Z.`);
            }}
          />
        </div>

        <aside className="min-w-0 rounded-xl border border-line bg-panel p-4">
          <Inspector
            strat={strat}
            scene={scene}
            selected={selected}
            onObjects={commitObjects}
            onStrat={commitStrat}
            onSelect={setSelectedId}
            onPickMap={() => setMapPicker(true)}
            tool={tool}
            pen={pen}
            onPen={setPen}
            marker={marker}
            onMarker={setMarker}
            onDeleteStrat={() => setConfirm("delete")}
            relocating={relocate}
            onRelocate={setRelocate}
          />
        </aside>
      </div>

      <Modal open={mapPicker} onClose={() => setMapPicker(false)} title="Change map" wide>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MAP_IDS.map((m) => (
            <MapCard
              key={m}
              id={m}
              selected={strat.map === m}
              onClick={() => {
                if (m !== strat.map) {
                  commitStratNow({ ...strat, map: m });
                  setNotice(`Map changed to ${MAPS[m].name}. Everything kept its spot; move it to fit.`);
                }
                setMapPicker(false);
              }}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-faint">Radar overviews and screenshots © Valve Corporation.</p>
      </Modal>

      <ConfirmDialog
        open={confirm === "clear"}
        title={`Clear step ${current + 1}, ${step.name}?`}
        body="This removes every player, route, grenade, drawing and note on this phase's board. You can undo it with Ctrl+Z."
        confirmLabel="Clear board"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          commitObjects([]);
          setSelectedId(null);
          setConfirm(null);
          setNotice("Board cleared. Undo with Ctrl+Z.");
        }}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title={`Delete ${strat.name || "this strategy"}?`}
        body="This removes the strategy and all its phases from this browser. It can't be undone. Share links you already sent keep working."
        confirmLabel="Delete strategy"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          deleteStrat(strat.id);
          setConfirm(null);
          router.push("/app");
        }}
      />
    </main>
  );
}
