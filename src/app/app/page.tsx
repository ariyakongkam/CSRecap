import type { Metadata } from "next";
import { Library } from "@/components/library";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Your strats",
  description: "Start a new CS2 strat or open one you saved in this browser.",
  robots: { index: false },
};

export default function AppHome() {
  return (
    <>
      <Library />
      <SiteFooter />
    </>
  );
}
