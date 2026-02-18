import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["localhost"],
  },
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
