import { Crosshair, Fingerprint, ListChecks, MessageSquareText } from "lucide-react";
import { Reveal } from "@/components/motion";
import { SearchForm } from "@/components/search-form";

const FEATURES = [
  {
    icon: Fingerprint,
    title: "Your playstyle",
    body: "Entry, support, clutch player or AWPer? We read your opening duels, utility and clutches and tell you who you are in a match.",
  },
  {
    icon: Crosshair,
    title: "Strengths & weaknesses",
    body: "Up to three of each, explained in plain words and backed by your real numbers.",
  },
  {
    icon: MessageSquareText,
    title: "Coach summary",
    body: "Not \"your ADR is 74\". Instead: what that number means for your rounds, and why it's costing you Elo.",
  },
  {
    icon: ListChecks,
    title: "Your next focus",
    body: "One goal with a measurable target and three concrete tasks for your next matches. One thing at a time.",
  },
];

const STEPS = [
  { n: "01", title: "Enter your name", body: "FACEIT nickname, Steam ID or profile link. No sign-up." },
  { n: "02", title: "We read your matches", body: "Career stats, per-map results and your last 20 games from FACEIT." },
  { n: "03", title: "Get your report", body: "Playstyle, strengths, weaknesses and a plan, in about a second." },
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="glow-accent pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2" aria-hidden="true" />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pt-20 pb-20 text-center sm:px-6 sm:pt-28 sm:pb-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/80 px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              CS2 · FACEIT player reports
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-6 font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
              Understand your game.
              <br />
              <span className="text-accent">Improve every match.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted sm:text-lg">
              Analyze your CS2 performance and find out what kind of player you are, what&apos;s holding you back, and
              exactly what to work on next.
            </p>
          </Reveal>
          <Reveal delay={0.15} className="mt-9 w-full max-w-xl">
            <SearchForm />
            <p className="mt-3 text-xs text-faint">
              Works with a FACEIT nickname, a SteamID64 or a steamcommunity.com/profiles/… link.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Not another stats page</h2>
          <p className="mt-2 text-muted">
            Plenty of sites show you numbers. CSRecap tells you what they mean and what to do about them.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={0.05 * i} className="card p-5">
              <f.icon className="size-5 text-accent" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-3 sm:px-6">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="font-display text-sm font-semibold text-accent">{s.n}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
