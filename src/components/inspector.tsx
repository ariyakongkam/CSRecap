"use client";

import { Trash2 } from "lucide-react";
import { MAPS, MAP_IDS, areaAt, type MapId } from "@/lib/maps";
import { round1 } from "@/lib/strat/geometry";
import { removeObject } from "@/lib/strat/model";
import { routesOf } from "@/lib/strat/timeline";
import { UTILITY_DURATION, UTILITY_LABEL, type BoardObject, type PlacedPlayer, type Side, type Strat, type UtilityType } from "@/lib/strat/types";

interface Props {
  strat: Strat;
  selected: BoardObject | null;
  onCommit: (next: Strat) => void;
  onSelect: (id: string | null) => void;
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="label">{children}</span>;
}

function NumberField({ label, value, onChange, min = 0, max = 120, step = 0.5, suffix }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="field tabular-nums"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, round1(v))));
          }}
        />
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </div>
    </label>
  );
}

export function Inspector({ strat, selected, onCommit, onSelect }: Props) {
  const update = (o: BoardObject) => onCommit({ ...strat, objects: strat.objects.map((x) => (x.id === o.id ? o : x)) });
  const map = MAPS[strat.map];

  if (selected) {
    const where = "x" in selected ? areaAt(map, selected.x, selected.y)?.name : selected.kind === "route" ? areaAt(map, selected.points.at(-1)!.x, selected.points.at(-1)!.y)?.name : undefined;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{describe(selected, strat)}</h2>
          <button
            type="button"
            className="btn btn-icon text-danger"
            onClick={() => {
              onCommit(removeObject(strat, selected.id));
              onSelect(null);
            }}
            title="Delete (Del)"
            aria-label="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        {where && <p className="text-sm text-muted">{selected.kind === "route" ? "Ends in" : "In"} {where}</p>}

        {selected.kind === "player" && (
          <>
            <label className="block">
              <Label>Role</Label>
              <input
                className="field"
                value={selected.role}
                maxLength={24}
                placeholder="Entry, AWP, Lurk…"
                onChange={(e) => update({ ...selected, role: e.target.value })}
              />
            </label>
            <p className="text-sm text-muted">
              {routesOf(strat, selected.id).length === 0
                ? "No route yet. Pick the route tool (R) and drag from this player."
                : `${routesOf(strat, selected.id).length} route(s). Click a route to change its timing.`}
            </p>
          </>
        )}

        {selected.kind === "route" && (
          <>
            <label className="block">
              <Label>Who walks it</Label>
              <select
                className="field"
                value={selected.player ?? ""}
                onChange={(e) => update({ ...selected, player: e.target.value || null })}
              >
                <option value="">Nobody (plain arrow)</option>
                {strat.objects
                  .filter((o): o is PlacedPlayer => o.kind === "player")
                  .sort((a, b) => a.team.localeCompare(b.team) || a.n - b.n)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.team}
                      {p.n}
                      {p.role ? ` · ${p.role}` : ""}
                    </option>
                  ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Starts at" value={selected.t} onChange={(t) => update({ ...selected, t })} suffix="s" />
              <NumberField label="Takes" value={selected.duration} min={0.5} onChange={(duration) => update({ ...selected, duration })} suffix="s" />
            </div>
          </>
        )}

        {selected.kind === "utility" && (
          <>
            <label className="block">
              <Label>Grenade</Label>
              <select className="field" value={selected.type} onChange={(e) => update({ ...selected, type: e.target.value as UtilityType })}>
                {(Object.keys(UTILITY_LABEL) as UtilityType[]).map((t) => (
                  <option key={t} value={t}>
                    {UTILITY_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <NumberField label="Pops at" value={selected.t} onChange={(t) => update({ ...selected, t })} suffix="s" />
            <p className="text-sm text-muted">On the board for {UTILITY_DURATION[selected.type]}s during playback.</p>
          </>
        )}

        {selected.kind === "text" && (
          <>
            <label className="block">
              <Label>Text</Label>
              <input className="field" value={selected.text} maxLength={120} onChange={(e) => update({ ...selected, text: e.target.value })} />
            </label>
            <NumberField label="Shows from" value={selected.t} onChange={(t) => update({ ...selected, t })} suffix="s" />
          </>
        )}
      </div>
    );
  }

  const roster = strat.objects
    .filter((o): o is PlacedPlayer => o.kind === "player")
    .sort((a, b) => a.team.localeCompare(b.team) || a.n - b.n);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold">Strat details</h2>
      <label className="block">
        <Label>Name</Label>
        <input className="field" value={strat.name} maxLength={80} onChange={(e) => onCommit({ ...strat, name: e.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <Label>Map</Label>
          <select className="field" value={strat.map} onChange={(e) => onCommit({ ...strat, map: e.target.value as MapId })}>
            {MAP_IDS.map((id) => (
              <option key={id} value={id}>
                {MAPS[id].name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <Label>Side</Label>
          <select className="field" value={strat.side} onChange={(e) => onCommit({ ...strat, side: e.target.value as Side })}>
            <option value="T">T side</option>
            <option value="CT">CT side</option>
          </select>
        </label>
      </div>
      <label className="block">
        <Label>When to call it</Label>
        <textarea
          className="field min-h-16"
          value={strat.call}
          maxLength={300}
          placeholder="e.g. after two quiet rounds on A, at 1:15"
          onChange={(e) => onCommit({ ...strat, call: e.target.value })}
        />
      </label>
      <label className="block">
        <Label>Notes</Label>
        <textarea
          className="field min-h-36"
          value={strat.notes}
          maxLength={2000}
          placeholder="Abort call, fallback, variations"
          onChange={(e) => onCommit({ ...strat, notes: e.target.value })}
        />
      </label>
      <div>
        <Label>Roles</Label>
        {roster.length === 0 ? (
          <p className="text-sm text-muted">No players yet. Pick the T or CT tool and click the map.</p>
        ) : (
          <ul className="space-y-1.5">
            {roster.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-panel-2"
                >
                  <span className={`grid size-6 place-items-center rounded-full text-xs font-black text-bg ${p.team === "T" ? "bg-team-t" : "bg-team-ct"}`}>{p.n}</span>
                  <span className={p.role ? "" : "text-faint"}>{p.role || "No role yet"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function describe(o: BoardObject, strat: Strat): string {
  switch (o.kind) {
    case "player":
      return `${o.team} player ${o.n}`;
    case "route": {
      const p = o.player ? strat.objects.find((x) => x.id === o.player) : undefined;
      return p && p.kind === "player" ? `Route · ${p.team}${p.n}` : "Arrow";
    }
    case "utility":
      return UTILITY_LABEL[o.type];
    case "text":
      return "Note";
  }
}
