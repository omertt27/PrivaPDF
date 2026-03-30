/* eslint-disable @typescript-eslint/no-explicit-any */
// converter.worker.ts — runs entirely off the main thread
// All AI inference happens here so the UI never freezes

import { pipeline, env } from "@huggingface/transformers";

// Force local-only processing — no API calls ever
env.allowRemoteModels = true; // must be true to fetch from HuggingFace CDN on first load
env.useBrowserCache = true; // IndexedDB caching — second load is instant

let vlmPipeline: any = null;
let ocrPipeline: any = null;
let modelsLoaded = false;

// ─── Memory Monitor ────────────────────────────────────────────────────────────
function getMemoryUsage(): number {
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const mem = (performance as any).memory;
    return mem.usedJSHeapSize / mem.jsHeapSizeLimit;
  }
  return 0; // can't detect — assume OK
}

function checkMemory(): boolean {
  const usage = getMemoryUsage();
  if (usage > 0.8) {
    self.postMessage({ type: "MEMORY_WARNING", payload: { usage: Math.round(usage * 100) } });
    return false;
  }
  return true;
}

// ─── Model Loading ─────────────────────────────────────────────────────────────
async function loadModels() {
  const device = typeof navigator !== "undefined" && (navigator as any).gpu
    ? "webgpu"
    : "wasm";

  self.postMessage({ type: "LOAD_STATUS", payload: { stage: "Detecting GPU...", percent: 5 } });

  try {
    // SmolVLM — layout analysis (256M, ~300MB q4)
    self.postMessage({ type: "LOAD_STATUS", payload: { stage: "Loading layout model (256MB)...", percent: 10 } });
    vlmPipeline = await pipeline(
      "image-to-text" as any,
      "HuggingFaceTB/SmolVLM-256M-Instruct",
      {
        device,
        dtype: "q4",
        progress_callback: (p: any) => {
          if (p.status === "progress") {
            const pct = 10 + Math.round((p.progress || 0) * 0.4);
            self.postMessage({ type: "LOAD_STATUS", payload: { stage: `Loading layout model... ${Math.round(p.progress || 0)}%`, percent: pct } });
          }
        },
      }
    );

    self.postMessage({ type: "LOAD_STATUS", payload: { stage: "Loading OCR engine (258MB)...", percent: 55 } });

    // Docling Granite — OCR (258M, ~500MB q4)
    ocrPipeline = await pipeline(
      "document-question-answering",
      "ds4sd/docling-models",
      {
        device,
        dtype: "q4",
        progress_callback: (p: any) => {
          if (p.status === "progress") {
            const pct = 55 + Math.round((p.progress || 0) * 0.35);
            self.postMessage({ type: "LOAD_STATUS", payload: { stage: `Loading OCR engine... ${Math.round(p.progress || 0)}%`, percent: pct } });
          }
        },
      }
    );

    self.postMessage({ type: "LOAD_STATUS", payload: { stage: "Warming up GPU...", percent: 95 } });
    modelsLoaded = true;
    self.postMessage({ type: "MODELS_READY", payload: { device } });
  } catch (err) {
    self.postMessage({ type: "LOAD_ERROR", payload: String(err) });
  }
}

// ─── OCR Processing ────────────────────────────────────────────────────────────
async function runOCR(imageData: string, pageNum: number) {
  if (!ocrPipeline) throw new Error("OCR pipeline not loaded");
  if (!checkMemory()) throw new Error("Low memory — please close other tabs and retry");

  const result = await ocrPipeline(imageData, { question: "What is the full text content of this document page?" });
  return result?.[0]?.answer || "";
}

// ─── Layout Analysis ───────────────────────────────────────────────────────────
async function runLayoutAnalysis(imageData: string) {
  if (!vlmPipeline) throw new Error("VLM pipeline not loaded");
  if (!checkMemory()) throw new Error("Low memory — please close other tabs and retry");

  const result = await vlmPipeline([
    {
      role: "user",
      content: [
        { type: "image", url: imageData },
        {
          type: "text",
          text: `Analyze this document page and return ONLY valid JSON with this exact structure:
{
  "has_tables": boolean,
  "has_headers": boolean,
  "is_multi_column": boolean,
  "blocks": [
    { "type": "heading|paragraph|table|list", "text": "...", "level": 1 }
  ]
}
Return only the JSON object, no other text.`,
        },
      ],
    },
  ]);

  try {
    const raw = result?.[0]?.generated_text || result?.generated_text || "{}";
    // Extract JSON from potential surrounding text
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { has_tables: false, has_headers: false, is_multi_column: false, blocks: [] };
  } catch {
    return { has_tables: false, has_headers: false, is_multi_column: false, blocks: [] };
  }
}

// ─── Message Handler ───────────────────────────────────────────────────────────
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case "LOAD_MODELS":
      await loadModels();
      break;

    case "RUN_OCR": {
      try {
        const text = await runOCR(payload.imageData, payload.pageNum);
        self.postMessage({ type: "OCR_DONE", payload: { text, pageNum: payload.pageNum } });
      } catch (err) {
        self.postMessage({ type: "ERROR", payload: String(err) });
      }
      break;
    }

    case "RUN_LAYOUT": {
      try {
        const layout = await runLayoutAnalysis(payload.imageData);
        self.postMessage({ type: "LAYOUT_DONE", payload: { layout, pageNum: payload.pageNum } });
      } catch (err) {
        self.postMessage({ type: "ERROR", payload: String(err) });
      }
      break;
    }

    case "CHECK_STATUS":
      self.postMessage({ type: "STATUS", payload: { modelsLoaded } });
      break;

    case "DISPOSE":
      if (vlmPipeline) await vlmPipeline.dispose?.();
      if (ocrPipeline) await ocrPipeline.dispose?.();
      vlmPipeline = null;
      ocrPipeline = null;
      modelsLoaded = false;
      self.postMessage({ type: "DISPOSED" });
      break;
  }
};
