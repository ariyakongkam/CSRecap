import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Big_Shoulders_Stencil } from "next/font/google";
import { APP_NAME } from "@/lib/brand";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const condensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-condensed" });
const stencil = Big_Shoulders_Stencil({ subsets: ["latin"], weight: ["800"], variable: "--font-stencil", adjustFontFallback: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${APP_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: { type: "website", siteName: APP_NAME, title: SITE_TITLE, description: SITE_DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#101a24", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${condensed.variable} ${stencil.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
