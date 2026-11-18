"use client";

import { ExternalLink, Move, Trash2 } from "lucide-react";
import { MAPS, areaAt } from "@/lib/maps";
import { round1 } from "@/lib/strat/geometry";
import { removeObject, safeUrl, youtubeId } from "@/lib/strat/model";
import { routesOf } from "@/lib/strat/timeline";
import type { Tool } from "@/components/board";
import { ConeControls, MarkerControls, PenControls } from "@/components/tool-options";
import {
  CONE_LABEL,
  MARKER_LABEL,
  UTILITY_LABEL,
  type BoardObject,
  type LineupObject,
  type MarkerType,
  type PenSettings,
  type PlacedPlayer,
  type Scene,
  type Side,
  type Strat,
  type UtilityType,
} from "@/lib/strat/types";

/** The usual CS2 roles, one tap away. Anything else can be typed. */
const ROLES = ["Entry", "AWP", "Support", "Lurk", "Anchor", "IGL", "Rotator"];

interface Props {
  strat: Strat;
  scene: Scene;
  selected: BoardObject | null;
  onObjects: (objects: BoardObject[]) => void;
  onStrat: (next: Strat) => void;
  onSelect: (id: string | null) => void;
  onPickMap: () => void;
  tool: Tool;
  pen: PenSettings;
  onPen: (pen: PenSettings) => void;
  marker: MarkerType;
  onMarker: (m: MarkerType) => void;
  /** Asks to delete the whole strategy (the editor confirms first). */
  onDeleteStrat: () => void;
  /** Puts the missing teammates in spawn. */
  onPlaceTeam: () => void;
  /** "Move to…": the id waiting for a click on the board, if any. */
  relocating: string | null;
  onRelocate: (id: string | null) => void;
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 120,
  step = 0.5,
  suffix,
}: {
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
      <span className="label">{label}</span>
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

export function Inspector({ strat, scene, selected, onObjects, onStrat, onSelect, onPickMap, tool, pen, onPen, marker, onMarker, onDeleteStrat, onPlaceTeam, relocating, onRelocate }: Props) {
  const update = (o: BoardObject) => onObjects(scene.objects.map((x) => (x.id === o.id ? o : x)));
  const map = MAPS[strat.map];

  // While drawing, the panel is the pen's settings (like a paint program), whatever is selected.
  if (tool === "pen") {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Tools: pen</h2>
        <PenControls value={pen} onChange={onPen} />
        <p className="text-sm text-muted">To change a stroke you already drew, pick the select tool (V) and click it.</p>
      </div>
    );
  }

  if (tool === "marker") {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Tools: marker</h2>
        <MarkerControls value={marker} onChange={onMarker} />
        <p className="text-sm text-muted">Pick one, then click the map to place it.</p>
      </div>
    );
  }

  if (selected) {
    const at =
      "x" in selected
        ? areaAt(map, selected.x, selected.y)?.name
        : selected.kind === "route"
          ? areaAt(map, selected.points.at(-1)!.x, selected.points.at(-1)!.y)?.name
          : undefined;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{describe(selected, scene)}</h2>
          <button
            type="button"
            className="btn btn-icon text-danger"
            onClick={() => {
              onObjects(removeObject(scene.objects, selected.id));
              onSelect(null);
            }}
            title="Delete (Del)"
            aria-label="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        {!(selected.kind === "route" && selected.player) && (
          <button
            type="button"
            className={`btn w-full ${relocating === selected.id ? "border-chalk" : ""}`}
            aria-pressed={relocating === selected.id}
            onClick={() => onRelocate(relocating === selected.id ? null : selected.id)}
          >
            <Move className="size-4" />
            {relocating === selected.id ? "Now click where it should go (Esc cancels)" : "Move to…"}
          </button>
        )}
        {at && (
          <p className="text-sm text-muted">
            {selected.kind === "route" ? "Ends in" : "In"} {at}
          </p>
        )}

        {selected.kind === "player" && (
          <>
            <label className="block">
              <span className="label">Role</span>
              <input
                className="field"
                value={selected.role}
                maxLength={24}
                placeholder={selected.team === strat.side ? "Entry, AWP, Lurk…" : "Anchor, AWP, Rotator…"}
                onChange={(e) => update({ ...selected, role: e.target.value })}
              />
            </label>
            <div role="group" aria-label="Quick roles" className="flex flex-wrap gap-1">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={selected.role === r}
                  onClick={() => update({ ...selected, role: selected.role === r ? "" : r })}
                  className={`min-h-11 rounded-lg border px-3 text-sm ${
                    selected.role === r ? "border-chalk bg-chalk text-chalk-ink" : "border-line text-muted hover:text-text"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {selected.team === strat.side && (
              <p className="text-sm text-muted">
                {routesOf(scene, selected.id).length === 0
                  ? "No route yet. Pick the route tool (R) and drag from this player."
                  : `${routesOf(scene, selected.id).length} route(s) in this step. Click a route to change its timing.`}
              </p>
            )}
          </>
        )}

        {selected.kind === "route" && (
          <>
            <label className="block">
              <span className="label">Who walks it</span>
              <select className="field" value={selected.player ?? ""} onChange={(e) => update({ ...selected, player: e.target.value || null })}>
                <option value="">Nobody (plain arrow)</option>
                {scene.objects
                  .filter((o): o is PlacedPlayer => o.kind === "player")
                  .sort((a, b) => a.team.localeCompare(b.team) || a.n - b.n)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.team === strat.side ? "Teammate" : "Enemy"} {p.n}
                      {p.role ? `, ${p.role}` : ""}
                    </option>
                  ))}
              </select>
            </label>
            <NumberField label="Walk takes" value={selected.duration} min={0.5} onChange={(duration) => update({ ...selected, duration })} suffix="s" />
          </>
        )}

        {selected.kind === "utility" && (
          <>
            <label className="block">
              <span className="label">Grenade</span>
              <select className="field" value={selected.type} onChange={(e) => update({ ...selected, type: e.target.value as UtilityType })}>
                {(Object.keys(UTILITY_LABEL) as UtilityType[]).map((t) => (
                  <option key={t} value={t}>
                    {UTILITY_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Thrown by</span>
              <select className="field" value={selected.from ?? ""} onChange={(e) => update({ ...selected, from: e.target.value || null })}>
                <option value="">Nobody in particular</option>
                {scene.objects
                  .filter((o): o is PlacedPlayer => o.kind === "player")
                  .sort((a, b) => a.team.localeCompare(b.team) || a.n - b.n)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.team === strat.side ? "Teammate" : "Enemy"} {p.n}
                      {p.role ? `, ${p.role}` : ""}
                    </option>
                  ))}
              </select>
            </label>
            <p className="text-sm text-muted">Tip: with a grenade tool, drag from a player to where it lands to set the thrower straight away.</p>
          </>
        )}


        {selected.kind === "text" && (
          <>
            <label className="block">
              <span className="label">Text</span>
              <input className="field" value={selected.text} maxLength={120} onChange={(e) => update({ ...selected, text: e.target.value })} />
            </label>
          </>
        )}

        {selected.kind === "drawing" && (
          <PenControls
            editing
            value={{ shape: selected.shape, color: selected.color, opacity: selected.opacity, width: selected.width }}
            onChange={(v) =>
              update({
                ...selected,
                ...v,
                points: v.shape === "free" ? selected.points : [selected.points[0], selected.points[selected.points.length - 1]],
              })
            }
          />
        )}

        {selected.kind === "vision" && (
          <ConeControls
            cone={selected.cone}
            length={selected.length}
            onChange={(v) => update({ ...selected, ...v })}
            angle={selected.angle}
            onAngle={(angle) => update({ ...selected, angle })}
          />
        )}

        {selected.kind === "lineup" && <LineupFields key={selected.id} lineup={selected} onChange={update} />}

        {selected.kind === "marker" && <MarkerControls value={selected.icon} onChange={(icon) => update({ ...selected, icon })} />}
      </div>
    );
  }

  const roster = scene.objects
    .filter((o): o is PlacedPlayer => o.kind === "player" && o.team === strat.side)
    .sort((a, b) => a.n - b.n);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold">Strat details</h2>
      <label className="block">
        <span className="label">Name</span>
        <input className="field" value={strat.name} maxLength={80} onChange={(e) => onStrat({ ...strat, name: e.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="label">Map</span>
          <button type="button" className="btn w-full justify-between" onClick={onPickMap}>
            {map.name} <span className="text-sm text-muted">Change</span>
          </button>
        </div>
        <label className="block">
          <span className="label">Your side</span>
          <select className="field" value={strat.side} onChange={(e) => onStrat({ ...strat, side: e.target.value as Side })}>
            <option value="T">T side</option>
            <option value="CT">CT side</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="label">When to call it</span>
        <textarea
          className="field min-h-16"
          value={strat.call}
          maxLength={300}
          placeholder="e.g. after two quiet rounds on A, at 1:15"
          onChange={(e) => onStrat({ ...strat, call: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="label">Notes</span>
        <textarea
          className="field min-h-36"
          value={strat.notes}
          maxLength={2000}
          placeholder="Abort call, fallback, variations"
          onChange={(e) => onStrat({ ...strat, notes: e.target.value })}
        />
      </label>
      <div>
        <span className="label">Roles in this phase</span>
        {roster.length === 0 ? (
          <p className="text-sm text-muted">No teammates yet. Pick the teammate tool (1) and click the map, or place them all at once.</p>
        ) : (
          <ul className="space-y-1">
            {roster.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-panel-2"
                >
                  <span className={`grid size-6 place-items-center rounded-full text-xs font-black text-bg ${p.team === "T" ? "bg-team-t" : "bg-team-ct"}`}>
                    {p.n}
                  </span>
                  <span className={p.role ? "" : "text-faint"}>{p.role || "No role yet"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {roster.length < 5 && (
          <button type="button" className="btn mt-2 w-full" onClick={onPlaceTeam}>
            {roster.length === 0 ? "Place all five at spawn" : `Add the other ${5 - roster.length} at spawn`}
          </button>
        )}
      </div>
      <div className="border-t border-line pt-4">
        <button type="button" className="btn w-full text-danger" onClick={onDeleteStrat}>
          <Trash2 className="size-4" />
          Delete this strategy
        </button>
      </div>
    </div>
  );
}

function LineupFields({ lineup, onChange }: { lineup: LineupObject; onChange: (o: BoardObject) => void }) {
  const yt = lineup.url ? youtubeId(lineup.url) : null;
  const looksLikeImage = /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(lineup.url);
  return (
    <>
      <label className="block">
        <span className="label">Title</span>
        <input
          className="field"
          value={lineup.title}
          maxLength={60}
          placeholder="e.g. Jungle smoke from A Ramp"
          onChange={(e) => onChange({ ...lineup, title: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="label">YouTube or image link</span>
        <input
          className="field"
          type="url"
          inputMode="url"
          defaultValue={lineup.url}
          placeholder="https://youtu.be/…"
          onBlur={(e) => {
            const url = safeUrl(e.target.value);
            e.target.value = url;
            if (url !== lineup.url) onChange({ ...lineup, url });
          }}
        />
        <span className="mt-1 block text-xs text-muted">Paste a link, then click outside the box. Only http and https links are kept.</span>
      </label>
      {lineup.url && (
        <div className="space-y-2">
          {yt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" className="aspect-video w-full rounded-lg border border-line object-cover" />
          ) : looksLikeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lineup.url} alt="" className="max-h-56 w-full rounded-lg border border-line object-contain" />
          ) : null}
          <a href={lineup.url} target="_blank" rel="noopener noreferrer" className="btn w-full">
            <ExternalLink className="size-4" /> Open lineup
          </a>
        </div>
      )}
    </>
  );
}

function describe(o: BoardObject, scene: Scene): string {
  switch (o.kind) {
    case "player":
      return `${o.team === scene.side ? "Teammate" : "Enemy"} ${o.n} (${o.team})`;
    case "route": {
      const p = o.player ? scene.objects.find((x) => x.id === o.player) : undefined;
      return p && p.kind === "player" ? `Route of ${p.team === scene.side ? "teammate" : "enemy"} ${p.n}` : "Arrow";
    }
    case "utility":
      return UTILITY_LABEL[o.type];
    case "text":
      return "Note";
    case "bomb":
      return "Bomb (C4)";
    case "drawing":
      return "Pen drawing";
    case "vision":
      return CONE_LABEL[o.cone];
    case "lineup":
      return "Lineup";
    case "marker":
      return `Marker: ${MARKER_LABEL[o.icon]}`;
  }
}
