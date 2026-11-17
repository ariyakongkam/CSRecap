"use client";

import { Tag } from "lucide-react";

/** Shows or hides callout names on the map. */
export function CalloutToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`btn shrink-0 !min-h-9 !px-3 text-sm ${on ? "!border-chalk text-text" : "text-muted"}`}
      title="Show callout names on the map"
    >
      <Tag className="size-4" /> Callouts
    </button>
  );
}
