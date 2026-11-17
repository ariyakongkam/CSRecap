import { CircleAlert, SearchX, Timer, WifiOff } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import type { LookupError } from "@/lib/faceit/client";

const COPY: Record<LookupError["code"], { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  invalid_query: { title: "That doesn't look right", icon: CircleAlert },
  not_found: { title: "Player not found", icon: SearchX },
  no_cs2: { title: "No CS2 matches yet", icon: SearchX },
  rate_limited: { title: "Slow down a second", icon: Timer },
  unavailable: { title: "FACEIT isn't responding", icon: WifiOff },
  not_configured: { title: "Service unavailable", icon: WifiOff },
};

export function LookupErrorState({ error, query }: { error: LookupError; query: string }) {
  const { title, icon: Icon } = COPY[error.code];
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-line-strong bg-surface">
        <Icon className="size-6 text-muted" aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">{error.message}</p>
      {error.code === "not_found" && (
        <p className="mt-1 text-sm text-faint">Nicknames must match FACEIT exactly. You can also paste your Steam ID.</p>
      )}
      <div className="mt-8 w-full">
        <SearchForm size="sm" defaultValue={error.code === "invalid_query" ? query : ""} />
      </div>
    </div>
  );
}
