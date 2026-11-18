"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { MAPS } from "@/lib/maps";
import { backupCopy, duplicateStrat, sameContent } from "@/lib/strat/model";
import { decodeStrat } from "@/lib/strat/share";
import { loadStrat, saveStrat } from "@/lib/strat/storage";
import type { Strat } from "@/lib/strat/types";

type State =
  | { kind: "loading" }
  | { kind: "bad" }
  | { kind: "failed" }
  | { kind: "choose"; incoming: Strat; mine: Strat };

const phases = (s: Strat) =>
  `${s.steps.length} ${s.steps.length === 1 ? "phase" : "phases"}`;
const items = (s: Strat) => {
  const n = s.steps.reduce((sum, st) => sum + st.objects.length, 0);
  return `${n} ${n === 1 ? "item" : "items"}`;
};
const changed = (s: Strat) => {
  const d = new Date(s.updatedAt);
  return Number.isNaN(d.getTime())
    ? ""
    : `Last changed ${d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
};

/**
 * Opens an invite to edit. A strat you don't have yet is saved in this browser and opened.
 * One you already have (same id) asks first: take their changes (your version is kept as a copy),
 * keep both, or ignore the link.
 */
export function Join() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const incoming = decodeStrat(window.location.hash.slice(1));
    if (!incoming) return setState({ kind: "bad" });
    const mine = loadStrat(incoming.id);
    if (!mine) {
      if (!saveStrat(incoming)) return setState({ kind: "failed" });
      return router.replace(`/edit?id=${incoming.id}&from=invite`);
    }
    if (sameContent(mine, incoming))
      return router.replace(`/edit?id=${mine.id}&from=same`);
    setState({ kind: "choose", incoming, mine });
  }, [router]);

  if (state.kind === "loading")
    return <main className="p-8 text-muted">Opening the invite…</main>;
  if (state.kind === "bad" || state.kind === "failed") {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">
          {state.kind === "bad"
            ? "This invite link doesn't contain a strat"
            : "This browser couldn't save the strat"}
        </h1>
        <p className="mt-2 text-muted">
          {state.kind === "bad"
            ? "Part of the link is probably missing. Ask whoever sent it to copy it again."
            : "Its storage is full or blocked (for example in a private window). Try a normal window."}
        </p>
        <Link href="/app" className="btn btn-primary mt-6">
          Go to your strats
        </Link>
      </main>
    );
  }

  const { incoming, mine } = state;
  function update() {
    const backup = backupCopy(mine);
    if (!saveStrat(backup) || !saveStrat(incoming))
      return setState({ kind: "failed" });
    router.replace(`/edit?id=${incoming.id}&from=updated`);
  }
  function keepBoth() {
    const copy = {
      ...duplicateStrat(incoming),
      name: `${incoming.name} (from invite)`.slice(0, 80),
    };
    if (!saveStrat(copy)) return setState({ kind: "failed" });
    router.replace(`/edit?id=${copy.id}&from=invite`);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Logo />
      <h1 className="mt-10 font-display text-4xl font-semibold">
        You already have this strat
      </h1>
      <p className="mt-2 text-muted">
        Someone sent you their version of{" "}
        <strong className="text-text">{mine.name}</strong>. Pick what to do with
        it.
      </p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel p-4">
          <dt className="label">Their version</dt>
          <dd>
            {incoming.name}
            <span className="block text-sm text-muted">
              {MAPS[incoming.map].name}, {incoming.side} side,{" "}
              {phases(incoming)}, {items(incoming)}
              <span className="block">{changed(incoming)}</span>
            </span>
          </dd>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <dt className="label">Your version</dt>
          <dd>
            {mine.name}
            <span className="block text-sm text-muted">
              {MAPS[mine.map].name}, {mine.side} side, {phases(mine)},{" "}
              {items(mine)}
              <span className="block">{changed(mine)}</span>
            </span>
          </dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-col gap-2">
        <button type="button" className="btn btn-primary" onClick={update}>
          Update mine with their changes
        </button>
        <p className="text-sm text-muted">
          Your current version is kept as a copy, so nothing is lost.
        </p>
        <button type="button" className="btn mt-2" onClick={keepBoth}>
          Keep both
        </button>
        <Link href={`/edit?id=${mine.id}`} className="btn">
          Ignore this link and open mine
        </Link>
      </div>
    </main>
  );
}
