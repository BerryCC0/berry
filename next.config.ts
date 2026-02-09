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

    // Ignore optional Solana dependencies from @coinbase/cdp-sdk
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@solana/kit": false,
    };

    return config;
  },
};

export default nextConfig;
