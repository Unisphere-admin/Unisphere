import { Metadata } from 'next';
import { Playfair_Display, Syne } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  style: ['italic'],
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/components/QueryProvider";
import AuthenticatedProviders from "@/components/layout/AuthenticatedProviders";
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next";


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
    <html lang="en" suppressHydrationWarning className="w-full overflow-x-hidden">
      <head>
        {/* Preload critical assets */}
        <link rel="preload" as="image" href="/logo-name.png" />
        <style>{`
          :root {
            --sonner-z-index: 100;
          }
        `}</style>
      </head>
      <body className={`${playfair.variable} ${syne.variable} min-h-screen bg-background w-full overflow-x-hidden`}>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <AuthProvider>
              <TooltipProvider>
                <SidebarProvider>
                  <AuthenticatedProviders>
                    <Toaster />
                    <Sonner className="main-sonner-toaster" position="top-right" />
                    <ClientLayoutWrapper>
                      {children}
                    </ClientLayoutWrapper>
                    {process.env.NODE_ENV === "production" && <SpeedInsights />}
                  </AuthenticatedProviders>
                </SidebarProvider>
              </TooltipProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
} 