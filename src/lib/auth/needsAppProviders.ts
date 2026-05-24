/**
 * Returns true if the given pathname is an "app" route that actually needs
 * the messaging / session / realtime data providers mounted.
 *
 * This is used to keep marketing pages (`/`, `/about`, `/tutors`, etc.) free
 * of API prefetches and WebSocket connections that they don't use, so that
 * a logged-in user visiting the homepage doesn't pay for `/api/conversations`,
 * `/api/messages`, `/api/tutoring-sessions`, and friends.
 *
 * Add a path here whenever a new section of the app starts depending on
 * MessageContext / SessionContext / RealtimeContext.
 */
export function needsAppProviders(pathname: string | null | undefined): boolean {
  if (!pathname) return false;

  // App routes that need messaging / realtime / sessions data.
  // Marketing/auth pages are intentionally excluded.
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/session") ||
    pathname.startsWith("/resources") ||
    pathname.startsWith("/onboarding") ||
    // Individual tutor profile pages (`/tutors/<id>`) render a "Message Tutor"
    // button that reads MessageContext to start a conversation. The bare
    // `/tutors` list page does NOT need the providers — hence the trailing
    // slash, which matches detail pages only.
    pathname.startsWith("/tutors/")
  );
}
