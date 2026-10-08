/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // The app uses no next/image; turning the optimizer off removes the
  // /_next/image endpoint and the advisories fixed only in Next 15.5+.
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    // In production (Vercel), NEXT_PUBLIC_API_URL is set and the browser calls
    // the backend directly — no rewrite proxy needed. Vercel's edge proxy has
    // strict timeouts that cause ROUTER_EXTERNAL_TARGET_ERROR with slow backends.
    // The rewrite is only used for local dev (localhost:9001 fallback).
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [];
    }
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:9001/api/v1/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
