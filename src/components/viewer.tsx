"use client";

import { Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Board } from "@/components/board";
import { Logo } from "@/components/logo";
import { Timeline } from "@/components/timeline";
import { MAPS } from "@/lib/maps";
import { duplicateStrat } from "@/lib/strat/model";
import { decodeStrat } from "@/lib/strat/share";
import { saveStrat } from "@/lib/strat/storage";
import { UTILITY_LABEL, type PlacedPlayer, type Strat } from "@/lib/strat/types";

/** Read-only view of a shared strat; the strat lives entirely in the URL fragment. */
export function Viewer() {
  const router = useRouter();
  const [strat, setStrat] = useState<Strat | null | undefined>(undefined);
  const [time, setTime] = useState<number | null>(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const read = () => setStrat(decodeStrat(window.location.hash.slice(1)));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (strat === undefined) return <main className="p-8 text-muted">Loading…</main>;
  if (strat === null) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">This link doesn&apos;t contain a strat</h1>
        <p className="mt-2 text-muted">Part of the link is probably missing. Ask whoever sent it to copy it again.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Make your own
        </Link>
      </main>
    );
  }

  const roster = strat.objects
    .filter((o): o is PlacedPlayer => o.kind === "player")
    .sort((a, b) => a.team.localeCompare(b.team) || a.n - b.n);
  const utility = strat.objects
    .filter((o) => o.kind === "utility")
    .sort((a, b) => (a.kind === "utility" && b.kind === "utility" ? a.t - b.t : 0));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
      <header className="flex items-center justify-between gap-3 py-4">
        <Logo />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const copy = { ...duplicateStrat(strat), name: strat.name };
            if (saveStrat(copy)) router.push(`/edit?id=${copy.id}`);
          }}
        >
          <Copy className="size-4" /> Save a copy to edit
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3">
          <div className="mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-180px))] overflow-hidden rounded-xl border border-line">
            <Board strat={strat} time={time} readOnly />
          </div>
          <Timeline strat={strat} time={time} onTime={setTime} playing={playing} onPlaying={setPlaying} editable={false} />
        </div>

        <aside className="space-y-5 rounded-xl border border-line bg-panel p-5">
          <div>
            <h1 className="font-display text-3xl font-semibold">{strat.name}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              <span className={`inline-block size-2.5 rounded-full ${strat.side === "T" ? "bg-team-t" : "bg-team-ct"}`} aria-hidden="true" />
              {MAPS[strat.map].name}, {strat.side} side
            </p>
          </div>
          {strat.call && (
            <div>
              <h2 className="label">When to call it</h2>
              <p className="text-sm whitespace-pre-line">{strat.call}</p>
            </div>
          )}
          {roster.length > 0 && (
            <div>
              <h2 className="label">Roles</h2>
              <ul className="space-y-1.5">
                {roster.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className={`grid size-6 place-items-center rounded-full text-xs font-black text-bg ${p.team === "T" ? "bg-team-t" : "bg-team-ct"}`}>{p.n}</span>
                    {p.role || <span className="text-faint">No role</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {utility.length > 0 && (
            <div>
              <h2 className="label">Utility order</h2>
              <ol className="space-y-1 text-sm">
                {utility.map((u) =>
                  u.kind === "utility" ? (
                    <li key={u.id}>
                      <button type="button" className="min-h-9 hover:text-chalk" onClick={() => setTime(u.t)}>
                        <span className="tabular-nums text-muted">{u.t}s</span> {UTILITY_LABEL[u.type]}
                      </button>
                    </li>
                  ) : null,
                )}
              </ol>
            </div>
          )}
          {strat.notes && (
            <div>
              <h2 className="label">Notes</h2>
              <p className="text-sm whitespace-pre-line">{strat.notes}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
