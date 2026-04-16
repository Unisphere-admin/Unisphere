import { Metadata } from 'next';
import { Playfair_Display } from 'next/font/google';
import localFont from 'next/font/local';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  style: ['italic'],
  display: 'swap',
});

const satoshi = localFont({
  src: [
    { path: '../../public/Fonts/WEB/fonts/Satoshi-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/Fonts/WEB/fonts/Satoshi-Italic.woff2', weight: '400', style: 'italic' },
    { path: '../../public/Fonts/WEB/fonts/Satoshi-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/Fonts/WEB/fonts/Satoshi-MediumItalic.woff2', weight: '500', style: 'italic' },
    { path: '../../public/Fonts/WEB/fonts/Satoshi-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../public/Fonts/WEB/fonts/Satoshi-BoldItalic.woff2', weight: '700', style: 'italic' },
    { path: '../../public/Fonts/WEB/fonts/Satoshi-Black.woff2', weight: '900', style: 'normal' },
    { path: '../../public/Fonts/WEB/fonts/Satoshi-BlackItalic.woff2', weight: '900', style: 'italic' },
  ],
  variable: '--font-satoshi',
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
      <body className={`${playfair.variable} ${satoshi.variable} min-h-screen bg-background w-full overflow-x-hidden`}>
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