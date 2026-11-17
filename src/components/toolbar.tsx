"use client";

import { Bomb, Cloud, Flame, MousePointer2, Spline, Type, Zap } from "lucide-react";
import { Fragment } from "react";
import type { Tool } from "./board";

interface ToolDef {
  id: Tool;
  label: string;
  key: string;
  icon: React.ReactNode;
}

const token = (team: "T" | "CT") => (
  <span
    className={`grid size-6 place-items-center rounded-full font-display text-[11px] leading-none font-bold text-bg ring-2 ring-black/40 ${
      team === "T" ? "bg-team-t" : "bg-team-ct"
    }`}
  >
    {team}
  </span>
);

/** Tools in groups: select · players · drawing · utility. Groups are separated by a rule. */
const GROUPS: ToolDef[][] = [
  [{ id: "select", label: "Select and move", key: "V", icon: <MousePointer2 className="size-5" /> }],
  [
    { id: "T", label: "T player", key: "1", icon: token("T") },
    { id: "CT", label: "CT player", key: "2", icon: token("CT") },
  ],
  [
    { id: "route", label: "Route", key: "R", icon: <Spline className="size-5" /> },
    { id: "text", label: "Note", key: "N", icon: <Type className="size-5" /> },
  ],
  [
    { id: "smoke", label: "Smoke", key: "S", icon: <Cloud className="size-5" /> },
    { id: "flash", label: "Flash", key: "F", icon: <Zap className="size-5" /> },
    { id: "molotov", label: "Molotov", key: "M", icon: <Flame className="size-5" /> },
    { id: "he", label: "HE grenade", key: "H", icon: <Bomb className="size-5" /> },
  ],
];

export const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(GROUPS.flat().map((t) => [t.key.toLowerCase(), t.id]));

export function Toolbar({ tool, onTool }: { tool: Tool; onTool: (t: Tool) => void }) {
  return (
    <div
      role="toolbar"
      aria-label="Board tools"
      className="flex items-center gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1.5 lg:flex-col lg:overflow-visible"
    >
      {GROUPS.map((group, gi) => (
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
  );
}

export function toolHint(tool: Tool): string {
  switch (tool) {
    case "select":
      return "Click to select. Drag to move.";
    case "T":
    case "CT":
      return `Click to place the next ${tool} player.`;
    case "route":
      return "Drag from a player to draw their route.";
    case "text":
      return "Click to add a note.";
    case "smoke":
    case "flash":
    case "molotov":
    case "he":
      return "Click where it lands. It pops at the timeline's current time.";
  }
}
