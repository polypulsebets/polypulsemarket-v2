import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/docs",
        destination: "https://[subdomain].mintlify.dev/docs",
      },
      {
        source: "/docs/:match*",
        destination: "https://[subdomain].mintlify.dev/docs/:match*",
      },
    ];
  },
};

export default nextConfig;