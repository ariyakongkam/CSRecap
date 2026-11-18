import type { UtilityType } from "@/lib/strat/types";

/**
 * Grenade icons drawn for a 24×24 box in `currentColor`, so the same shapes
 * work in the toolbar (inside an <svg>) and on the board (inside a <g>).
 * Kept to one bold silhouette each, so they read at 20px and apart from each other:
 * smoke = cloud, flash = starburst, HE = round frag, molotov = burning bottle,
 * decoy = grenade with sound waves.
 */
export function UtilityShape({ type }: { type: UtilityType }) {
  switch (type) {
    case "smoke":
      return (
        <g fill="currentColor">
          <circle cx="8" cy="14.5" r="4.8" />
          <circle cx="13.2" cy="10.2" r="6" />
          <circle cx="17.6" cy="15" r="4.4" />
          <rect x="8" y="14.5" width="9.6" height="4.9" />
        </g>
      );
    case "flash":
      return (
        <path
          fill="currentColor"
          d="M12 1.5L13.76 7.75L19.42 4.58L16.25 10.24L22.5 12L16.25 13.76L19.42 19.42L13.76 16.25L12 22.5L10.24 16.25L4.58 19.42L7.75 13.76L1.5 12L7.75 10.24L4.58 4.58L10.24 7.75Z"
        />
      );
    case "he":
      return (
        <g fill="currentColor">
          <circle cx="12" cy="14.5" r="7.5" />
          <rect x="9.5" y="3.5" width="5" height="4.5" rx="1" />
          <path d="M14.5 4.2h2.6a1.4 1.4 0 0 1 1.4 1.4v4.6h-2V6.2h-2z" />
        </g>
      );
    case "molotov":
      return (
        <g fill="currentColor">
          <path d="M12 0.8c2.4 2.2 3.1 4 1.8 5.4c-.9 1-2.7 1-3.6 0c-1.2-1.4-.4-3 1.8-5.4z" />
          <rect x="10.3" y="7.2" width="3.4" height="4.3" rx="0.6" />
          <rect x="7.2" y="11" width="9.6" height="11.5" rx="2.6" />
        </g>
      );
    case "decoy":
      return (
        <g>
          <rect x="3.5" y="9" width="7.5" height="12.5" rx="2.2" fill="currentColor" />
          <rect x="5.3" y="5.8" width="3.9" height="3.6" rx="0.8" fill="currentColor" />
          <path d="M14.5 11.5a4 4 0 0 1 0 6.5M17.6 8.6a8 8 0 0 1 0 12.3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
  }
}

/** The icon on its own, for HTML (toolbar, timeline, lists). */
export function UtilityIcon({ type, className = "size-5" }: { type: UtilityType; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <UtilityShape type={type} />
    </svg>
  );
}

/** The C4: a brick with a display and a light. */
export function C4Icon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="5" y="8.5" width="8" height="3.5" rx="0.5" fill="currentColor" />
      <rect x="5" y="13.5" width="8" height="2" rx="0.5" fill="currentColor" opacity="0.6" />
      <circle cx="17.5" cy="10" r="1.4" fill="currentColor" />
    </svg>
  );
}
