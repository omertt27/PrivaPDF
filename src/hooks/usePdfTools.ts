"use client";
// usePdfTools.ts — state machine for PDF Merge / Split / Compress / Unlock / Redact / Privilege Log

import { useState, useCallback } from "react";
import {
  mergePDFs, splitPDF, compressPDF, unlockPDF,
  redactPDF, extractPrivilegeLog, renderPDFPages,
  type RedactionRect, type RenderedPage, type PrivilegeLogEntry,
} from "@/lib/pdf-tools";
import { consumeToolUse, getRemainingToolUses, isPaidPlan, hasFeature } from "@/lib/usage-gate";

export type ToolMode = "merge" | "split" | "compress" | "unlock" | "redact" | "privilege_log";
export type ToolStatus = "idle" | "processing" | "done" | "error" | "limit_reached";

export interface UsePdfToolsReturn {
  status: ToolStatus;
  progress: { percent: number; stage: string };
  error: string | null;
  remainingToolUses: number;
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
  splitPageList: string;
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
  // Redact (Legal)
  redactFile: File | null;
  setRedactFile: (f: File | null) => void;
  redactPages: RenderedPage[];
  redactRects: RedactionRect[];
  addRedactRect: (r: RedactionRect) => void;
  removeRedactRect: (idx: number) => void;
  clearRedactRects: () => void;
  runRedact: () => Promise<void>;
  // Privilege Log (Legal)
  privLogFile: File | null;
  setPrivLogFile: (f: File | null) => void;
  privLogEntries: PrivilegeLogEntry[];
  runPrivilegeLog: () => Promise<void>;
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
  const [remainingToolUses, setRemainingToolUses] = useState(getRemainingToolUses);

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

  // Redact state
  const [redactFile, setRedactFileState] = useState<File | null>(null);
  const [redactPages, setRedactPages] = useState<RenderedPage[]>([]);
  const [redactRects, setRedactRects] = useState<RedactionRect[]>([]);

  // Privilege log state
  const [privLogFile, setPrivLogFileState] = useState<File | null>(null);
  const [privLogEntries, setPrivLogEntries] = useState<PrivilegeLogEntry[]>([]);

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
    if (!consumeToolUse()) {
      setStatus("limit_reached");
      return;
    }
    setRemainingToolUses(getRemainingToolUses());
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
    if (!consumeToolUse()) {
      setStatus("limit_reached");
      return;
    }
    setRemainingToolUses(getRemainingToolUses());
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
    if (!consumeToolUse()) {
      setStatus("limit_reached");
      return;
    }
    setRemainingToolUses(getRemainingToolUses());
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
    if (!consumeToolUse()) {
      setStatus("limit_reached");
      return;
    }
    setRemainingToolUses(getRemainingToolUses());
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

  // ── Redact ───────────────────────────────────────────────────────────────
  const setRedactFile = useCallback(async (f: File | null) => {
    setRedactFileState(f);
    setRedactPages([]);
    setRedactRects([]);
    if (!f) return;
    setStatus("processing");
    setError(null);
    try {
      const pages = await renderPDFPages(f, 1.5, setP);
      setRedactPages(pages);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, []);

  const addRedactRect = useCallback((r: RedactionRect) => {
    setRedactRects((prev) => [...prev, r]);
  }, []);

  const removeRedactRect = useCallback((idx: number) => {
    setRedactRects((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const clearRedactRects = useCallback(() => setRedactRects([]), []);

  const runRedact = useCallback(async () => {
    if (!redactFile || redactPages.length === 0) { setError("No PDF loaded."); return; }
    if (redactRects.length === 0) { setError("Mark at least one area to redact."); return; }
    if (!hasFeature("redaction")) { setStatus("limit_reached"); return; }
    setStatus("processing");
    setError(null);
    try {
      const baseName = redactFile.name.replace(/\.pdf$/i, "");
      await redactPDF(redactPages, redactRects, baseName, setP);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [redactFile, redactPages, redactRects]);

  // ── Privilege Log ────────────────────────────────────────────────────────
  const setPrivLogFile = useCallback((f: File | null) => {
    setPrivLogFileState(f);
    setPrivLogEntries([]);
  }, []);

  const runPrivilegeLog = useCallback(async () => {
    if (!privLogFile) { setError("No PDF selected."); return; }
    if (!hasFeature("privilege_log")) { setStatus("limit_reached"); return; }
    setStatus("processing");
    setError(null);
    try {
      const entries = await extractPrivilegeLog(privLogFile, setP);
      setPrivLogEntries(entries);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [privLogFile]);

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStatus("idle");
    setProgress({ percent: 0, stage: "" });
    setError(null);
    setRemainingToolUses(getRemainingToolUses());
    setRedactPages([]);
    setRedactRects([]);
    setPrivLogEntries([]);
  }, []);

  return {
    status, progress, error, remainingToolUses,
    mergeFiles, addMergeFiles, removeMergeFile, reorderMergeFiles, runMerge,
    splitFile, setSplitFile: handleSetSplitFile, splitTotalPages, splitPageList, setSplitPageList, runSplit,
    compressFile, setCompressFile, compressQuality, setCompressQuality, runCompress,
    unlockFile, setUnlockFile, unlockPassword, setUnlockPassword, runUnlock,
    redactFile, setRedactFile, redactPages, redactRects, addRedactRect, removeRedactRect, clearRedactRects, runRedact,
    privLogFile, setPrivLogFile, privLogEntries, runPrivilegeLog,
    reset,
  };
}
