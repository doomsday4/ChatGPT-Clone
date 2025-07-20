import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ignoring lint warnings during build process, only for vercel production
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
