"use client";

import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { MessageProvider } from "@/context/MessageContext";
import { SessionProvider } from "@/context/SessionContext";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { MessageNotification } from "@/components/MessageNotification";

/**
 * Defers mounting MessageProvider, SessionProvider, and RealtimeProvider
 * until the auth state is fully resolved. This prevents the providers from
 * making API calls and opening WebSocket connections for unauthenticated visitors,
 * eliminating the provider waterfall on initial page load.
 *
 * MessageNotification is rendered here (inside the providers) because it
 * depends on MessageContext and cannot render outside it.
 */
export default function AuthenticatedProviders({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();

  // While auth is resolving, render children without the heavy providers.
  // Pages will still show (login, landing page, etc.) but the data-fetching
  // providers won't fire until we know who the user is.
  if (loading || !user) {
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
