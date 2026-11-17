import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Big_Shoulders_Stencil } from "next/font/google";
import { APP_NAME } from "@/lib/brand";
import "./globals.css";

const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const condensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-condensed" });
const stencil = Big_Shoulders_Stencil({ subsets: ["latin"], weight: ["800"], variable: "--font-stencil", adjustFontFallback: false });

export const metadata: Metadata = {
  title: { default: `${APP_NAME}: CS2 tactics board`, template: `%s · ${APP_NAME}` },
  description: "Plan executes, utility and timing on a 2D board, then share them with your team in one link.",
};

export const viewport: Viewport = { themeColor: "#101a24", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${condensed.variable} ${stencil.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
