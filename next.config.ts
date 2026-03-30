import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for SharedArrayBuffer (WebGPU/WASM multi-threading)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
  // Silence the "webpack config but no turbopack config" error in Next.js 16
  turbopack: {},
};

export default nextConfig;
