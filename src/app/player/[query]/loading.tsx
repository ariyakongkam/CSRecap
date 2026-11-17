function Block({ className = "" }: { className?: string }) {
  return <div className={`card animate-pulse ${className}`} />;
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8" aria-busy="true" aria-live="polite">
      <p className="sr-only">Analyzing player…</p>
      <div className="ml-auto h-12 max-w-md" />
      <Block className="h-[116px]" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Block key={i} className="h-[98px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Block className="h-72 lg:col-span-2" />
        <Block className="h-72 lg:col-span-3" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Block className="h-64" />
        <Block className="h-64" />
      </div>
    </div>
  );
}
