import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/logo";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const chakra = Chakra_Petch({ variable: "--font-chakra", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "CSRecap: Understand your game", template: "%s · CSRecap" },
  description:
    "Enter your FACEIT nickname or Steam ID and get a CS2 player report: your playstyle, strengths, weaknesses and a clear plan for what to improve next.",
};

export const viewport: Viewport = { themeColor: "#07080c" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${chakra.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2" aria-label="CSRecap home">
              <Logo />
            </Link>
            <span className="hidden text-xs text-muted sm:block">Free CS2 player reports · no account needed</span>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>Stats from the FACEIT Data API. CSRecap is an independent project, not affiliated with FACEIT or Valve.</p>
            <p>Built for players who want to improve, not just look at numbers.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
