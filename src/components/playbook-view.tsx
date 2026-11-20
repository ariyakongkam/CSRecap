"use client";

import { Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { describePlan } from "@/components/import-dialog";
import { Logo } from "@/components/logo";
import { MAPS } from "@/lib/maps";
import { bundleFromHash, planMerge, stratsToSave, type Bundle } from "@/lib/strat/bundle";
import { shareUrl } from "@/lib/strat/share";
import { loadStrat, saveStrats } from "@/lib/strat/storage";
import { STRAT_TYPE_LABEL } from "@/lib/strat/types";

/** A shared playbook: the strats in it, each viewable, and one button to save them all. */
export function PlaybookView() {
  const [bundle, setBundle] = useState<Bundle | null | undefined>(undefined);
  const [done, setDone] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
    setBundle(bundleFromHash(window.location.hash.slice(1)));
  }, []);

  if (bundle === undefined) return <main className="p-8 text-muted">Opening the playbook…</main>;
  if (bundle === null)
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">This link doesn&apos;t contain a playbook</h1>
        <p className="mt-2 text-muted">Part of the link is probably missing. Ask whoever sent it to copy it again, or to send the playbook file.</p>
        <Link href="/app" className="btn btn-primary mt-6">
          Go to your strats
        </Link>
      </main>
    );

  const plan = planMerge(bundle.strats, loadStrat);
  const nothing = plan.add.length === 0 && plan.update.length === 0;
  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <header className="py-5">
        <Logo />
      </header>
      <p className="text-sm text-muted">Shared playbook</p>
      <h1 className="font-display text-4xl font-semibold">{bundle.name || "Playbook"}</h1>
      <p className="mt-2 text-muted">
        {bundle.strats.length} {bundle.strats.length === 1 ? "strat" : "strats"}. Save them to keep them in your own radstrat, in the playbook
        “{bundle.name || "Playbook"}”.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {done ? (
          <>
            <p role="status">{done}</p>
            <Link href="/app" className="btn btn-primary">
              Go to your strats
            </Link>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => {
                if (nothing) return setDone("You already have all of these strats.");
                setDone(saveStrats(stratsToSave(plan)) ? `Saved: ${describePlan(plan)}.` : "Your browser didn't let us save. Storage is full or blocked.");
              }}
            >
              {nothing ? "Already saved" : "Save all to my strats"}
            </button>
            <span className="text-sm text-muted">{describePlan(plan)}</span>
          </>
        )}
      </div>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {bundle.strats.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold">{s.name}</p>
              <p className="text-sm text-muted">
                {MAPS[s.map].name}, {s.side} side · {s.steps.length} {s.steps.length === 1 ? "phase" : "phases"}
                {s.type ? ` · ${STRAT_TYPE_LABEL[s.type]}` : ""}
              </p>
            </div>
            {origin && (
              <a href={shareUrl(origin, s)} className="btn">
                <Eye className="size-4" aria-hidden="true" />
                View <span className="sr-only">{s.name}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
