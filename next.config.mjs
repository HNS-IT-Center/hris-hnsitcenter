/**
 * Never let webpack assign module id 0.
 *
 * Next's flight-manifest-plugin registers concatenated client modules with
 * `if (concatenatedModId) recordModule(...)`, so a client component whose
 * concatenated module gets id 0 is left out of the React Client Manifest and
 * its page crashes in production ("Could not find the module ... in the React
 * Client Manifest"). This hit /hrd/dashboard (HrdDashboard).
 */
class AvoidModuleIdZeroPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('AvoidModuleIdZeroPlugin', (compilation) => {
      compilation.hooks.afterOptimizeModuleIds.tap('AvoidModuleIdZeroPlugin', (modules) => {
        const { chunkGraph } = compilation
        const zeroIdModules = []
        let maxId = 0
        for (const mod of modules) {
          const id = chunkGraph.getModuleId(mod)
          if (id === 0) zeroIdModules.push(mod)
          else if (typeof id === 'number' && id > maxId) maxId = id
        }
        for (const mod of zeroIdModules) chunkGraph.setModuleId(mod, ++maxId)
      })
    })
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config) {
    config.plugins.push(new AvoidModuleIdZeroPlugin())
    return config
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
