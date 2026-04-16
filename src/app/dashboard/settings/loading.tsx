export default function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page title */}
      <div className="h-8 w-40 rounded-lg bg-muted/50 animate-pulse" />

      {/* Profile card */}
      <div className="rounded-xl border border-border/40 p-6 space-y-6">
        {/* Card header */}
        <div className="h-5 w-32 rounded bg-muted/50 animate-pulse" />

        {/* Avatar + name row */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-muted/50 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-muted/50 animate-pulse" />
            <div className="h-3 w-64 rounded bg-muted/40 animate-pulse" />
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-24 rounded bg-muted/40 animate-pulse" />
              <div className="h-9 w-full rounded-md bg-muted/50 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Bio textarea */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-16 rounded bg-muted/40 animate-pulse" />
          <div className="h-24 w-full rounded-md bg-muted/50 animate-pulse" />
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <div className="h-9 w-28 rounded-md bg-muted/50 animate-pulse" />
        </div>
      </div>

      {/* Second card */}
      <div className="rounded-xl border border-border/40 p-6 space-y-4">
        <div className="h-5 w-44 rounded bg-muted/50 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-muted/40 animate-pulse" />
              <div className="h-9 w-full rounded-md bg-muted/50 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <div className="h-9 w-28 rounded-md bg-muted/50 animate-pulse" />
        </div>
      </div>

      {/* Third card (qualifications / subjects) */}
      <div className="rounded-xl border border-border/40 p-6 space-y-4">
        <div className="h-5 w-36 rounded bg-muted/50 animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 w-full rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
