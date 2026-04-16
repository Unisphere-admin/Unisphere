/**
 * Route-level loading screen for the Meeting page.
 * The Agora video SDK (~700 KB) is loaded on this route - this skeleton
 * prevents a blank screen while it initialises.
 */
export default function MeetingLoading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white gap-4">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: "0ms" }} />
        <div className="w-5 h-5 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: "150ms" }} />
        <div className="w-5 h-5 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: "300ms" }} />
      </div>
      <p className="text-white/60 text-sm">Preparing your session…</p>
    </div>
  );
}
