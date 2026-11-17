import { Check, Crosshair, Flame, Hand, Repeat2, Shield, Sparkles, TrendingDown, TrendingUp, Zap } from "lucide-react";
import type { Insight, Playstyle, PlaystyleId } from "@/lib/analysis/types";

const PLAYSTYLE_ICON: Record<PlaystyleId, React.ComponentType<{ className?: string }>> = {
  awper: Crosshair,
  entry: Zap,
  support: Shield,
  clutch: Hand,
  consistent: Repeat2,
  impact: Flame,
  balanced: Sparkles,
};

const CONFIDENCE_LABEL: Record<Playstyle["confidence"], string> = {
  high: "Based on lots of match data",
  medium: "Based on a fair amount of data",
  low: "Early read: play more matches",
};

export function PlaystyleCard({ playstyle }: { playstyle: Playstyle }) {
  const Icon = PLAYSTYLE_ICON[playstyle.id];
  return (
    <section aria-labelledby="playstyle-heading" className="card relative h-full overflow-hidden p-6">
      <div className="glow-violet pointer-events-none absolute -top-28 -left-20 size-80" aria-hidden="true" />
      <div className="relative">
        <p id="playstyle-heading" className="text-xs font-medium tracking-widest text-violet uppercase">
          Your playstyle
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-violet/30 bg-violet/10">
            <Icon className="size-6 text-violet" aria-hidden="true" />
          </span>
          <h2 className="font-display text-2xl leading-tight font-bold sm:text-3xl">{playstyle.name}</h2>
        </div>
        <p className="mt-4 text-pretty text-text/90">{playstyle.tagline}</p>

        <ul className="mt-4 space-y-2">
          {playstyle.reasons.map((r) => (
            <li key={r} className="flex gap-2 text-sm text-muted">
              <Check className="mt-0.5 size-4 shrink-0 text-violet" aria-hidden="true" />
              <span>{r}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {playstyle.traits.map((t) => (
            <span key={t} className="rounded-full border border-line-strong bg-surface-2 px-2.5 py-1 text-xs text-muted">
              {t}
            </span>
          ))}
        </div>

        <p className="mt-5 border-t border-line pt-4 text-xs text-faint">
          {playstyle.secondary ? (
            <>
              Also shows signs of a <span className="text-muted">{playstyle.secondary.name}</span> ·{" "}
            </>
          ) : null}
          {CONFIDENCE_LABEL[playstyle.confidence]}
        </p>
      </div>
    </section>
  );
}

export function CoachSummary({ summary }: { summary: string[] }) {
  return (
    <section aria-labelledby="coach-heading" className="card h-full p-6">
      <p id="coach-heading" className="text-xs font-medium tracking-widest text-accent uppercase">
        Coach summary
      </p>
      <div className="mt-4 space-y-3">
        {summary.map((s, i) => (
          <p key={i} className={i === 0 ? "font-display text-xl leading-snug font-semibold text-balance sm:text-2xl" : "text-pretty text-text/85"}>
            {s}
          </p>
        ))}
      </div>
    </section>
  );
}

function InsightItem({ insight }: { insight: Insight }) {
  const strength = insight.kind === "strength";
  return (
    <li className="rounded-xl border border-line bg-surface-2/50 p-4">
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:justify-between sm:gap-3">
        <h3 className="font-semibold">{insight.title}</h3>
        <span
          className={`tabular shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
            strength ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
          }`}
        >
          {insight.evidence}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{insight.detail}</p>
    </li>
  );
}

export function InsightColumns({ strengths, weaknesses }: { strengths: Insight[]; weaknesses: Insight[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section aria-labelledby="strengths-heading" className="card p-6">
        <h2 id="strengths-heading" className="flex items-center gap-2 font-display text-lg font-bold">
          <TrendingUp className="size-5 text-good" aria-hidden="true" /> Your strengths
        </h2>
        {strengths.length ? (
          <ul className="mt-4 space-y-3">
            {strengths.map((i) => (
              <InsightItem key={i.id} insight={i} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Nothing stands out above the typical player yet. That&apos;s normal early on, and the plan below is where it starts.
          </p>
        )}
      </section>
      <section aria-labelledby="weaknesses-heading" className="card p-6">
        <h2 id="weaknesses-heading" className="flex items-center gap-2 font-display text-lg font-bold">
          <TrendingDown className="size-5 text-bad" aria-hidden="true" /> What&apos;s holding you back
        </h2>
        {weaknesses.length ? (
          <ul className="mt-4 space-y-3">
            {weaknesses.map((i) => (
              <InsightItem key={i.id} insight={i} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No clear leaks in your numbers. Your next gains come from sharpening what you already do well.
          </p>
        )}
      </section>
    </div>
  );
}
