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
  // Tailwind CSS v4 + Turbopack: stub out Node built-ins that pako/jszip reference
  turbopack: {
    resolveAlias: {
      "./lib/zlib/constants": "./src/lib/empty-stub.js",
      "./zlib/constants":     "./src/lib/empty-stub.js",
      "./zlib/deflate":       "./src/lib/empty-stub.js",
      "./zlib/gzheader":      "./src/lib/empty-stub.js",
      "./zlib/inflate":       "./src/lib/empty-stub.js",
      "./zlib/zstream":       "./src/lib/empty-stub.js",
    },
  },
};

export default nextConfig;
