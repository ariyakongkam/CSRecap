import { ListChecks, Sparkles, Upload } from "lucide-react";

const POINTS = [
  { icon: Upload, text: "Upload a demo. AI goes through the rounds and points out what went well and what went wrong." },
  { icon: ListChecks, text: "Compare it with your strat: where the team followed the plan, and where it broke." },
  { icon: Sparkles, text: "Get tips to improve the plan: timings, utility and positions." },
];

/** The "coming soon" badge, so nobody mistakes AI Analyze for something that works today. */
export function SoonBadge() {
  return <span className="rounded-full border border-brand/60 px-2 py-0.5 text-xs font-semibold text-brand">Coming soon</span>;
}

/** What AI Analyze will do. Not built yet: always shown with the "Coming soon" badge. */
export function AiAnalyzePoints() {
  return (
    <ul className="space-y-3">
      {POINTS.map(({ icon: Icon, text }) => (
        <li key={text} className="flex gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand" aria-hidden="true">
            <Icon className="size-4" />
          </span>
          <span className="pt-1 text-muted">{text}</span>
        </li>
      ))}
    </ul>
  );
}

/** A card announcing AI Analyze, for the landing page and the strats page. */
export function AiAnalyzeCard({ headingId, level = 2 }: { headingId: string; level?: 2 | 3 }) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="rounded-2xl border border-line bg-panel p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-brand/12 text-brand" aria-hidden="true">
          <Sparkles className="size-6" />
        </span>
        <Heading id={headingId} className="font-display text-3xl font-semibold">
          AI Analyze
        </Heading>
        <SoonBadge />
      </div>
      <p className="mt-3 max-w-2xl text-lg">Learn from every match: turn your demos into a better plan for the next one.</p>
      <div className="mt-5">
        <AiAnalyzePoints />
      </div>
      <p className="mt-5 text-sm text-faint">Not available yet. Planning strats is free and works today.</p>
    </div>
  );
}
