import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };
      config.module.rules.push({
        test: /\.wasm$/,
        type: "asset/resource",
      });
    }

    return config;
  },
};

export default nextConfig;
