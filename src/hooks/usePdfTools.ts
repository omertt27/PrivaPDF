"use client";
// usePdfTools.ts — state machine for PDF Merge / Split / Compress / Unlock

import { useState, useCallback } from "react";
import { mergePDFs, splitPDF, compressPDF, unlockPDF } from "@/lib/pdf-tools";

export type ToolMode = "merge" | "split" | "compress" | "unlock";
export type ToolStatus = "idle" | "processing" | "done" | "error";

export interface UsePdfToolsReturn {
  status: ToolStatus;
  progress: { percent: number; stage: string };
  error: string | null;
  // Merge
  mergeFiles: File[];
  addMergeFiles: (files: File[]) => void;
  removeMergeFile: (idx: number) => void;
  reorderMergeFiles: (from: number, to: number) => void;
  runMerge: (outputName?: string) => Promise<void>;
  // Split
  splitFile: File | null;
  setSplitFile: (f: File | null) => void;
  splitTotalPages: number;
  splitPageList: string; // comma/range string e.g. "1,3,5-8"
  setSplitPageList: (s: string) => void;
  runSplit: () => Promise<void>;
  // Compress
  compressFile: File | null;
  setCompressFile: (f: File | null) => void;
  compressQuality: number;
  setCompressQuality: (q: number) => void;
  runCompress: () => Promise<void>;
  // Unlock
  unlockFile: File | null;
  setUnlockFile: (f: File | null) => void;
  unlockPassword: string;
  setUnlockPassword: (p: string) => void;
  runUnlock: () => Promise<void>;
  // General
  reset: () => void;
}

/** Parse a page-list string like "1,3,5-8,10" → [1,3,5,6,7,8,10] */
export function parsePageList(s: string, maxPage: number): number[] {
  const pages = new Set<number>();
  for (const part of s.split(",")) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const from = parseInt(rangeMatch[1], 10);
      const to = parseInt(rangeMatch[2], 10);
      for (let p = from; p <= to && p <= maxPage; p++) pages.add(p);
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n) && n >= 1 && n <= maxPage) pages.add(n);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export function usePdfTools(): UsePdfToolsReturn {
  const [status, setStatus] = useState<ToolStatus>("idle");
  const [progress, setProgress] = useState({ percent: 0, stage: "" });
  const [error, setError] = useState<string | null>(null);

  // Merge state
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);

  // Split state
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitTotalPages, setSplitTotalPages] = useState(0);
  const [splitPageList, setSplitPageList] = useState("all");

  // Compress state
  const [compressFile, setCompressFile] = useState<File | null>(null);
  const [compressQuality, setCompressQuality] = useState(0.65);

  // Unlock state
  const [unlockFile, setUnlockFile] = useState<File | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");

  const setP = (percent: number, stage: string) => setProgress({ percent, stage });

  // ── Merge ────────────────────────────────────────────────────────────────
  const addMergeFiles = useCallback((files: File[]) => {
    setMergeFiles((prev) => [...prev, ...files.filter((f) => f.type === "application/pdf")]);
  }, []);

  const removeMergeFile = useCallback((idx: number) => {
    setMergeFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const reorderMergeFiles = useCallback((from: number, to: number) => {
    setMergeFiles((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }, []);

  const runMerge = useCallback(async (outputName = "merged") => {
    if (mergeFiles.length < 2) {
      setError("Add at least 2 PDF files to merge.");
      return;
    }
    setStatus("processing");
    setError(null);
    try {
      await mergePDFs(mergeFiles, outputName, setP);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [mergeFiles]);

  // ── Split ────────────────────────────────────────────────────────────────
  const handleSetSplitFile = useCallback(async (f: File | null) => {
    setSplitFile(f);
    setSplitTotalPages(0);
    if (!f) return;
    try {
      const { default: pdfjsLib } = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      setSplitTotalPages(pdf.numPages);
      setSplitPageList(`1-${pdf.numPages}`);
    } catch {
      setSplitTotalPages(0);
    }
  }, []);

  const runSplit = useCallback(async () => {
    if (!splitFile) { setError("No PDF selected."); return; }
    setStatus("processing");
    setError(null);
    try {
      const pages = splitPageList.trim().toLowerCase() === "all"
        ? "all"
        : parsePageList(splitPageList, splitTotalPages);
      await splitPDF(splitFile, pages, setP);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [splitFile, splitPageList, splitTotalPages]);

  // ── Compress ─────────────────────────────────────────────────────────────
  const runCompress = useCallback(async () => {
    if (!compressFile) { setError("No PDF selected."); return; }
    setStatus("processing");
    setError(null);
    try {
      await compressPDF(compressFile, { quality: compressQuality }, setP);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [compressFile, compressQuality]);

  // ── Unlock ───────────────────────────────────────────────────────────────
  const runUnlock = useCallback(async () => {
    if (!unlockFile) { setError("No PDF selected."); return; }
    if (!unlockPassword.trim()) { setError("Please enter the PDF password."); return; }
    setStatus("processing");
    setError(null);
    try {
      await unlockPDF(unlockFile, unlockPassword, setP);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [unlockFile, unlockPassword]);

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStatus("idle");
    setProgress({ percent: 0, stage: "" });
    setError(null);
  }, []);

  return {
    status, progress, error,
    mergeFiles, addMergeFiles, removeMergeFile, reorderMergeFiles, runMerge,
    splitFile, setSplitFile: handleSetSplitFile, splitTotalPages, splitPageList, setSplitPageList, runSplit,
    compressFile, setCompressFile, compressQuality, setCompressQuality, runCompress,
    unlockFile, setUnlockFile, unlockPassword, setUnlockPassword, runUnlock,
    reset,
  };
}
