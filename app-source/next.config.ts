import type { NextConfig } from 'next';

/**
 * Security headers applied to every response.
 *
 * The CSP intentionally allows 'unsafe-inline' for styles only: Next injects
 * critical CSS inline and GSAP writes inline transforms. Scripts are nonce-free
 * but restricted to same-origin plus the strict-dynamic-free 'unsafe-inline'
 * that Next's bootstrap requires in production builds.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  "connect-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // better-sqlite3 and sharp are native; keep them out of the bundler.
  serverExternalPackages: ['better-sqlite3', 'sharp'],

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [480, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [80, 160, 240, 320],
  },

  experimental: {
    // Uploads are streamed to disk; keep the action body limit modest.
    serverActions: { bodySizeLimit: '2mb' },
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // Content-hashed derivatives are immutable.
        source: '/media/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Never let the admin surface be cached or indexed.
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
