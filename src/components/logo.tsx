import Link from "next/link";

/** Wordmark: a crosshair split by a route arrow. */
export function Logo() {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-2 font-display text-2xl font-bold tracking-tight">
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden="true">
        <circle cx="14" cy="14" r="11" fill="none" stroke="var(--chalk)" strokeWidth="2" />
        <path d="M14 1v6M14 21v6M1 14h6M21 14h6" stroke="var(--chalk)" strokeWidth="2" />
        <path d="M8 19l5-5 3 2 5-6" fill="none" stroke="var(--t)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Execute
    </Link>
  );
}
