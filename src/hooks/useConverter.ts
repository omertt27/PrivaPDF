"use client";
// useConverter.ts — orchestrates the full PDF → DOCX pipeline

import { useState, useCallback } from "react";
import { parsePDF, type ParsedPage } from "@/lib/pdf-parser";
import { buildDocx, parseTextBlocks, type ProcessedPage, type TextBlock } from "@/lib/docx-builder";
import { consumeConversion, isProUser, getRemainingConversions } from "@/lib/usage-gate";
import { useConverterWorker } from "./useConverterWorker";

export type ConversionStatus =
  | "idle"
  | "parsing"
  | "analyzing"
  | "building"
  | "done"
  | "error"
  | "limit_reached";

export interface ConversionProgress {
  percent: number;
  stage: string;
}

export interface UseConverterReturn {
  status: ConversionStatus;
  progress: ConversionProgress;
  error: string | null;
  remainingConversions: number;
  isPro: boolean;
  workerReady: boolean;
  workerLoading: boolean;
  workerProgress: { stage: string; percent: number };
  gpuDevice: string;
  memoryWarning: boolean;
  loadAIModels: () => void;
  convertFile: (file: File) => Promise<void>;
  reset: () => void;
}

export function useConverter(): UseConverterReturn {
  const [status, setStatus] = useState<ConversionStatus>("idle");
  const [progress, setProgress] = useState<ConversionProgress>({ percent: 0, stage: "" });
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(getRemainingConversions);

  const {
    status: workerStatus,
    loadProgress: workerProgress,
    modelsReady,
    gpuDevice,
    memoryWarning,
    loadModels,
    runOCR,
    runLayout,
  } = useConverterWorker();

  const setP = (percent: number, stage: string) => setProgress({ percent, stage });

  const convertFile = useCallback(async (file: File) => {
    const pro = isProUser();

    if (!pro) {
      const ok = consumeConversion();
      if (!ok) {
        setStatus("limit_reached");
        return;
      }
      setRemaining(getRemainingConversions());
    }

    setStatus("parsing");
    setError(null);
    setP(0, "Loading PDF...");

    try {
      // ── Step 1: Parse PDF ─────────────────────────────────────
      const parsed = await parsePDF(file, (pct, stage) => {
        setP(Math.round(pct * 0.4), stage); // 0–40%
      });

      setP(40, "Determining processing path...");

      const processedPages: ProcessedPage[] = [];

      // ── Step 2: Process each page ─────────────────────────────
      setStatus("analyzing");

      for (let i = 0; i < parsed.pages.length; i++) {
        const page: ParsedPage = parsed.pages[i];
        const pageProgress = 40 + Math.round((i / parsed.pages.length) * 40); // 40–80%
        let blocks: TextBlock[] = [];

        if (page.hasText) {
          // Fast path — text PDF, no AI needed
          setP(pageProgress, `Processing page ${i + 1} of ${parsed.totalPages} (text mode)...`);
          blocks = parseTextBlocks(page.text);
        } else if (modelsReady) {
          // AI path — scanned/image PDF
          setP(pageProgress, `OCR scanning page ${i + 1} of ${parsed.totalPages}...`);
          try {
            const [ocrText, layout] = await Promise.all([
              runOCR(page.imageData, page.pageNum),
              runLayout(page.imageData, page.pageNum),
            ]);

            // Merge layout structure with OCR text
            if (layout?.blocks && Array.isArray(layout.blocks)) {
              blocks = layout.blocks as TextBlock[];
            } else if (ocrText) {
              blocks = parseTextBlocks(ocrText);
            }
          } catch (aiErr) {
            // Fallback: use whatever text we have
            console.warn("AI processing failed for page", i + 1, aiErr);
            blocks = page.text ? parseTextBlocks(page.text) : [{ type: "paragraph", text: "[Page could not be processed]" }];
          }
        } else {
          // No AI loaded + no text = can't process
          blocks = [{ type: "paragraph", text: page.text || "[Scanned page — enable AI OCR for full text extraction]" }];
        }

        processedPages.push({ pageNum: page.pageNum, blocks });
      }

      // ── Step 3: Build DOCX ────────────────────────────────────
      setStatus("building");
      setP(82, "Building Word document...");

      const baseName = file.name.replace(/\.pdf$/i, "");
      await buildDocx(processedPages, baseName);

      setP(100, "Done!");
      setStatus("done");

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("error");
    }
  }, [modelsReady, runOCR, runLayout]);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress({ percent: 0, stage: "" });
    setError(null);
    setRemaining(getRemainingConversions());
  }, []);

  return {
    status,
    progress,
    error,
    remainingConversions: remaining,
    isPro: isProUser(),
    workerReady: modelsReady,
    workerLoading: workerStatus === "loading_models",
    workerProgress,
    gpuDevice,
    memoryWarning,
    loadAIModels: loadModels,
    convertFile,
    reset,
  };
}
