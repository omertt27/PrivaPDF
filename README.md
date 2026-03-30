# PrivaPDF

> **PDF converter that never sees your files.** All processing happens locally in the browser using WebGPU, WASM, and on-device AI — zero uploads, zero servers, zero data exposure.

---

## ⚠️ Contributions & Pull Requests

**This repository does not accept pull requests or external contributions.**

This is a private, solo-founder project. All code is proprietary. Please do not open PRs, forks intended for merging, or feature requests via issues. Any pull requests opened will be closed without review.

If you have found a security vulnerability, contact privately via email instead of opening a public issue.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| PDF Parsing | PDF.js |
| AI Runtime | Transformers.js v3 |
| GPU Acceleration | WebGPU → WASM fallback |
| OCR Model | Docling / IBM Granite 258M (q4) |
| Layout Model | SmolVLM-256M (q4) |
| Output Generation | docx-js |
| Model Caching | IndexedDB (browser-native) |
| Hosting | Vercel |

---

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Text PDFs** — PDF.js extracts embedded text directly. Converts in ~2 seconds. No AI, no download.
2. **Scanned PDFs** — SmolVLM analyzes layout, Docling/Granite runs OCR. All on-device via WebGPU or WASM fallback.
3. **Output** — `docx-js` builds the `.docx` file entirely in the browser and triggers a local download.

## Security Headers

The app requires these headers on every response to enable `SharedArrayBuffer` for multi-threaded AI inference:

\`\`\`
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
\`\`\`

These are set in both `next.config.ts` (local dev) and `vercel.json` (production).

---

© 2026 PrivaPDF. All rights reserved.
