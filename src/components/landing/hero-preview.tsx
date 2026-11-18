"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "@/components/board";
import { LogoMark } from "@/components/logo-mark";
import { phaseDuration } from "@/components/phase-bar";
import { APP_NAME } from "@/lib/brand";
import { MAPS } from "@/lib/maps";
import { stratDuration } from "@/lib/strat/timeline";
import { TEMPLATES } from "@/lib/strat/templates";
import { sceneOf, type Strat } from "@/lib/strat/types";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The hero's picture is the planner itself: an example strat playing phase by phase on a loop,
 * on a card that lies tilted and flattens as the page scrolls. The cat peeks over the edge and
 * follows the pointer with its eyes. With reduced motion it is a still, flat board.
 */
export function HeroPreview() {
  // Built after mount: the example has random ids, which must not differ between server and browser.
  const [strat, setStrat] = useState<Strat | null>(null);
  const [phase, setPhase] = useState(0);
  const [time, setTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStrat(TEMPLATES[0].build());
    if (reducedMotion()) setPlaying(false);
  }, []);

  const durations = useMemo(
    () =>
      strat
        ? strat.steps.map(
            (s) => phaseDuration(stratDuration(sceneOf(strat, s))) + 1.5,
          )
        : [],
    [strat],
  );

  // Playback: every phase in turn, then from the start again. Paused while off screen or hidden.
  useEffect(() => {
    if (!strat || !playing) return;
    let frame = 0;
    let last: number | null = null;
    let t = time ?? 0;
    let p = phase;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (cardRef.current) io.observe(cardRef.current);
    const tick = (now: number) => {
      const dt =
        last === null || !visible || document.hidden ? 0 : (now - last) / 1000;
      last = now;
      t += dt;
      if (t >= durations[p]) {
        p = (p + 1) % strat.steps.length;
        t = 0;
        setPhase(p);
      }
      setTime(t);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when play state or strat changes
  }, [strat, playing, durations]);

  // The card lies tilted at the top of the page and flattens as you scroll down.
  useEffect(() => {
    if (reducedMotion()) return;
    const card = cardRef.current;
    if (!card) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / 520));
      card.style.setProperty("--tilt", String(1 - p));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, []);

  // The cat's eyes follow the pointer.
  useEffect(() => {
    if (reducedMotion()) return;
    const cat = catRef.current;
    if (!cat) return;
    const on = (e: PointerEvent) => {
      const r = cat.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * 0.6);
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, len / 300);
      cat.style.setProperty(
        "--look-x",
        `${((dx / len) * 14 * k).toFixed(1)}px`,
      );
      cat.style.setProperty(
        "--look-y",
        `${((dy / len) * 10 * k).toFixed(1)}px`,
      );
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, []);

  const step = strat?.steps[phase];
  return (
    <div className="relative [perspective:1400px]">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2rem] bg-brand/15 blur-3xl"
      />
      <div
        ref={cardRef}
        className="relative transition-transform duration-100 ease-out will-change-transform motion-safe:[transform:rotateX(calc(var(--tilt,1)*16deg))_rotateY(calc(var(--tilt,1)*-14deg))_rotateZ(calc(var(--tilt,1)*2deg))_scale(calc(1-var(--tilt,1)*0.04))]"
      >
        {/* The cat peeks over the card's top edge: the card covers its chin. */}
        <div
          ref={catRef}
          className="absolute -top-[4.1rem] left-8 w-24 text-white sm:-top-[4.6rem] sm:w-28"
          aria-hidden="true"
        >
          <LogoMark className="logo-blink h-auto w-full" />
        </div>
        <figure className="relative rounded-2xl border border-line-strong bg-panel p-2.5 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between gap-2 px-1.5 pb-2.5">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="font-display font-semibold">
                {strat ? strat.name : "Mirage A Execute"}
              </span>
              {step && (
                <span className="truncate rounded-md bg-panel-2 px-2 py-0.5 text-xs text-muted">
                  Phase {phase + 1}: {step.name}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="grid size-11 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-panel-2 hover:text-text"
              aria-label={playing ? "Pause the example" : "Play the example"}
            >
              {playing ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </button>
          </div>
          <div
            className="pointer-events-none aspect-square overflow-hidden rounded-xl border border-line"
            aria-hidden="true"
          inert
          >
            {strat && step ? (
              <Board
                scene={sceneOf(strat, step)}
                time={playing ? time : null}
                readOnly
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- the radar as a placeholder until the example loads
              <img
                src={MAPS.mirage.radar ?? ""}
                alt=""
                className="size-full object-cover opacity-80"
              />
            )}
          </div>
          <figcaption className="sr-only">
            An example strat in {APP_NAME}: an A execute on Mirage, played phase
            by phase on a loop.
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
