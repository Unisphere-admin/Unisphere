/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint runs in CI; skip it during Vercel production builds to avoid
    // devDependency availability issues.
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: {
    domains: [
      'wtsekxjhqvwnpexnszwl.supabase.co',
      'wtsekxjhqvwnpexnszwl.supabase.in',
      'placeholder.svg',
      'localhost'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wtsekxjhqvwnpexnszwl.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizeCss: true,
    // Tree-shake barrel imports more aggressively. These packages export
    // hundreds of symbols from their index; without this, importing a single
    // icon or component can pull in the whole module.
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-slider",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "date-fns",
      "recharts",
      "embla-carousel-react",
      "cmdk",
      "vaul",
      "react-hook-form",
      "react-day-picker",
    ],
  },
  // Force polling-based file watching in dev. Default fsevents/inotify do
  // not fire reliably when source files live on a mounted/virtual filesystem
  // (e.g. Cowork mount, Docker bind mounts, network shares). Polling trades
  // a small amount of CPU for guaranteed change detection -- every edit is
  // picked up within 1 second and HMR just works.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules|\.next/,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
}

export default nextConfig 