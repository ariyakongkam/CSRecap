import type { Metadata } from "next";
import { Join } from "@/components/join";

export const metadata: Metadata = { title: "Strat invite", robots: { index: false } };

export default function Page() {
  return <Join />;
}
