/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer info sent with requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Force HTTPS for 1 year (only applies on HTTPS deployments)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Restrict browser features
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Basic XSS protection for older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
]

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ti4nky9qvahlfdrj.public.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp'],
    minimumCacheTTL: 2592000, // 30 days
  },
}

export default nextConfig
