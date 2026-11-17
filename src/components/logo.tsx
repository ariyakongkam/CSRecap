import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--accent)" strokeWidth="2" />
        <path d="M7 15l4-4 2 2 4-5" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Execute
    </Link>
  );
}
