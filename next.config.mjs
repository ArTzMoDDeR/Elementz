/** @type {import('next').NextConfig} */

// Shared security headers (no X-Frame-Options — set per route below)
const securityHeadersBase = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
]

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // applixir-player.html: allow embedding in same-origin iframe
        source: '/applixir-player.html',
        headers: [
          ...securityHeadersBase,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // All other app routes and pages: deny framing
        source: '/:path((?!applixir-player.html).*)',
        headers: [
          ...securityHeadersBase,
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp'],
    minimumCacheTTL: 2592000, // 30 days
  },
}

export default nextConfig
