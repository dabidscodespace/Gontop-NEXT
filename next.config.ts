import type { NextConfig } from "next";

// Arena's live preview is an HTTPS reverse proxy on an e2b.app subdomain.
// ARENA_PREVIEW also permits running the review build with `next start`, which
// avoids development HMR/cache races inside the embedded preview.
const previewOrigins =
  process.env.NODE_ENV === "development" || process.env.ARENA_PREVIEW === "1"
    ? ["**.e2b.app"]
    : [];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: previewOrigins,
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
      allowedOrigins: previewOrigins,
    },
  },
};

export default nextConfig;
