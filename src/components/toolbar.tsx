"use client";

import { Bomb, Cloud, Eraser, Flame, MapPin, MousePointer2, Pencil, Radar, Spline, Type, Zap } from "lucide-react";
import { Fragment } from "react";
import { enemyOf } from "@/lib/strat/model";
import { PEN_COLORS, type PenColor, type Side } from "@/lib/strat/types";
import type { Tool } from "./board";

interface ToolDef {
  id: Tool;
  label: string;
  key: string;
  icon: React.ReactNode;
}

const token = (team: Side, enemy: boolean) => (
  <span
    className={`grid size-6 place-items-center font-display text-[11px] leading-none font-bold text-bg ring-2 ring-black/40 ${
      enemy ? "rounded-md" : "rounded-full"
    } ${team === "T" ? "bg-team-t" : "bg-team-ct"}`}
  >
    {team}
  </span>
);

/** Tools in groups: select · players · drawing · grenades · objects. */
function groups(side: Side): ToolDef[][] {
  const enemy = enemyOf(side);
  return [
    [{ id: "select", label: "Select and move", key: "V", icon: <MousePointer2 className="size-5" /> }],
    [
      { id: "mate", label: `Teammate (${side})`, key: "1", icon: token(side, false) },
      { id: "enemy", label: `Enemy (${enemy})`, key: "2", icon: token(enemy, true) },
      { id: "vision", label: "Where they look", key: "D", icon: <Radar className="size-5" /> },
    ],
    [
      { id: "route", label: "Route", key: "R", icon: <Spline className="size-5" /> },
      { id: "pen", label: "Pen", key: "P", icon: <Pencil className="size-5" /> },
      { id: "eraser", label: "Eraser", key: "E", icon: <Eraser className="size-5" /> },
      { id: "text", label: "Note", key: "N", icon: <Type className="size-5" /> },
    ],
    [
      { id: "smoke", label: "Smoke", key: "S", icon: <Cloud className="size-5" /> },
      { id: "flash", label: "Flash", key: "F", icon: <Zap className="size-5" /> },
      { id: "molotov", label: "Molotov", key: "M", icon: <Flame className="size-5" /> },
      { id: "he", label: "HE grenade", key: "H", icon: <Bomb className="size-5" /> },
    ],
    [
      {
        id: "bomb",
        label: "Bomb (C4)",
        key: "B",
        icon: (
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <rect x="2.5" y="6" width="19" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <rect x="5" y="8.5" width="8" height="3.5" rx="0.5" fill="currentColor" />
            <circle cx="17.5" cy="10" r="1.4" fill="currentColor" />
          </svg>
        ),
      },
      { id: "lineup", label: "Lineup link", key: "L", icon: <MapPin className="size-5" /> },
    ],
  ];
}

export const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(groups("T").flat().map((t) => [t.key.toLowerCase(), t.id]));

export function Toolbar({
  tool,
  onTool,
  side,
  penColor,
  onPenColor,
}: {
  tool: Tool;
  onTool: (t: Tool) => void;
  side: Side;
  penColor: PenColor;
  onPenColor: (c: PenColor) => void;
}) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
      <div
        role="toolbar"
        aria-label="Board tools"
        className="flex items-center gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1.5 lg:flex-col lg:overflow-visible"
      >
        {groups(side).map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 && <span aria-hidden="true" className="mx-0.5 h-7 w-px shrink-0 bg-line lg:mx-0 lg:my-0.5 lg:h-px lg:w-7" />}
            {group.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTool(t.id)}
                aria-pressed={tool === t.id}
                aria-keyshortcuts={t.key}
                title={`${t.label} (${t.key})`}
                className={`group relative grid size-11 shrink-0 place-items-center rounded-lg transition-colors ${
                  tool === t.id ? "bg-chalk text-chalk-ink" : "text-muted hover:bg-panel-2 hover:text-text"
                }`}
              >
                {t.icon}
                <span className="sr-only">{t.label}</span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-full z-20 ml-3 hidden -translate-y-1/2 items-center gap-2 rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm whitespace-nowrap text-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100 lg:flex"
                >
                  {t.label}
                  <kbd className="rounded border border-line px-1.5 font-display text-xs text-muted">{t.key}</kbd>
                </span>
              </button>
            ))}
          </Fragment>
        ))}
      </div>

      {tool === "pen" && (
        <div role="radiogroup" aria-label="Pen colour" className="flex gap-1 rounded-xl border border-line bg-panel p-1.5 lg:flex-col">
          {(Object.keys(PEN_COLORS) as PenColor[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={penColor === c}
              aria-label={PEN_COLORS[c].label}
              title={PEN_COLORS[c].label}
              onClick={() => onPenColor(c)}
              className={`grid size-11 place-items-center rounded-lg ${penColor === c ? "bg-panel-2 ring-2 ring-chalk" : "hover:bg-panel-2"}`}
            >
              <span className="size-5 rounded-full ring-2 ring-black/40" style={{ background: PEN_COLORS[c].css }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function toolHint(tool: Tool): string {
  switch (tool) {
    case "select":
      return "Click to select. Drag to move.";
    case "mate":
      return "Click to place the next teammate.";
    case "enemy":
      return "Click to place an enemy. Enemies are square.";
    case "vision":
      return "Drag from a player towards where they should look.";
    case "route":
      return "Drag from a player to draw their route.";
    case "pen":
      return "Draw freely on the map.";
    case "eraser":
      return "Click or drag over anything to erase it.";
    case "text":
      return "Click to add a note.";
    case "bomb":
      return "Click where the bomb is planted.";
    case "lineup":
      return "Click where the grenade lands, then paste the video or image link.";
    case "smoke":
    case "flash":
    case "molotov":
    case "he":
      return "Click where it lands. It pops at the timeline's current time.";
  }
}
