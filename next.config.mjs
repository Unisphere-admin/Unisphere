/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizeCss: true,
  }
}

export default nextConfig 