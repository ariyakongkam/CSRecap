import type { UtilityType } from "@/lib/strat/types";

/**
 * Grenade icons drawn for a 24×24 box in `currentColor`, so the same shapes
 * work in the toolbar (inside an <svg>) and on the board (inside a <g>).
 * Silhouettes follow the CS2 grenades: a smoke canister with vent holes,
 * a slim banded flashbang, a round frag HE and a molotov bottle with a flame.
 */
export function UtilityShape({ type }: { type: UtilityType }) {
  switch (type) {
    case "smoke":
      return (
        <g fill="currentColor">
          <rect x="9" y="3.5" width="6" height="3.5" rx="1" />
          <path d="M15.5 4h1.6a1.6 1.6 0 0 1 1.6 1.6v6.4h-1.6V5.8h-1.6z" />
          <path
            fillRule="evenodd"
            d="M9.4 7.5h5.2a2.6 2.6 0 0 1 2.6 2.6v9.3a2.6 2.6 0 0 1-2.6 2.6H9.4a2.6 2.6 0 0 1-2.6-2.6v-9.3a2.6 2.6 0 0 1 2.6-2.6zM9.6 12.4a1.1 1.1 0 1 0 0 .01zM14.4 12.4a1.1 1.1 0 1 0 0 .01zM12 16.6a1.1 1.1 0 1 0 0 .01zM9.6 19a1 1 0 1 0 0 .01zM14.4 19a1 1 0 1 0 0 .01z"
          />
        </g>
      );
    case "flash":
      return (
        <g fill="currentColor">
          <rect x="9.8" y="2.5" width="4.4" height="3.2" rx="0.8" />
          <path d="M14.6 3h1.3a1.4 1.4 0 0 1 1.4 1.4v6.3h-1.4V4.4h-1.3z" />
          <path fillRule="evenodd" d="M10.2 6.2h3.6a1.9 1.9 0 0 1 1.9 1.9v12.2a1.9 1.9 0 0 1-1.9 1.9h-3.6a1.9 1.9 0 0 1-1.9-1.9V8.1a1.9 1.9 0 0 1 1.9-1.9zM8.3 10.2h7.4v1.4H8.3zM8.3 16.6h7.4v1.4H8.3z" />
        </g>
      );
    case "he":
      return (
        <g fill="currentColor">
          <rect x="10" y="4" width="4" height="4" rx="0.8" />
          <path d="M14.4 4.6h2.2a1.6 1.6 0 0 1 1.6 1.6v5.6h-1.5V6.1h-2.3z" />
          <path fillRule="evenodd" d="M12 7.6a7.2 7.2 0 1 1 0 14.4a7.2 7.2 0 0 1 0-14.4zM12 11.4a3.4 3.4 0 1 0 0 .01zM8.6 14.2h6.8v1.1H8.6zM11.45 10.9h1.1v7.6h-1.1z" />
        </g>
      );
    case "molotov":
      return (
        <g fill="currentColor">
          <path d="M12.1 0.8c1.9 1.9 2.7 3.5 1.4 5c-.8.9-2.6.9-3.3-.1c-.9-1.3.2-2.7 1.9-4.9z" />
          <rect x="10.4" y="6.8" width="3.2" height="4.4" rx="0.6" />
          <path
            fillRule="evenodd"
            d="M10.2 10.6h3.6c1.8 0 3.2 1.4 3.2 3.2v6.4a1.9 1.9 0 0 1-1.9 1.9H8.9a1.9 1.9 0 0 1-1.9-1.9v-6.4c0-1.8 1.4-3.2 3.2-3.2zM8.6 15.4h6.8v2.4H8.6z"
          />
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
