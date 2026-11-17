"use client";

import { Flame, MousePointer2, Spline, Type, Zap, Bomb, Cloud } from "lucide-react";
import type { Tool } from "./board";

interface ToolDef {
  id: Tool;
  label: string;
  key: string;
  icon: React.ReactNode;
}

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select and move", key: "V", icon: <MousePointer2 className="size-4" /> },
  { id: "T", label: "T player", key: "1", icon: <span className="grid size-4 place-items-center rounded-full bg-t text-[10px] font-black text-bg">T</span> },
  { id: "CT", label: "CT player", key: "2", icon: <span className="grid size-4 place-items-center rounded-full bg-ct text-[8px] font-black text-bg">CT</span> },
  { id: "route", label: "Draw route (drag from a player to attach it)", key: "R", icon: <Spline className="size-4" /> },
  { id: "smoke", label: "Smoke", key: "S", icon: <Cloud className="size-4" /> },
  { id: "flash", label: "Flash", key: "F", icon: <Zap className="size-4" /> },
  { id: "molotov", label: "Molotov", key: "M", icon: <Flame className="size-4" /> },
  { id: "he", label: "HE grenade", key: "H", icon: <Bomb className="size-4" /> },
  { id: "text", label: "Note", key: "N", icon: <Type className="size-4" /> },
];

export const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(TOOLS.map((t) => [t.key.toLowerCase(), t.id]));

export function Toolbar({ tool, onTool }: { tool: Tool; onTool: (t: Tool) => void }) {
  return (
    <div role="toolbar" aria-label="Board tools" className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1 lg:flex-col">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onTool(t.id)}
          aria-pressed={tool === t.id}
          title={`${t.label} (${t.key})`}
          className={`group relative grid size-10 shrink-0 place-items-center rounded-lg transition ${
            tool === t.id ? "bg-accent text-accent-ink" : "text-muted hover:bg-panel-2 hover:text-text"
          }`}
        >
          {t.icon}
          <span className="sr-only">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function toolHint(tool: Tool): string {
  switch (tool) {
    case "select":
      return "Click to select, drag to move. Delete removes the selection.";
    case "T":
    case "CT":
      return `Click to place the next ${tool} player (1–5).`;
    case "route":
      return "Drag from a player to draw their route. Drag on empty ground for a plain arrow.";
    case "text":
      return "Click to add a note, then edit its text on the right.";
    default:
      return "Click where it lands. It pops at the current timeline time.";
  }
}
