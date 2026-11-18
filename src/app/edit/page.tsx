"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Editor } from "@/components/editor";

function EditorPage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  return <Editor key={id} id={id} from={params.get("from")} />;
}

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-muted">Loading…</main>}>
      <EditorPage />
    </Suspense>
  );
}
