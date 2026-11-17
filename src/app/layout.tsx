import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Execute: tactics board", template: "%s · Execute" },
  description: "Plan executes, utility and timing on a 2D board, then share them with your team in one link.",
};

export const viewport: Viewport = { themeColor: "#0d1014", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
