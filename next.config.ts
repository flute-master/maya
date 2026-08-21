import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mlc-ai/web-llm"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  webpack: (config) => {
    if (config.output) {
      config.output.filename = "static/chunks/[contenthash].js"
      config.output.chunkFilename = "static/chunks/[contenthash].js"
    }
    return config
  },
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
