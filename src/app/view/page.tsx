import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { Viewer } from "@/components/viewer";

export const metadata: Metadata = { title: "Shared strat" };

export default function Page() {
  return (
    <>
      <Viewer />
      <SiteFooter />
    </>
  );
}
