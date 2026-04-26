import { Metadata } from 'next';
import { Playfair_Display } from 'next/font/google';
import localFont from 'next/font/local';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  style: ['italic'],
  display: 'swap',
});

// Only the Satoshi weights actually used across the app are loaded. Regular
// (400), Medium (500), and Bold (700). Italic variants are handled by Playfair
// Display; Light (300) and Black (900) are not referenced anywhere. Trimming
// these saves ~150-200 KB of font payload preloaded on every route.
const satoshi = localFont({
  src: [
    { path: '../../public/Fonts/WEB/fonts/Satoshi-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/Fonts/WEB/fonts/Satoshi-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/Fonts/WEB/fonts/Satoshi-Bold.woff2', weight: '700', style: 'normal' },
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
  // metadataBase makes every relative URL in OG/Twitter/canonical resolve
  // against the production origin, so social-card crawlers (Twitter, Slack,
  // Discord, LinkedIn) and Google all see absolute URLs.
  metadataBase: new URL('https://unisphere.my'),
  title: {
    // Per-route layouts can supply their own title. Anything that doesn't sets
    // the default; anything that does gets " | Unisphere" appended via template.
    default: 'Unisphere — Your All-In-One Uni Admissions Platform',
    template: '%s | Unisphere',
  },
  description:
    'Unisphere connects students with admissions tutors who got into Princeton, Cornell, Oxford, and more. Essay reviews, application strategy, interview prep.',
  applicationName: 'Unisphere',
  keywords: [
    'university admissions',
    'college admissions',
    'admissions tutoring',
    'essay review',
    'personal statement',
    'Ivy League',
    'Oxbridge',
    'university tutor',
    'application strategy',
  ],
  authors: [{ name: 'Unisphere' }],
  creator: 'Unisphere',
  publisher: 'Unisphere',
  // Default OG and Twitter — per-route layouts can override.
  openGraph: {
    type: 'website',
    siteName: 'Unisphere',
    locale: 'en_US',
    url: 'https://unisphere.my',
    title: 'Unisphere — Your All-In-One Uni Admissions Platform',
    description:
      'Get matched with admissions tutors who actually got into top universities. Essay reviews, application strategy, interview prep.',
    images: [{ url: '/logo-name.png', width: 1200, height: 630, alt: 'Unisphere' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unisphere — Your All-In-One Uni Admissions Platform',
    description:
      'Get matched with admissions tutors who actually got into top universities.',
    images: ['/logo-name.png'],
  },
  // Default robots: indexable. Auth/private route layouts override with
  // robots: { index: false, follow: false }.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: { canonical: '/' },
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
        {/* Preconnect to origins we hit almost immediately, so the TLS
            handshake and DNS lookup happen in parallel with the HTML parse
            rather than blocking the first auth/data call. */}
        <link rel="preconnect" href="https://wtsekxjhqvwnpexnszwl.supabase.co" crossOrigin="" />
        <link rel="dns-prefetch" href="https://wtsekxjhqvwnpexnszwl.supabase.co" />

        {/* Preload critical assets */}
        <link rel="preload" as="image" href="/logo-name.png" />
        <style>{`
          :root {
            --sonner-z-index: 100;
          }
        `}</style>
        {/* JSON-LD Organization schema. Helps Google build a knowledge panel
            and link the site to the brand. The dangerouslySetInnerHTML form
            is the canonical Next.js way to inject structured data into <head>
            without React escaping the JSON. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Unisphere",
              alternateName: "Unisphere Admissions",
              url: "https://unisphere.my",
              logo: "https://unisphere.my/logo.png",
              description:
                "Unisphere connects students with admissions tutors who got into Princeton, Cornell, Oxford, and more.",
              email: "admin@unisphere.my",
              sameAs: [
                "https://www.instagram.com/unisphere.my/",
              ],
            }),
          }}
        />
        {/* JSON-LD WebSite schema enables Google's sitelinks search box. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Unisphere",
              url: "https://unisphere.my",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://unisphere.my/tutors?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
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