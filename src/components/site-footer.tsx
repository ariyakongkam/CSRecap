import { Coffee } from "lucide-react";
import Link from "next/link";
import { LogoLockup } from "@/components/logo-mark";
import { APP_NAME } from "@/lib/brand";
import { KOFI_URL } from "@/lib/links";
import { ACTIVE_DUTY } from "@/lib/site";

const PRODUCT = [
  { href: "/app", label: "Open the planner" },
  { href: "/#features", label: "Features" },
  { href: "/#who", label: "Who it's for" },
  { href: "/#ai", label: "AI Analyze (coming soon)" },
  { href: "/#faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
];

/** Support link to Ko-fi: a plain link (no Ko-fi widget), so no third-party script runs on the site. */
export function KofiButton({ className = "" }: { className?: string }) {
  return (
    <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className={`btn btn-kofi ${className}`}>
      <Coffee className="size-4" aria-hidden="true" />
      Support {APP_NAME} on Ko-fi
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** The site footer: what radstrat is, where to go, how to support it, and the fine print. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-panel/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link href="/" aria-label={`${APP_NAME} home`} className="logo-link inline-flex text-white">
            <LogoLockup className="h-12 w-auto" />
          </Link>
          <p className="mt-4 max-w-sm text-muted">The free CS2 strat planner for players, teams and coaches. Plan the round, play it back, share it in one link.</p>
          <p className="mt-6 text-sm text-muted">Free to use. If it helps your team, you can buy me a coffee.</p>
          <KofiButton className="mt-3" />
        </div>
        <nav aria-labelledby="footer-product">
          <h2 id="footer-product" className="font-display text-lg font-semibold">
            {APP_NAME}
          </h2>
          <ul className="mt-3 space-y-1">
            {PRODUCT.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="link-slide inline-flex min-h-11 items-center text-muted md:min-h-9">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-display text-lg font-semibold">Maps</h2>
          <p className="mt-3 text-muted">{ACTIVE_DUTY.join(", ")} and Cache. Nuke has both levels.</p>
          <h2 className="mt-6 font-display text-lg font-semibold">Privacy</h2>
          <p className="mt-3 text-muted">No tracking. Your strats stay in your browser and travel in the links you share. Sign in with Steam (optional) to have them on every PC.</p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © 2026 {APP_NAME}. Made for the CS2 community.
          </p>
          <p>
            Not affiliated with Valve. Map radar images are © Valve Corporation. Spawn data by{" "}
            <a href="https://setpos.gg" target="_blank" rel="noopener noreferrer" className="link-slide text-muted">
              setpos.gg
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
