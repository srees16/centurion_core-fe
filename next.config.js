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
  async redirects() {
    // The Trade Monitor page was renamed Trade Center (8 Oct 2026): old links and bookmarks,
    // ?tab= and ?book= included, land on the new page
    // Portfolio, Compounder, Harvest and R22 Infusion ran the legacy Yahoo-based backtest (survivorship-biased,
    // not the deployed engine) and Harvest's "Infuse" button did nothing: retired 9 Nov 2026 (tracker UI4).
    // Temporary redirects, so the pages (kept in the repo) can return if J4 earns a planner page.
    const retired = ["portfolio", "compounder", "harvest", "r22-infusion"].map((p) => ({
      source: `/ind-stocks/${p}`, destination: "/ind-stocks", permanent: false,
    }));
    // The five book labs (Financial ML, Test & Tune, Aronson, Ehlers, Vince) were removed 9 Nov 2026 (tracker UI5):
    // old bookmarks land on the home page
    const labs = ["financial-ml", "test-tune", "aronson-lab", "ehlers-lab", "vince-lab"].map((p) => ({
      source: `/${p}/:path*`, destination: "/", permanent: false,
    }));
    return [{ source: "/ind-stocks/trade-monitor", destination: "/ind-stocks/trade-center", permanent: true }, ...retired, ...labs];
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
