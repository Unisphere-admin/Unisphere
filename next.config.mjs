/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Add any image domains you need
  },
  experimental: {
    optimizeCss: true,
    turbo: {
      rules: {
        // Force Turborepack to consider CSS modules in its graph
        '**/*.module.css': {
          type: 'style',
        },
        '**/*.css': {
          type: 'style',
        }
      }
    }
  },
}

export default nextConfig 