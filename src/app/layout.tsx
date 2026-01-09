import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MessageProvider } from "@/context/MessageContext";
import { SessionProvider } from "@/context/SessionContext";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";
import { MessageNotification } from '@/components/MessageNotification';
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Unisphere - Your All-In-One Uni Admissions Platform',
  description: 'Connect with experts worldwide for personalized learning experiences',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png' }
    ],
    shortcut: { url: '/logo.png' }
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="w-full">
      <head>
        <style>{`
          /* Ensure Sonner toasts are above everything */
          :root {
            --sonner-z-index: 100;
          }
        `}</style>
      </head>
      <body className={`${inter.className} min-h-screen bg-background w-full`}>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <AuthProvider>
              <TooltipProvider>
                <SidebarProvider>
                  <MessageProvider>
                    <SessionProvider>
                      <RealtimeProvider>
                        <Toaster />
                        <Sonner className="main-sonner-toaster" position="top-right" />
                        <ClientLayoutWrapper>
                          {children}
                        </ClientLayoutWrapper>
                        <MessageNotification />
                        <SpeedInsights />
                      </RealtimeProvider>
                    </SessionProvider>
                  </MessageProvider>
                </SidebarProvider>
              </TooltipProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
} 