"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MessageProvider } from "@/context/MessageContext";
import { SessionProvider } from "@/context/SessionContext";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { MessageNotification } from "@/components/MessageNotification";
import { needsAppProviders } from "@/lib/auth/needsAppProviders";

/**
 * Defers mounting MessageProvider, SessionProvider, and RealtimeProvider
 * until two conditions are both met:
 *   1. Auth has resolved AND a user is signed in (otherwise we'd hit
 *      authenticated APIs as an anonymous visitor and 401 immediately).
 *   2. The current route actually needs these providers (dashboard, session,
 *      resources, survey, onboarding). Marketing pages like `/`, `/about`,
 *      `/tutors`, `/testimonials`, etc. don't render anything that reads
 *      from MessageContext or SessionContext, so mounting them there just
 *      burns 2-3 seconds of authenticated API calls (`/api/conversations`,
 *      `/api/messages`, `/api/tutoring-sessions`, `/api/csrf`) per visit
 *      with zero user-visible benefit.
 *
 * MessageNotification only renders when MessageProvider is mounted, which
 * means message toasts only fire on app routes. That's intentional — a
 * logged-in user reading the marketing homepage isn't waiting for a tutor
 * reply, and any new messages will surface via the unread badge / toast
 * the moment they navigate into the dashboard.
 */
export default function AuthenticatedProviders({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const pathname = usePathname();

  // If auth hasn't resolved or user isn't signed in, render children bare.
  // Public pages (login, landing, etc.) still work fine without the providers.
  if (loading || !user) {
    return <>{children}</>;
  }

  // Authenticated user, but on a marketing route: skip the heavy providers.
  // The home page is a marketing page even for signed-in users.
  if (!needsAppProviders(pathname)) {
    return <>{children}</>;
  }

  return (
    <MessageProvider>
      <SessionProvider>
        <RealtimeProvider>
          {children}
          <MessageNotification />
        </RealtimeProvider>
      </SessionProvider>
    </MessageProvider>
  );
}
