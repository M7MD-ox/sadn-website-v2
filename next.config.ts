import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  /* Round 25: dashboard uploads now land in Supabase Storage (owner's
     project) — the returned absolute URLs flow into <Image> via product
     rows, so the host must be whitelisted here. */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "eoapvvgssnzgrkwrlzri.supabase.co" },
    ],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        // Round 19 hardening — owner-uploaded images (SVG review
        // screenshots included) are static files under /uploads. The CSP
        // sandbox strips any script execution if one is ever opened
        // DIRECTLY in a tab; <img> embedding (the only in-app use) is
        // unaffected.
        source: "/uploads/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; style-src 'unsafe-inline'; sandbox",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
