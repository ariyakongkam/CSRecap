import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-sm font-semibold text-accent">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Nothing here</h1>
      <p className="mt-2 text-muted">This page doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
        Analyze a player
      </Link>
    </div>
  );
}
