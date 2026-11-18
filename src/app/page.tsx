import type { Metadata } from "next";
import { Layers, Link2, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { AiAnalyzeCard } from "@/components/ai-analyze";
import { Logo } from "@/components/logo";
import { LogoMark } from "@/components/logo-mark";
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
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Logo />
        <Link href="/app" className="btn btn-primary">
          Open planner
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pt-10 pb-20 sm:px-6 md:grid-cols-[1.3fr_1fr] md:pt-16 md:pb-28">
          <div>
            <h1 className="font-display text-5xl leading-[0.98] font-bold text-balance sm:text-6xl">
              The free CS2 strat planner for players, teams and coaches
            </h1>
            <p className="mt-6 max-w-xl text-lg text-pretty text-muted sm:text-xl">
              {APP_NAME} is a tactics board for Counter-Strike 2. Plan executes, retakes and smoke lineups on every Active Duty map, then
              share the strat with your team in one link.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/app" className="btn btn-primary btn-lg">
                Start planning for free
              </Link>
              <span className="text-sm text-muted">No sign-up. Runs in your browser.</span>
            </div>
          </div>
          <div className="relative grid place-items-center" aria-hidden="true">
            <div className="absolute size-72 rounded-full bg-brand/15 blur-3xl sm:size-80" />
            <LogoMark className="relative h-auto w-56 sm:w-72 md:w-full md:max-w-sm" />
          </div>
        </section>

        <section aria-labelledby="features" className="border-y border-line bg-panel/60">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 id="features" className="font-display text-3xl font-semibold sm:text-4xl">
              Plan CS2 strats the way you call them
            </h2>
            <div className="mt-10 grid gap-10 md:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <span className="grid size-11 place-items-center rounded-lg bg-brand/12 text-brand" aria-hidden="true">
                    {f.icon}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold">{f.title}</h3>
                  <p className="mt-2 text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="who" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 id="who" className="font-display text-3xl font-semibold sm:text-4xl">
            Built for everyone who plays to win
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {AUDIENCE.map((a) => (
              <div key={a.title} className="border-l-2 border-brand pl-4">
                <h3 className="font-display text-xl font-semibold">{a.title}</h3>
                <p className="mt-1 text-muted">{a.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="ai" className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <AiAnalyzeCard headingId="ai" />
        </section>

        <section aria-labelledby="faq" className="border-t border-line bg-panel/60">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h2 id="faq" className="font-display text-3xl font-semibold sm:text-4xl">
              Frequently asked questions
            </h2>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {FAQ.map((f) => (
                <details key={f.q} className="group">
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
            <div className="mt-10 text-center">
              <Link href="/app" className="btn btn-primary btn-lg">
                Start planning for free
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo />
        <p>Not affiliated with Valve. Map radar images are © Valve Corporation.</p>
      </footer>
    </>
  );
}
