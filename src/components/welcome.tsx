"use client";

import { useMemo } from "react";
import { Board } from "@/components/board";
import { Modal } from "@/components/dialog";
import { C4Icon, UtilityIcon } from "@/components/utility-icons";
import { APP_NAME } from "@/lib/brand";
import { TEMPLATES } from "@/lib/strat/templates";
import { sceneOf, type Strat } from "@/lib/strat/types";

function Feature({ art, title, children }: { art: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex h-20 items-center">{art}</div>
      <h3 className="mt-2 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}

/**
 * First-visit introduction: what the app is for and the four things it
 * does, then a way in. Shown once per browser; the "?" button reopens it.
 */
export function Welcome({
  open,
  onClose,
  onExample,
  onBlank,
}: {
  open: boolean;
  onClose: () => void;
  onExample: (s: Strat) => void;
  onBlank: () => void;
}) {
  const example = useMemo(() => TEMPLATES[0].build(), []);
  return (
    <Modal open={open} onClose={onClose} title={`Welcome to ${APP_NAME}`} wide>
      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div className="hidden aspect-square overflow-hidden rounded-xl border border-line md:block">
          <Board scene={sceneOf(example, example.steps[0])} time={13} readOnly />
        </div>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Feature
            title="Plan step by step"
            art={
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {["Default", "Execute", "Post-plant"].map((s, i) => (
                  <span key={s} className={`rounded-md px-2 py-1 text-xs font-semibold ${i === 1 ? "bg-chalk text-chalk-ink" : "bg-panel-2 text-muted"}`}>
                    {s}
                  </span>
                ))}
              </div>
            }
          >
            Split a strat into steps, give everything a time, and press play to watch the round unfold.
          </Feature>
          <Feature
            title="Made for CS2"
            art={
              <div className="flex items-center gap-2 text-chalk" aria-hidden="true">
                <UtilityIcon type="smoke" className="size-8" />
                <UtilityIcon type="flash" className="size-8" />
                <UtilityIcon type="molotov" className="size-8" />
                <UtilityIcon type="he" className="size-8" />
                <C4Icon className="size-8" />
              </div>
            }
          >
            Smokes, flashes, molotovs, HEs, the bomb, sight cones and lineup links on every Active Duty map.
          </Feature>
          <Feature
            title="Share in one link"
            art={
              <div className="flex items-center gap-2" aria-hidden="true">
                <span className="rounded-lg border border-line bg-bg px-3 py-2 font-mono text-xs text-muted">…/view#N4Ig…</span>
                <span className="grid size-8 place-items-center rounded-full bg-team-t font-display text-sm font-bold text-bg">1</span>
                <span className="grid size-8 place-items-center rounded-full bg-team-t font-display text-sm font-bold text-bg">2</span>
              </div>
            }
          >
            Send your team a link. They can watch the strat without an account, and save their own copy.
          </Feature>
          <Feature
            title="Your playbook"
            art={
              <div className="grid grid-cols-4 gap-1" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} className={`h-4 w-8 rounded-sm ${i % 3 === 0 ? "bg-team-ct/70" : "bg-panel-2"}`} />
                ))}
              </div>
            }
          >
            Every strat is saved in this browser as you work. Duplicate one to make a variation.
          </Feature>
        </div>
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={() => onExample(TEMPLATES[0].build())}>
          Open the Mirage example
        </button>
        <button type="button" className="btn" onClick={onBlank}>
          Start a blank strat
        </button>
        <button type="button" className="btn border-transparent bg-transparent text-muted" onClick={onClose}>
          Skip
        </button>
      </div>
    </Modal>
  );
}
