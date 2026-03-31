import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for SharedArrayBuffer (WebGPU/WASM multi-threading)
  // credentialless: allows cross-origin resources (HuggingFace models, etc.)
  //   while still enabling SharedArrayBuffer — better than require-corp which
  //   breaks CDN-hosted assets that lack CORP headers.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
  // Silence the "webpack config but no turbopack config" error in Next.js 16
  turbopack: {},
};

export default nextConfig;
