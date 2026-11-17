"use client";

import { ArrowRight, LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { parsePlayerQuery } from "@/lib/faceit/query";

export function SearchForm({ size = "lg", defaultValue = "" }: { size?: "lg" | "sm"; defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = parsePlayerQuery(value);
    if (q.kind === "invalid") {
      setError(q.reason);
      return;
    }
    setError(null);
    startTransition(() => router.push(`/player/${encodeURIComponent(q.value)}`));
  }

  const lg = size === "lg";

  return (
    <form onSubmit={submit} className="w-full" noValidate>
      <div
        className={`group flex items-center gap-2 rounded-2xl border bg-surface-2/80 p-1.5 shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_20px_60px_-20px_rgb(0_0_0/0.8)] transition focus-within:border-accent/60 ${
          error ? "border-bad/60" : "border-line-strong"
        }`}
      >
        <Search className={`ml-3 shrink-0 text-faint ${lg ? "size-5" : "size-4"}`} aria-hidden="true" />
        <label htmlFor={`player-search-${size}`} className="sr-only">
          FACEIT nickname or Steam ID
        </label>
        <input
          id={`player-search-${size}`}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={lg ? "FACEIT nickname or Steam ID" : "Nickname or Steam ID"}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? `player-search-error-${size}` : undefined}
          className={`min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-faint ${
            lg ? "h-12 text-base sm:text-lg" : "h-9 text-sm"
          }`}
        />
        <button
          type="submit"
          disabled={pending}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent font-semibold text-accent-ink transition hover:brightness-110 active:scale-[0.98] disabled:opacity-70 ${
            lg ? "h-12 px-4 text-sm sm:px-6 sm:text-base" : "h-9 px-3 text-sm"
          }`}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="size-4 sm:hidden" aria-hidden="true" />
          )}
          <span className={lg ? "hidden sm:inline" : ""}>{pending ? "Analyzing…" : "Analyze Player"}</span>
          {lg && <span className="sr-only sm:hidden">Analyze Player</span>}
        </button>
      </div>
      {error && (
        <p id={`player-search-error-${size}`} role="alert" className="mt-2 px-1 text-sm text-bad">
          {error}
        </p>
      )}
    </form>
  );
}
