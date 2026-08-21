import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mlc-ai/web-llm"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value:
              "display-capture=(self), microphone=(self), camera=(), geolocation=()",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
