import type { Metadata } from "next";
import { Viewer } from "@/components/viewer";

export const metadata: Metadata = { title: "Shared strat" };

export default function Page() {
  return <Viewer />;
}
