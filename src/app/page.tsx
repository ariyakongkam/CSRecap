import type { Metadata } from "next";
import { ArrowRight, Layers, Link2, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { AiAnalyzeCard } from "@/components/ai-analyze";
import { Logo } from "@/components/logo";
import { LogoMark } from "@/components/logo-mark";
import { HeroPreview } from "@/components/landing/hero-preview";
import { Reveal } from "@/components/landing/reveal";
import { SiteHeader } from "@/components/landing/site-header";
import { APP_NAME } from "@/lib/brand";
import { ACTIVE_DUTY, FAQ, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const FEATURES = [
  {
    icon: <MapIcon className="size-6" />,
    title: "Every Active Duty map",
    text: `Plan on ${ACTIVE_DUTY.join(", ")}. Place your five, the enemy setup and where everyone holds.`,
  },
  {
    icon: <Layers className="size-6" />,
    title: "Plan it phase by phase",
    text: "Split the round into phases like default, execute and post-plant. Drop smokes, flashes, molotovs, HEs and the bomb, add lineup links, and press play to watch it unfold.",
  },
  {
    icon: <Link2 className="size-6" />,
    title: "Share in one link",
    text: "Send a view link to your team's Discord, or an edit link to your co-coach. Everyone opens it in any browser without an account.",
  },
];

const AUDIENCE = [
  { title: "Players", text: "Learn your role and timings before you queue FACEIT or Premier." },
  { title: "Teams", text: "Keep one stratbook for executes, retakes and anti-ecos, shared by the whole roster." },
  { title: "Coaches", text: "Explain a strat phase by phase, with movement, instead of a screenshot with arrows." },
  { title: "Esports", text: "Prepare for ESEA, league and LAN matches with a playbook for every map in the pool." },
];

function JsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: APP_NAME,
      url: SITE_URL,
      image: `${SITE_URL}/icon.svg`,
      description: SITE_DESCRIPTION,
      applicationCategory: "GameApplication",
      operatingSystem: "Web browser",
      audience: { "@type": "Audience", audienceType: "Counter-Strike 2 players, teams, coaches and esports organisations" },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: FEATURES.map((f) => f.title),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default function Landing() {
  return (
    <>
      <JsonLd />
      <div className="scroll-progress" aria-hidden="true" />
      <SiteHeader />

      <main>
        <section className="relative overflow-x-clip">
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pt-14 pb-20 sm:px-6 md:grid-cols-[1.05fr_1fr] md:pt-20 md:pb-28">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1 text-sm text-muted">
                <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
                Free CS2 tactics board
              </p>
              <h1 className="mt-5 font-display text-5xl leading-[0.95] font-bold text-balance sm:text-6xl lg:text-7xl">
                Plan the round. <span className="text-brand">Win the round.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-pretty text-muted sm:text-xl">
                {APP_NAME} is the free CS2 strat planner for players, teams and coaches. Plan executes, retakes and smoke lineups
                phase by phase on every Active Duty map, then share the strat with your team in one link.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href="/app" className="btn btn-primary btn-lg">
                  Start planning for free
                  <ArrowRight className="btn-arrow size-5" aria-hidden="true" />
                </Link>
                <a href="#features" className="link-slide inline-flex min-h-11 items-center px-1 text-lg font-medium text-text">
                  See what it does
                </a>
              </div>
              <p className="mt-4 text-sm text-muted">No sign-up. Runs in your browser. Your strats stay on your device.</p>
            </div>
            <div className="pt-14 md:pt-0">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section aria-labelledby="features" className="border-y border-line bg-panel/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <Reveal>
              <h2 id="features" className="font-display text-3xl font-semibold sm:text-5xl">
                Plan CS2 strats the way you call them
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 110}>
                  <div className="card-lift group h-full rounded-2xl border border-line bg-bg/60 p-6">
                    <span
                      className="grid size-12 place-items-center rounded-xl bg-brand/12 text-brand transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
                      aria-hidden="true"
                    >
                      {f.icon}
                    </span>
                    <h3 className="mt-5 font-display text-2xl font-semibold">{f.title}</h3>
                    <p className="mt-2 text-muted">{f.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="who" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 id="who" className="font-display text-3xl font-semibold sm:text-5xl">
              Built for everyone who plays to win
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 md:grid-cols-4">
            {AUDIENCE.map((a, i) => (
              <Reveal key={a.title} delay={i * 90}>
                <div className="card-lift h-full rounded-2xl border border-line p-5 hover:bg-panel/60">
                  <span className="block h-1 w-10 rounded-full bg-brand" aria-hidden="true" />
                  <h3 className="mt-4 font-display text-2xl font-semibold">{a.title}</h3>
                  <p className="mt-1 text-muted">{a.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section aria-labelledby="ai" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <Reveal>
            <AiAnalyzeCard headingId="ai" />
          </Reveal>
        </section>

        <section aria-labelledby="faq" className="border-t border-line bg-panel/60">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <Reveal>
              <h2 id="faq" className="font-display text-3xl font-semibold sm:text-5xl">
                Frequently asked questions
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <div className="mt-8 divide-y divide-line border-y border-line">
                {FAQ.map((f) => (
                  <details key={f.q} className="faq-item group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium transition-colors hover:text-brand [&::-webkit-details-marker]:hidden">
                      <h3>{f.q}</h3>
                      <span className="text-2xl text-brand transition-transform duration-300 group-open:rotate-45" aria-hidden="true">
                        +
                      </span>
                    </summary>
                    <p className="pb-5 text-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <Reveal>
            <LogoMark className="logo-blink mx-auto h-auto w-24 text-white" />
            <h2 className="mt-6 font-display text-4xl font-semibold text-balance sm:text-5xl">Your next round starts with a plan</h2>
            <p className="mx-auto mt-3 max-w-lg text-lg text-muted">Free, no sign-up. Open the planner and place your five.</p>
            <Link href="/app" className="btn btn-primary btn-lg mt-8">
              Start planning for free
              <ArrowRight className="btn-arrow size-5" aria-hidden="true" />
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p>Not affiliated with Valve. Map radar images are © Valve Corporation.</p>
        </div>
      </footer>
    </>
  );
}
