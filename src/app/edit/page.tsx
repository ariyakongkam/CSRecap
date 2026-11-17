"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Editor } from "@/components/editor";

function EditorPage() {
  const id = useSearchParams().get("id") ?? "";
  return <Editor key={id} id={id} />;
}

export default function Page() {
  return (
    <Suspense fallback={<main className="p-8 text-muted">Loading…</main>}>
      <EditorPage />
    </Suspense>
  );
}
