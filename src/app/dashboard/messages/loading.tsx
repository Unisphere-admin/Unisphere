export default function MessagesLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Conversation list skeleton */}
      <div className="w-80 flex-shrink-0 border-r border-border/40 flex flex-col">
        {/* Search bar skeleton */}
        <div className="p-4 border-b border-border/40">
          <div className="h-9 rounded-md bg-muted/50 animate-pulse" />
        </div>

        {/* Conversation items skeleton */}
        <div className="flex-1 overflow-hidden p-2 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-muted/50 animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Name */}
                <div
                  className="h-3.5 rounded bg-muted/50 animate-pulse"
                  style={{ width: `${55 + (i % 3) * 15}%` }}
                />
                {/* Preview */}
                <div
                  className="h-3 rounded bg-muted/40 animate-pulse"
                  style={{ width: `${40 + (i % 4) * 10}%` }}
                />
              </div>
              {/* Time */}
              <div className="w-10 h-3 rounded bg-muted/40 animate-pulse flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Message thread skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Thread header */}
        <div className="h-16 border-b border-border/40 px-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted/50 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-36 rounded bg-muted/50 animate-pulse" />
            <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden px-6 py-4 space-y-4">
          {[
            { side: "left",  widths: ["60%", "45%"] },
            { side: "right", widths: ["50%"] },
            { side: "left",  widths: ["70%", "40%", "55%"] },
            { side: "right", widths: ["65%", "30%"] },
            { side: "left",  widths: ["50%"] },
            { side: "right", widths: ["75%", "45%"] },
          ].map((group, gi) => (
            <div
              key={gi}
              className={`flex gap-3 ${group.side === "right" ? "flex-row-reverse" : ""}`}
            >
              {group.side === "left" && (
                <div className="w-8 h-8 rounded-full bg-muted/50 animate-pulse flex-shrink-0 mt-1" />
              )}
              <div className="flex flex-col gap-1 max-w-[65%]">
                {group.widths.map((w, wi) => (
                  <div
                    key={wi}
                    className="h-9 rounded-2xl bg-muted/50 animate-pulse"
                    style={{ width: w }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="border-t border-border/40 p-4 flex items-center gap-3">
          <div className="flex-1 h-10 rounded-full bg-muted/50 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-muted/50 animate-pulse flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
