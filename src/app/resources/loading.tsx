export default function ResourcesLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Search bar skeleton */}
      <div className="h-11 w-full max-w-md rounded-full bg-muted animate-pulse mb-6" />

      {/* Category chips skeleton */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 rounded-full bg-muted animate-pulse" style={{ width: `${70 + i * 10}px` }} />
        ))}
      </div>

      {/* Banner skeleton */}
      <div className="h-48 rounded-2xl bg-muted animate-pulse mb-10" />

      {/* Section title skeleton */}
      <div className="h-6 w-36 bg-muted rounded animate-pulse mb-5" />

      {/* Card grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5 space-y-3 animate-pulse">
            <div className="h-11 w-11 rounded-xl bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
