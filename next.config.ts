import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone for production (Railway) — our server.ts wraps the standalone handler
  output: "standalone",
  // Strict: do NOT ship type errors to production
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
};

export default nextConfig;
