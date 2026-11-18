"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#who", label: "Who it's for" },
  { href: "#ai", label: "AI Analyze" },
  { href: "#faq", label: "FAQ" },
];

/** Sticks to the top; gets a background and a line once the page has scrolled. */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled ? "border-line bg-bg/85 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <Logo />
        <nav aria-label="Page sections" className="hidden items-center gap-2 text-sm text-muted md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="link-slide inline-flex min-h-11 items-center px-2">
              {n.label}
            </a>
          ))}
        </nav>
        <Link href="/app" className="btn btn-primary">
          Open planner
        </Link>
      </div>
    </header>
  );
}
