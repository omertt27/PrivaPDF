"use client";
// useConverter.ts — orchestrates the full PDF → output pipeline
// Supports: DOCX, XLSX, TXT output formats
// Supports: page range selection, batch conversion (Pro)

import { useState, useCallback } from "react";
import { parsePDF, type ParsedPage } from "@/lib/pdf-parser";
import { buildDocx, parseTextBlocks, type ProcessedPage, type TextBlock } from "@/lib/docx-builder";
import { buildXlsx } from "@/lib/xlsx-builder";
import { buildTxt } from "@/lib/txt-builder";
import { buildPptx } from "@/lib/pptx-builder";
import { consumeConversion, isProUser, getPlan, getRemainingConversions, hasFeature, PLAN_META, type PlanTier } from "@/lib/usage-gate";
import { useConverterWorker } from "./useConverterWorker";

export type OutputFormat = "docx" | "xlsx" | "txt" | "pptx";

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

// A single file job in the batch queue
export interface BatchJob {
  id: string;
  file: File;
  status: "queued" | "converting" | "done" | "error";
  error?: string;
  fileName?: string;
}

export interface UseConverterReturn {
  status: ConversionStatus;
  progress: ConversionProgress;
  error: string | null;
  remainingConversions: number;
  isPro: boolean;
  plan: PlanTier;
  planMeta: { label: string; color: string; badge: string };
  canUseOCR: boolean;
  canUseBatch: boolean;
  canUseXlsx: boolean;
  canUsePptx: boolean;
  canUsePageRange: boolean;
  workerReady: boolean;
  workerLoading: boolean;
  workerProgress: { stage: string; percent: number };
  gpuDevice: string;
  memoryWarning: boolean;
  outputFormat: OutputFormat;
  pageRange: { from: number; to: number } | null;
  totalPages: number;
  batchJobs: BatchJob[];
  setOutputFormat: (f: OutputFormat) => void;
  setPageRange: (r: { from: number; to: number } | null) => void;
  loadAIModels: () => void;
  convertFile: (file: File) => Promise<void>;
  addBatchFiles: (files: File[]) => void;
  removeBatchJob: (id: string) => void;
  runBatch: () => Promise<void>;
  reset: () => void;
}

// ─── Shared page processing logic ─────────────────────────────────────────────
async function processPages(
  parsed: { pages: ParsedPage[]; totalPages: number; isTextBased: boolean; fileName: string },
  pageRange: { from: number; to: number } | null,
  modelsReady: boolean,
  runOCR: (img: string, n: number) => Promise<string>,
  runLayout: (img: string, n: number) => Promise<Record<string, unknown>>,
  onProgress: (pct: number, stage: string) => void
): Promise<ProcessedPage[]> {
  const pages = parsed.pages.filter((p) => {
    if (!pageRange) return true;
    return p.pageNum >= pageRange.from && p.pageNum <= pageRange.to;
  });

  const processedPages: ProcessedPage[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page: ParsedPage = pages[i];
    const pageProgress = 40 + Math.round((i / pages.length) * 40); // 40–80%
    let blocks: TextBlock[] = [];

    if (page.hasText) {
      onProgress(pageProgress, `Processing page ${i + 1} of ${pages.length} (text mode)...`);
      blocks = parseTextBlocks(page.text);
    } else if (modelsReady) {
      onProgress(pageProgress, `OCR scanning page ${i + 1} of ${pages.length}...`);
      try {
        const [ocrText, layout] = await Promise.all([
          runOCR(page.imageData, page.pageNum),
          runLayout(page.imageData, page.pageNum),
        ]);
        if (layout?.blocks && Array.isArray(layout.blocks)) {
          blocks = layout.blocks as TextBlock[];
        } else if (ocrText) {
          blocks = parseTextBlocks(ocrText);
        }
      } catch (aiErr) {
        console.warn("AI processing failed for page", page.pageNum, aiErr);
        blocks = page.text
          ? parseTextBlocks(page.text)
          : [{ type: "paragraph", text: "[Page could not be processed]" }];
      }
    } else {
      blocks = [
        {
          type: "paragraph",
          text: page.text || "[Scanned page — enable AI OCR for full text extraction]",
        },
      ];
    }

    processedPages.push({ pageNum: page.pageNum, blocks });
  }

  return processedPages;
}

async function dispatchBuild(
  format: OutputFormat,
  pages: ProcessedPage[],
  baseName: string
): Promise<void> {
  switch (format) {
    case "docx":
      await buildDocx(pages, baseName);
      break;
    case "xlsx":
      await buildXlsx(pages, baseName);
      break;
    case "txt":
      buildTxt(pages, baseName);
      break;
    case "pptx":
      await buildPptx(pages, baseName);
      break;
  }
}

export function useConverter(): UseConverterReturn {
  const [status, setStatus] = useState<ConversionStatus>("idle");
  const [progress, setProgress] = useState<ConversionProgress>({ percent: 0, stage: "" });
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(getRemainingConversions);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("docx");
  const [pageRange, setPageRange] = useState<{ from: number; to: number } | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);

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

  const setP = (percent: number, stage: string) =>
    setProgress({ percent, stage });

  const convertFile = useCallback(
    async (file: File) => {
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
        // ── Step 1: Parse PDF ──────────────────────────────────────
        const parsed = await parsePDF(file, (pct, stage) => {
          setP(Math.round(pct * 0.4), stage); // 0–40%
        });

        setTotalPages(parsed.totalPages);
        setP(40, "Determining processing path...");

        // ── Step 2: Process pages ──────────────────────────────────
        setStatus("analyzing");

        const processedPages = await processPages(
          parsed,
          pageRange,
          modelsReady,
          runOCR,
          runLayout,
          setP
        );

        // ── Step 3: Build output file ──────────────────────────────
        setStatus("building");
        const FORMAT_LABELS: Record<OutputFormat, string> = { docx: "Word", xlsx: "Excel", pptx: "PowerPoint", txt: "Text" };
        setP(82, `Building ${FORMAT_LABELS[outputFormat]} document...`);

        const baseName = file.name.replace(/\.pdf$/i, "");
        await dispatchBuild(outputFormat, processedPages, baseName);

        setP(100, "Done!");
        setStatus("done");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus("error");
      }
    },
    [modelsReady, runOCR, runLayout, outputFormat, pageRange]
  );

  // ── Batch API ──────────────────────────────────────────────────────────────
  const addBatchFiles = useCallback((files: File[]) => {
    const newJobs: BatchJob[] = files
      .filter((f) => f.type === "application/pdf")
      .map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        status: "queued" as const,
      }));
    setBatchJobs((prev) => [...prev, ...newJobs]);
  }, []);

  const removeBatchJob = useCallback((id: string) => {
    setBatchJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const runBatch = useCallback(async () => {
    const pro = isProUser();
    if (!pro) {
      setStatus("limit_reached");
      return;
    }

    const pending = batchJobs.filter((j) => j.status === "queued");
    if (pending.length === 0) return;

    setStatus("analyzing");

    for (const job of pending) {
      setBatchJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "converting" as const } : j))
      );

      try {
        setP(0, `Converting ${job.file.name}...`);
        const parsed = await parsePDF(job.file, (pct, stage) => {
          setP(Math.round(pct * 0.4), `${job.file.name}: ${stage}`);
        });

        const processedPages = await processPages(
          parsed,
          null,
          modelsReady,
          runOCR,
          runLayout,
          (pct, stage) => setP(pct, `${job.file.name}: ${stage}`)
        );

        const baseName = job.file.name.replace(/\.pdf$/i, "");
        await dispatchBuild(outputFormat, processedPages, baseName);

        setBatchJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? { ...j, status: "done" as const, fileName: `${baseName}.${outputFormat}` }
              : j
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setBatchJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: "error" as const, error: msg } : j
          )
        );
      }
    }

    setStatus("done");
    setP(100, "Batch complete!");
  }, [batchJobs, modelsReady, runOCR, runLayout, outputFormat]);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress({ percent: 0, stage: "" });
    setError(null);
    setRemaining(getRemainingConversions());
    setTotalPages(0);
    setPageRange(null);
    setBatchJobs([]);
  }, []);

  return {
    status,
    progress,
    error,
    remainingConversions: remaining,
    isPro: isProUser(),
    plan: getPlan(),
    planMeta: PLAN_META[getPlan()],
    canUseOCR: hasFeature("ocr"),
    canUseBatch: hasFeature("batch"),
    canUseXlsx: hasFeature("xlsx"),
    canUsePptx: hasFeature("pptx"),
    canUsePageRange: hasFeature("unlimited"),
    workerReady: modelsReady,
    workerLoading: workerStatus === "loading_models",
    workerProgress,
    gpuDevice,
    memoryWarning,
    outputFormat,
    pageRange,
    totalPages,
    batchJobs,
    setOutputFormat,
    setPageRange,
    loadAIModels: loadModels,
    convertFile,
    addBatchFiles,
    removeBatchJob,
    runBatch,
    reset,
  };
}
