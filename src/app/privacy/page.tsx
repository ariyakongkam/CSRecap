import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { APP_NAME } from "@/lib/brand";
import { PRIVACY_CONTACT } from "@/lib/links";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${APP_NAME} stores, why, where, and how to download or delete it.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "20 November 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-muted">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <header className="py-5">
          <Logo />
        </header>
        <h1 className="font-display text-4xl font-semibold">Privacy</h1>
        <p className="mt-2 text-muted">Last updated {UPDATED}. In short: as little as possible, and you can download or delete it at any time.</p>

        <Section title="Without an account">
          <p>
            Your strats are saved only in your own browser. They leave it only inside links you choose to share (the strat sits in the part of the link after
            the #, which browsers never send to a server). There are no ads, no analytics and no tracking cookies.
          </p>
          <p>
            The site is hosted by Cloudflare, which, like any web host, handles your IP address to deliver the pages and protect the site against attacks.
          </p>
        </Section>

        <Section title="When you sign in with Steam">
          <p>Signing in is optional. It saves your strats to your account, so they show up on every PC where you sign in. We store:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Your SteamID (the public number of your Steam account). Steam gives us nothing else: no email, no name, no password.</li>
            <li>The strats you save, with the time they were saved, and a marker for strats you delete (so your other PCs remove them too).</li>
            <li>A fingerprint of your login session and when it expires (30 days). The login code itself is only in your browser&apos;s cookie.</li>
          </ul>
          <p>
            We use this only to keep you signed in and to save and sync your strats, which is the service you ask for when you sign in (GDPR article 6(1)(b)).
            We never sell it, share it for marketing, or use it for anything else.
          </p>
        </Section>

        <Section title="Where it is kept">
          <p>
            In a Cloudflare D1 database located in the European Union. Cloudflare processes it on our behalf under its data processing terms. You sign in on
            Steam&apos;s own website; Valve handles that step under Steam&apos;s privacy policy.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            Only when you sign in: one cookie that keeps you signed in (30 days) and one that checks the sign-in itself (10 minutes). Both are strictly needed
            for signing in, so there is no cookie banner. There are no other cookies.
          </p>
        </Section>

        <Section title="How long">
          <p>
            Until you delete your account. Login sessions end after 30 days or when you sign out. Deleting your account removes your SteamID, your strats and
            your sessions from our server at once.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            In your account (the Account button on your strats page) you can download all your data as a file and delete your account. You also have the right
            to ask what we hold, to correct it, to object, and to complain to your data protection authority (in Sweden: IMY, imy.se).
          </p>
          <p>{PRIVACY_CONTACT ? <>Questions about your data: {PRIVACY_CONTACT}</> : <>Questions about your data: contact details will be added here.</>}</p>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
