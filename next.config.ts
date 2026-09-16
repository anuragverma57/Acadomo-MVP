import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Seed data uses Unsplash URLs. next/image refuses remote hosts that are
    // not explicitly allowlisted, so images would 400 without this.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
