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

// Create a client for React Query
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
      <QueryClientProvider client={queryClient}>
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
                    {children}
                    <Toaster />
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