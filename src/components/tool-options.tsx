"use client";

import { CONE_DEGREES, CONE_LABEL, CONE_LENGTH, DRAW_SHAPE_LABEL, PEN_SWATCHES, type ConeWidth, type DrawShape, type PenSettings } from "@/lib/strat/types";

const SHAPES: DrawShape[] = ["free", "line", "arrow", "rect", "dashed", "dashed-arrow"];

/** Small pictures of each pen type, like the stroke it draws. */
function ShapeIcon({ shape }: { shape: DrawShape }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const dash = shape === "dashed" || shape === "dashed-arrow" ? "3 3" : undefined;
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      {shape === "free" && <path d="M4 17c2-6 4-6 5 0s3 6 5 0 3-8 6-8" {...p} />}
      {shape === "rect" && <rect x="5" y="6" width="14" height="12" rx="1" {...p} />}
      {(shape === "line" || shape === "dashed") && <path d="M5 19L19 5" {...p} strokeDasharray={dash} />}
      {(shape === "arrow" || shape === "dashed-arrow") && (
        <>
          <path d="M5 19L17 7" {...p} strokeDasharray={dash} />
          <path d="M11 6h8v8" {...p} />
        </>
      )}
    </svg>
  );
}

/** Type, colour, opacity and thickness: for the pen tool, or for a selected drawing. */
export function PenControls({
  value,
  onChange,
  editing = false,
}: {
  value: PenSettings;
  onChange: (v: PenSettings) => void;
  /** Editing an existing stroke: a freehand stroke stays freehand, a shape stays a shape. */
  editing?: boolean;
}) {
  const custom = !PEN_SWATCHES.some((s) => s.hex === value.color.toLowerCase());
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">Type</legend>
        <div className="grid grid-cols-6 gap-1">
          {SHAPES.map((sh) => {
            // A freehand stroke has no single start and end, so it can't turn into a shape, and the other way round.
            const disabled = editing && (value.shape === "free") !== (sh === "free");
            return (
              <button
                key={sh}
                type="button"
                disabled={disabled}
                aria-pressed={value.shape === sh}
                aria-label={DRAW_SHAPE_LABEL[sh]}
                title={DRAW_SHAPE_LABEL[sh]}
                onClick={() => onChange({ ...value, shape: sh })}
                className={`grid h-10 place-items-center rounded-lg border transition-colors disabled:opacity-30 ${
                  value.shape === sh ? "border-chalk bg-chalk text-chalk-ink" : "border-line text-muted hover:text-text"
                }`}
              >
                <ShapeIcon shape={sh} />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Colour</legend>
        <div className="flex flex-wrap gap-1.5">
          {PEN_SWATCHES.map((s) => (
            <button
              key={s.hex}
              type="button"
              aria-pressed={value.color.toLowerCase() === s.hex}
              aria-label={s.label}
              title={s.label}
              onClick={() => onChange({ ...value, color: s.hex })}
              className={`grid size-9 place-items-center rounded-lg border ${value.color.toLowerCase() === s.hex ? "border-chalk" : "border-line"}`}
            >
              <span className="size-5 rounded-md ring-1 ring-white/20" style={{ background: s.hex }} />
            </button>
          ))}
          <label
            title="Any colour"
            className={`relative grid size-9 cursor-pointer place-items-center rounded-lg border ${custom ? "border-chalk" : "border-line"}`}
          >
            <span className="sr-only">Any colour</span>
            <span
              className="size-5 rounded-md ring-1 ring-white/20"
              style={{ background: custom ? value.color : "conic-gradient(#ff4d4d, #ffd43b, #69db7c, #4dabf7, #b197fc, #ff4d4d)" }}
            />
            <input
              type="color"
              value={value.color}
              onChange={(e) => onChange({ ...value, color: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </fieldset>

      <label className="block">
        <span className="label">Opacity: {Math.round(value.opacity * 100)}%</span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={value.opacity}
          onChange={(e) => onChange({ ...value, opacity: Number(e.target.value) })}
          className="w-full accent-[var(--chalk)]"
        />
      </label>
      <label className="block">
        <span className="label">Thickness</span>
        <input
          type="range"
          min={1}
          max={16}
          step={0.5}
          value={value.width}
          onChange={(e) => onChange({ ...value, width: Number(e.target.value) })}
          className="w-full accent-[var(--chalk)]"
        />
      </label>
    </div>
  );
}

/** Cone width and reach: for a selected sight cone. */
export function ConeControls({
  cone,
  length,
  onChange,
}: {
  cone: ConeWidth;
  length: number;
  onChange: (v: { cone: ConeWidth; length: number }) => void;
}) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">Width</legend>
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(CONE_DEGREES) as ConeWidth[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cone === c}
              onClick={() => onChange({ cone: c, length })}
              className={`min-h-10 rounded-lg border px-2 text-sm ${cone === c ? "border-chalk bg-chalk text-chalk-ink" : "border-line text-muted hover:text-text"}`}
            >
              {CONE_LABEL[c].replace(" sight", "")}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label">How far they see</span>
        <input
          type="range"
          min={CONE_LENGTH.min}
          max={CONE_LENGTH.max}
          step={5}
          value={length}
          onChange={(e) => onChange({ cone, length: Number(e.target.value) })}
          className="w-full accent-[var(--chalk)]"
        />
      </label>
      <p className="text-sm text-muted">On the map: drag the dot to move the cone, drag the handle at its tip to aim it and change how far it reaches.</p>
    </div>
  );
}
