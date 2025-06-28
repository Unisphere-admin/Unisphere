"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from "@/context/AuthContext";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { MessageProvider } from "@/context/MessageContext";
import { SessionProvider } from "@/context/SessionContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { CsrfProvider } from "@/context/CsrfContext";
import { initializeTokenRefresh } from '@/lib/auth/tokenRefresh';
import { useEffect } from 'react';

// Create a client for React Query
const queryClient = new QueryClient();

// Add a token refresh initializer component
function TokenRefreshInitializer() {
  useEffect(() => {
    // Only run in client-side
    if (typeof window !== 'undefined') {
      // Initialize the token refresh system
      const cleanup = initializeTokenRefresh();
      
      // Clean up when the component unmounts
      return () => {
        cleanup();
      };
    }
  }, []);
  
  // This component doesn't render anything
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
      <QueryClientProvider client={queryClient}>
      {/* Add TokenRefreshInitializer at the top level to start refreshing as early as possible */}
      <TokenRefreshInitializer />
      
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
          <SidebarProvider>
            <AuthProvider>
            <CsrfProvider>
              <RealtimeProvider>
                <MessageProvider>
                  <SessionProvider>
                    <Toaster />
                    {children}
                  </SessionProvider>
                </MessageProvider>
              </RealtimeProvider>
            </CsrfProvider>
            </AuthProvider>
          </SidebarProvider>
      </ThemeProvider>
      </QueryClientProvider>
  );
} 