/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  images: {
    remotePatterns: [
      // Patreon domains
      {
        protocol: 'https',
        hostname: '**.patreonusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'c10.patreonusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.patreon.com',
        pathname: '/**',
      },
      // Your specific R2 bucket
      {
        protocol: 'https',
        hostname: 'pub-e6837020c2914a68818d29940768ace8.r2.dev',
        pathname: '/**',
      },
      // Any R2 dev subdomain
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        pathname: '/**',
      },
      // R2 storage domains (for internal/private access)
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
        pathname: '/**',
      },
      // Localhost for development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://*.r2.dev",
              "font-src 'self' data:",
              "connect-src 'self' https://wcjxfuqpvsrssqooauvd.supabase.co wss://wcjxfuqpvsrssqooauvd.supabase.co https://*.r2.cloudflarestorage.com https://*.r2.dev",
              "media-src 'self' https://*.r2.cloudflarestorage.com https://*.r2.dev",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; ')
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
        ],
      },
    ]
  },
  
  // Merged experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // For large image uploads
    },
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // External packages that shouldn't be bundled
  serverComponentsExternalPackages: ['@napi-rs/canvas', 'sharp'],
  
  // Webpack configuration to handle native modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle these on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    
    // Mark canvas as external on the server
    if (isServer) {
      config.externals = [...(config.externals || []), '@napi-rs/canvas']
    }
    
    return config
  },
}

export default nextConfig