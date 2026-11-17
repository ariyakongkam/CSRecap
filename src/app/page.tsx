import type { Metadata } from "next";
import { Clock, Crosshair, Layers, Link2, Map as MapIcon, PenLine, Save, Users } from "lucide-react";
import Link from "next/link";
import { Board } from "@/components/board";
import { Logo } from "@/components/logo";
import { C4Icon, UtilityIcon } from "@/components/utility-icons";
import { APP_NAME } from "@/lib/brand";
import { ACTIVE_DUTY, FAQ, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import type { Scene } from "@/lib/strat/types";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/**
 * A still picture of the planner for the hero: a Mirage A-site setup with
 * smokes, a flash, three players and a sight cone. No routes, no animation.
 */
const HERO_SCENE: Scene = {
  map: "mirage",
  side: "T",
  objects: [
    { id: "s1", kind: "utility", type: "smoke", t: 0, x: 372, y: 600 },
    { id: "s2", kind: "utility", type: "smoke", t: 0, x: 292, y: 700 },
    { id: "s3", kind: "utility", type: "smoke", t: 0, x: 440, y: 612 },
    { id: "f1", kind: "utility", type: "flash", t: 0, x: 548, y: 690 },
    { id: "p1", kind: "player", team: "T", n: 1, role: "Entry", x: 690, y: 755 },
    { id: "p2", kind: "player", team: "T", n: 2, role: "Support", x: 735, y: 640 },
    { id: "p3", kind: "player", team: "T", n: 3, role: "Smokes", x: 815, y: 610 },
    { id: "v1", kind: "vision", x: 690, y: 755, angle: 190, length: 150, cone: "normal" },
    { id: "e1", kind: "player", team: "CT", n: 1, role: "", x: 520, y: 735 },
    { id: "d1", kind: "drawing", shape: "dashed-arrow", points: [{ x: 660, y: 770 }, { x: 575, y: 760 }], color: "#ffffff", opacity: 0.9, width: 5 },
    { id: "m1", kind: "utility", type: "molotov", t: 0, x: 488, y: 790 },
  ],
};

const FEATURES = [
  {
    icon: <MapIcon className="size-6" />,
    title: "Accurate CS2 radar maps",
    text: `All Active Duty maps on the real radar overviews: ${ACTIVE_DUTY.join(", ")}. Bombsites are marked and callouts are one click away.`,
  },
  {
    icon: <UtilityIcon type="smoke" className="size-6" />,
    title: "Real CS2 utility",
    text: "Smokes, flashes, molotovs and HE grenades sized to the area they cover, plus the C4 and lineup pins that link to a video or screenshot.",
  },
  {
    icon: <Clock className="size-6" />,
    title: "Timing you can play back",
    text: "Give every route and grenade a time, then press play and watch the execute run on a 1:55 round clock.",
  },
  {
    icon: <Layers className="size-6" />,
    title: "Steps for the whole round",
    text: "Split a strat into steps like default, execute and post-plant. A new step starts with everyone where the last one ended.",
  },
  {
    icon: <Crosshair className="size-6" />,
    title: "Sight cones",
    text: "Show where each player holds with wide, normal or narrow cones, and drag them to the exact angle and distance.",
  },
  {
    icon: <PenLine className="size-6" />,
    title: "Pen, arrows and notes",
    text: "Freehand, lines, arrows, rectangles and dashed strokes in any colour, plus notes for the call.",
  },
  {
    icon: <Link2 className="size-6" />,
    title: "Share in one link",
    text: "Send the link in Discord. Teammates open the strat in any browser, without an account, and can save their own copy.",
  },
  {
    icon: <Save className="size-6" />,
    title: "Saved as you work",
    text: "Every change is saved in your browser automatically, with undo for anything you didn't mean to do.",
  },
];

const STEPS = [
  { title: "Pick a map and your side", text: "Choose one of the Active Duty maps and whether you're T or CT." },
  { title: "Draw the strat", text: "Place your five, draw their routes, drop each smoke, flash and molotov at the second it lands, and mark where everyone holds." },
  { title: "Send the link", text: "Copy the share link into your team's Discord. Everyone sees the same plan, step by step." },
];

const AUDIENCE = [
  { title: "IGLs", text: "Turn the calls in your head into strats the team can study before the match." },
  { title: "Coaches", text: "Explain executes, retakes and anti-ecos with timing, not a screenshot with arrows." },
  { title: "FACEIT and league teams", text: "Build a shared stratbook for ESEA, FACEIT hubs and local leagues without paying for software." },
];

function JsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: APP_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "GameApplication",
      operatingSystem: "Web browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: FEATURES.map((f) => f.title),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to plan a CS2 strat with your team",
      step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.text })),
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default function Landing() {
  return (
    <>
      <JsonLd />
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
            <a href="#features" className="hidden min-h-11 items-center px-3 text-sm text-muted hover:text-text sm:inline-flex">
              Features
            </a>
            <a href="#how" className="hidden min-h-11 items-center px-3 text-sm text-muted hover:text-text sm:inline-flex">
              How it works
            </a>
            <a href="#faq" className="hidden min-h-11 items-center px-3 text-sm text-muted hover:text-text sm:inline-flex">
              FAQ
            </a>
            <Link href="/app" className="btn btn-primary">
              Open planner
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 lg:pt-20 lg:pb-24">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-end">
            <h1 className="font-display text-5xl leading-[0.98] font-bold text-balance sm:text-6xl lg:text-7xl">
              The CS2 strat planner for your whole team
            </h1>
            <div>
              <p className="text-lg text-pretty text-muted sm:text-xl">
                Draw executes, retakes and setups on accurate CS2 maps. Time every smoke, flash and molotov, then send your team one
                link. Free, in your browser, no sign-up.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/app" className="btn btn-primary btn-lg">
                  Start planning for free
                </Link>
                <a href="#how" className="btn btn-lg border-transparent bg-transparent text-muted hover:text-text">
                  See how it works
                </a>
              </div>
            </div>
          </div>
          <figure className="mt-12">
            <div className="aspect-[9/5] overflow-hidden rounded-2xl border border-line bg-[var(--void)] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]">
              <Board scene={HERO_SCENE} time={1} readOnly viewBox="210 470 720 400" />
            </div>
            <figcaption className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span className="sr-only">The {APP_NAME} planner on Mirage A site: three smokes, a flash, a molotov, players with sight cones and an entry arrow.</span>
              <span className="flex items-center gap-2">
                <MapIcon className="size-4 text-brand" aria-hidden="true" /> 8 Active Duty maps
              </span>
              <span className="flex items-center gap-2">
                <C4Icon className="size-4 text-brand" /> Smokes, flashes, mollies, HE and the C4
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-4 text-brand" aria-hidden="true" /> Teammates view without an account
              </span>
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="what" className="border-y border-line bg-panel/60">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
            <h2 id="what" className="font-display text-3xl font-semibold sm:text-4xl">
              What is {APP_NAME}?
            </h2>
            <p className="mt-4 text-lg text-pretty text-muted">{FAQ[0].a}</p>
          </div>
        </section>

        <section id="features" aria-labelledby="features-h" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <h2 id="features-h" className="max-w-2xl font-display text-4xl font-semibold text-balance sm:text-5xl">
            Everything your CS2 stratbook needs
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted">Built around how teams actually prepare: maps, utility, timing and a link to send.</p>
          <dl className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <dt>
                  <span className="grid size-11 place-items-center rounded-lg bg-brand/12 text-brand" aria-hidden="true">
                    {f.icon}
                  </span>
                  <span className="mt-4 block font-display text-xl font-semibold">{f.title}</span>
                </dt>
                <dd className="mt-2 text-muted">{f.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="how" aria-labelledby="how-h" className="scroll-mt-20 border-y border-line bg-panel/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="how-h" className="font-display text-4xl font-semibold sm:text-5xl">
              How to plan a CS2 strat in three steps
            </h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative">
                  <span className="font-display text-6xl leading-none font-bold text-brand/80" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-display text-2xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
            <Link href="/app" className="btn btn-primary btn-lg mt-12">
              Start planning for free
            </Link>
          </div>
        </section>

        <section aria-labelledby="who" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="who" className="font-display text-4xl font-semibold sm:text-5xl">
            Made for the people who make the calls
          </h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {AUDIENCE.map((a) => (
              <div key={a.title} className="border-l-2 border-brand pl-5">
                <h3 className="font-display text-2xl font-semibold">{a.title}</h3>
                <p className="mt-2 text-muted">{a.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-h" className="scroll-mt-20 border-t border-line bg-panel/60">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <h2 id="faq-h" className="font-display text-4xl font-semibold sm:text-5xl">
              Questions about {APP_NAME}
            </h2>
            <div className="mt-8 divide-y divide-line border-y border-line">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-1">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    <h3>{f.q}</h3>
                    <span className="text-2xl text-brand transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="cta" className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 id="cta" className="font-display text-4xl font-semibold text-balance sm:text-5xl">
            Your next execute starts on the board
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">Open the planner, pick a map and draw your first strat. It takes a minute and costs nothing.</p>
          <Link href="/app" className="btn btn-primary btn-lg mt-8">
            Start planning for free
          </Link>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p>Not affiliated with Valve. Map radar images and screenshots are © Valve Corporation.</p>
        </div>
      </footer>
    </>
  );
}
