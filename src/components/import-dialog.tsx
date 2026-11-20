"use client";

import { Modal } from "@/components/dialog";
import { planMerge, stratsToSave, type Bundle } from "@/lib/strat/bundle";
import { loadStrat, saveStrats } from "@/lib/strat/storage";

/** What importing would do, in words: "3 new, 1 updated, 2 already saved". */
export function describePlan(plan: ReturnType<typeof planMerge>): string {
  const parts = [];
  if (plan.add.length) parts.push(`${plan.add.length} new`);
  if (plan.update.length) parts.push(`${plan.update.length} updated (your old ${plan.update.length === 1 ? "version is" : "versions are"} kept as copies)`);
  if (plan.same.length) parts.push(`${plan.same.length} already saved`);
  return parts.join(", ");
}

/** Confirms and carries out opening a backup or playbook file. */
export function ImportDialog({ bundle, onClose, onDone }: { bundle: Bundle | null; onClose: () => void; onDone: (message: string) => void }) {
  const plan = bundle ? planMerge(bundle.strats, loadStrat) : null;
  const nothing = plan && plan.add.length === 0 && plan.update.length === 0;
  return (
    <Modal
      open={!!bundle}
      onClose={onClose}
      title={bundle ? (bundle.kind === "playbook" ? `Open the playbook “${bundle.name}”` : "Open backup") : "Open file"}
    >
      {bundle && plan && (
        <div className="space-y-4">
          <p>
            {bundle.strats.length} {bundle.strats.length === 1 ? "strat" : "strats"}: {describePlan(plan)}.
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-muted">
            {bundle.strats.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              data-autofocus
              onClick={() => {
                if (nothing) return onDone("You already have all of these strats.");
                const ok = saveStrats(stratsToSave(plan));
                onDone(ok ? `Done: ${describePlan(plan)}.` : "Your browser didn't let us save. Storage is full or blocked.");
              }}
            >
              {nothing ? "OK" : "Save to my strats"}
            </button>
            {!nothing && (
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
