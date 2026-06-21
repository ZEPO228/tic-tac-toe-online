import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone for production (Railway) — our server.ts wraps the standalone handler
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
