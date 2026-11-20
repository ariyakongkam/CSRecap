"use client";

import { Copy, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Board } from "@/components/board";
import { MAPS } from "@/lib/maps";
import { duplicateStrat } from "@/lib/strat/model";
import { deleteStrat, saveStrat } from "@/lib/strat/storage";
import { STRAT_TYPE_LABEL, sceneOf, type Strat } from "@/lib/strat/types";

/** One saved strat in the list: a preview of its first phase, name, map, side, type, and quick actions. */
export function StratCard({ s, onChanged }: { s: Strat; onChanged: () => void }) {
  const router = useRouter();
  return (
    <li className="card-lift overflow-hidden rounded-xl border border-line bg-panel">
      <button type="button" onClick={() => router.push(`/edit?id=${s.id}`)} className="block w-full text-left">
        <span className="block aspect-square border-b border-line">
          <Board scene={sceneOf(s, s.steps[0])} time={null} readOnly />
        </span>
        <span className="block px-4 pt-3">
          <span className="flex items-center gap-2">
            <span className="min-w-0 truncate font-display text-xl font-semibold">{s.name}</span>
            {s.type && <span className="shrink-0 rounded-md bg-panel-2 px-2 py-0.5 text-xs text-muted">{STRAT_TYPE_LABEL[s.type]}</span>}
          </span>
          <span className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className={`inline-block size-2.5 rounded-full ${s.side === "T" ? "bg-team-t" : "bg-team-ct"}`} aria-hidden="true" />
            {MAPS[s.map].name}, {s.side} side · {s.steps.length} {s.steps.length === 1 ? "phase" : "phases"}
            <span className="ml-auto">{new Date(s.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          </span>
        </span>
      </button>
      <div className="flex gap-2 p-3">
        <button
          type="button"
          className="btn flex-1"
          onClick={() => {
            saveStrat(duplicateStrat(s));
            onChanged();
          }}
        >
          <Copy className="size-4" /> Duplicate
        </button>
        <button
          type="button"
          className="btn btn-icon text-danger"
          aria-label={`Delete ${s.name}`}
          title="Delete"
          onClick={() => {
            if (!window.confirm(`Delete "${s.name}"? This can't be undone.`)) return;
            deleteStrat(s.id);
            onChanged();
          }}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}
