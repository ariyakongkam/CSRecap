/** The csgg mark: an orbit swoosh with a four-point star. Drawn as vector paths on a 1024 grid. */
export const LOGO_PATHS = [
  "M829 186C836 246 852 268 915 276C852 284 836 306 829 366C822 306 806 284 743 276C806 268 822 246 829 186Z",
  "M728 410C812 396 914 402 922 462C934 548 796 672 400 826C700 670 852 560 845 488C840 438 790 418 728 410Z",
  "M205 640C150 680 96 737 103 784C111 842 242 850 432 775C300 802 180 806 162 752C150 712 172 672 205 640Z",
];

export function LogoMark({ className = "size-8", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="80 160 870 700" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      {LOGO_PATHS.map((d) => (
        <path key={d} d={d} fill="var(--brand)" />
      ))}
    </svg>
  );
}
