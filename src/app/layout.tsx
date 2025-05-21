import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MessageProvider } from "@/context/MessageContext";
import { SessionProvider } from "@/context/SessionContext";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MentorConnect - Find your perfect tutor match',
  description: 'Connect with expert tutors for personalized learning sessions',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="w-full">
      <body className={`${inter.className} min-h-screen bg-background w-full`}>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <AuthProvider>
              <TooltipProvider>
                <SidebarProvider>
                  <MessageProvider>
                    <SessionProvider>
                      <Toaster />
                      <Sonner position="bottom-right" />
                      <div className="flex flex-col min-h-screen w-full">
                        <Navbar />
                        <main className="flex-1 w-full">
                          {children}
                        </main>
                        <Footer />
                      </div>
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