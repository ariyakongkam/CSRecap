import type { Metadata } from "next";
import { PlaybookView } from "@/components/playbook-view";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Shared playbook", robots: { index: false } };

export default function Page() {
  return (
    <>
      <PlaybookView />
      <SiteFooter />
    </>
  );
}
