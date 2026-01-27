import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/docs",
        destination: "https://polypulsebets.mintlify.dev/docs",
      },
      {
        source: "/docs/:match*",
        destination: "https://polypulsebets.mintlify.dev/docs/:match*",
      },
    ];
  },
};

export default nextConfig;