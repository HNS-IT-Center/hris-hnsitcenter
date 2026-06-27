/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      // Cloudflare R2 — replace with your actual R2 public domain
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      // Custom domain for R2 (e.g., assets.hnsitcenter.id)
      {
        protocol: 'https',
        hostname: 'assets.hnsitcenter.id',
      },
    ],
  },
  async headers() {
    return [
      // Service Worker must not be cached
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      // PWA Manifest
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ]
  },
}

export default nextConfig
