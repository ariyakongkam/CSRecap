"use client";

import { LogoMark } from "@/components/logo-mark";
import { Modal } from "@/components/dialog";
import { C4Icon, UtilityIcon } from "@/components/utility-icons";
import { APP_NAME } from "@/lib/brand";
import { MAPS, MAP_IDS } from "@/lib/maps";

function Feature({ art, title, children }: { art: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex h-12 items-center">{art}</div>
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
  onBlank,
}: {
  open: boolean;
  onClose: () => void;
  onBlank: () => void;
}) {
  const thumbs = MAP_IDS.filter((m) => MAPS[m].thumb).slice(0, 6);
  return (
    <Modal open={open} onClose={onClose} title={`Welcome to ${APP_NAME}`} wide>
      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div className="relative hidden aspect-square overflow-hidden rounded-xl border border-line md:block" aria-hidden="true">
          <div className="grid h-full grid-cols-2 grid-rows-3">
            {thumbs.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m} src={MAPS[m].thumb!} alt="" className="h-full w-full object-cover opacity-60" />
            ))}
          </div>
          <div className="absolute inset-0 grid place-items-center bg-bg/55">
            <LogoMark className="h-32 w-40 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]" />
          </div>
        </div>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Feature
            title="Plan phase by phase"
            art={
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {["Default", "Execute", "Post-plant"].map((s, i) => (
                  <span key={s} className={`rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap ${i === 1 ? "bg-chalk text-chalk-ink" : "bg-panel-2 text-muted"}`}>
                    {s}
                  </span>
                ))}
              </div>
            }
          >
            Split the round into phases. Each new phase starts with everything already placed. Press play to watch the round unfold.
          </Feature>
          <Feature
            title="Made for CS2"
            art={
              <div className="flex items-center gap-1.5 text-brand" aria-hidden="true">
                <UtilityIcon type="smoke" className="size-7" />
                <UtilityIcon type="flash" className="size-7" />
                <UtilityIcon type="molotov" className="size-7" />
                <UtilityIcon type="he" className="size-7" />
                <C4Icon className="size-7" />
              </div>
            }
          >
            Smokes, flashes, molotovs, HEs, decoys, the bomb, sight cones, role markers and lineup links on every Active Duty map.
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
        <button type="button" className="btn btn-primary" onClick={onBlank} data-autofocus>
          Pick a map and start
        </button>
        <button type="button" className="btn border-transparent bg-transparent text-muted" onClick={onClose}>
          Skip
        </button>
      </div>
    </Modal>
  );
}
