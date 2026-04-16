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