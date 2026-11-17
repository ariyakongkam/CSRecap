export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="var(--accent)" strokeWidth="2" />
        <path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2" fill="var(--accent)" />
      </svg>
      <span className="font-display text-[17px] font-bold tracking-wide">
        CS<span className="text-accent">Recap</span>
      </span>
    </span>
  );
}
