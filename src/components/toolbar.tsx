"use client";

import { Eraser, Flag, MapPin, MousePointer2, Pencil, Spline, Type } from "lucide-react";
import { Fragment } from "react";
import { enemyOf } from "@/lib/strat/model";
import { C4Icon, UtilityIcon } from "@/components/utility-icons";
import { CONE_DEGREES, type ConeWidth, type Side } from "@/lib/strat/types";
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

/** A fan the width of the cone it places, like the cone itself seen from above. */
function ConeIcon({ cone }: { cone: ConeWidth }) {
  const half = (CONE_DEGREES[cone] / 2) * (Math.PI / 180);
  const R = 17;
  const cx = 12;
  const cy = 21;
  const a = -Math.PI / 2 - half;
  const b = -Math.PI / 2 + half;
  const d = `M${cx} ${cy}L${cx + R * Math.cos(a)} ${cy + R * Math.sin(a)}A${R} ${R} 0 0 1 ${cx + R * Math.cos(b)} ${cy + R * Math.sin(b)}Z`;
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

/** Tools in groups: select · players · drawing · grenades · objects. */
function groups(side: Side): ToolDef[][] {
  const enemy = enemyOf(side);
  return [
    [{ id: "select", label: "Select and move", key: "V", icon: <MousePointer2 className="size-5" /> }],
    [
      { id: "mate", label: `Teammate (${side})`, key: "1", icon: token(side, false) },
      { id: "enemy", label: `Enemy (${enemy})`, key: "2", icon: token(enemy, true) },

    ],
    [
      { id: "cone-wide", label: "Wide sight", key: "Z", icon: <ConeIcon cone="wide" /> },
      { id: "cone-normal", label: "Normal sight", key: "X", icon: <ConeIcon cone="normal" /> },
      { id: "cone-narrow", label: "Narrow sight", key: "C", icon: <ConeIcon cone="narrow" /> },
    ],
    [
      { id: "route", label: "Route", key: "R", icon: <Spline className="size-5" /> },
      { id: "pen", label: "Pen", key: "P", icon: <Pencil className="size-5" /> },
      { id: "eraser", label: "Eraser", key: "E", icon: <Eraser className="size-5" /> },
      { id: "text", label: "Note", key: "N", icon: <Type className="size-5" /> },
    ],
    [
      { id: "smoke", label: "Smoke", key: "S", icon: <UtilityIcon type="smoke" /> },
      { id: "flash", label: "Flash", key: "F", icon: <UtilityIcon type="flash" /> },
      { id: "molotov", label: "Molotov / incendiary", key: "M", icon: <UtilityIcon type="molotov" /> },
      { id: "he", label: "HE grenade", key: "H", icon: <UtilityIcon type="he" /> },
      { id: "decoy", label: "Decoy", key: "D", icon: <UtilityIcon type="decoy" /> },
    ],
    [
      {
        id: "bomb",
        label: "Bomb (C4)",
        key: "B",
        icon: <C4Icon />,
      },
      { id: "lineup", label: "Lineup link", key: "L", icon: <MapPin className="size-5" /> },
      { id: "marker", label: "Marker: anchor, AWP, lurk …", key: "K", icon: <Flag className="size-5" /> },
    ],
  ];
}

export const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(groups("T").flat().map((t) => [t.key.toLowerCase(), t.id]));

export function Toolbar({ tool, onTool, side }: { tool: Tool; onTool: (t: Tool) => void; side: Side }) {
  return (
      <div
        role="toolbar"
        aria-label="Board tools"
        className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-panel p-1.5 lg:grid lg:grid-cols-2"
      >
        {groups(side).map((group, gi) => (
          <Fragment key={gi}>
            {gi > 0 && <span aria-hidden="true" className="mx-0.5 h-7 w-px shrink-0 bg-line lg:col-span-2 lg:mx-1 lg:my-0.5 lg:h-px lg:w-auto" />}
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
    case "mate":
      return "Click to place a teammate. Then you're back on the cursor.";
    case "enemy":
      return "Click to place an enemy (square). Then you're back on the cursor.";
    case "cone-wide":
    case "cone-normal":
    case "cone-narrow":
      return "Click a player (or anywhere) and drag towards where they look. Then you're back on the cursor.";
    case "route":
      return "Drag from a player to draw their route. Then you're back on the cursor.";
    case "pen":
      return "Draw on the map. Pick the type, colour and thickness under Tools on the right.";
    case "eraser":
      return "Click or drag over anything to erase it.";
    case "text":
      return "Click to add a note. Then you're back on the cursor.";
    case "bomb":
      return "Click where the bomb is planted. Then you're back on the cursor.";
    case "lineup":
      return "Click where the grenade lands, then paste the video or image link.";
    case "smoke":
    case "flash":
    case "molotov":
    case "he":
    case "decoy":
      return "Click where it lands. Then you're back on the cursor.";
    case "marker":
      return "Pick a marker, then click the map. Then you're back on the cursor.";
  }
}
