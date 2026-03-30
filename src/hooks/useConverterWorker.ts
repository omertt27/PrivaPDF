"use client";
// useConverterWorker.ts — manages the Web Worker lifecycle
// Keeps AI inference off the main thread so UI never freezes

import { useEffect, useRef, useCallback, useState } from "react";

export type WorkerStatus =
  | "idle"
  | "loading_models"
  | "models_ready"
  | "processing"
  | "error";

export interface WorkerMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}

export interface UseConverterWorkerReturn {
  status: WorkerStatus;
  loadProgress: { stage: string; percent: number };
  modelsReady: boolean;
  gpuDevice: string;
  memoryWarning: boolean;
  loadModels: () => void;
  runOCR: (imageData: string, pageNum: number) => Promise<string>;
  runLayout: (imageData: string, pageNum: number) => Promise<Record<string, unknown>>;
  dispose: () => void;
}

export function useConverterWorker(): UseConverterWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<WorkerStatus>("idle");
  const [loadProgress, setLoadProgress] = useState({ stage: "Initializing...", percent: 0 });
  const [modelsReady, setModelsReady] = useState(false);
  const [gpuDevice, setGpuDevice] = useState("wasm");
  const [memoryWarning, setMemoryWarning] = useState(false);

  // Pending promise resolvers for async worker calls
  const pendingRef = useRef<Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>>(new Map());

  useEffect(() => {
    // Create worker once on mount — path must be relative for Turbopack/webpack bundling
    const worker = new Worker(new URL("../workers/converter.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const { type, payload } = e.data;

      switch (type) {
        case "LOAD_STATUS":
          setLoadProgress({ stage: payload.stage, percent: payload.percent });
          break;

        case "MODELS_READY":
          setModelsReady(true);
          setStatus("models_ready");
          setGpuDevice(payload.device || "wasm");
          setLoadProgress({ stage: "Ready", percent: 100 });
          break;

        case "LOAD_ERROR":
          setStatus("error");
          setLoadProgress({ stage: `Error: ${payload}`, percent: 0 });
          break;

        case "MEMORY_WARNING":
          setMemoryWarning(true);
          setTimeout(() => setMemoryWarning(false), 5000);
          break;

        case "OCR_DONE": {
          const key = `ocr_${payload.pageNum}`;
          const resolver = pendingRef.current.get(key);
          if (resolver) {
            resolver.resolve(payload.text);
            pendingRef.current.delete(key);
          }
          break;
        }

        case "LAYOUT_DONE": {
          const key = `layout_${payload.pageNum}`;
          const resolver = pendingRef.current.get(key);
          if (resolver) {
            resolver.resolve(payload.layout);
            pendingRef.current.delete(key);
          }
          break;
        }

        case "ERROR": {
          // Reject all pending promises
          for (const [key, resolver] of pendingRef.current.entries()) {
            resolver.reject(new Error(payload));
            pendingRef.current.delete(key);
          }
          setStatus("error");
          break;
        }
      }
    };

    worker.onerror = (err) => {
      setStatus("error");
      setLoadProgress({ stage: `Worker error: ${err.message}`, percent: 0 });
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const loadModels = useCallback(() => {
    if (!workerRef.current) return;
    setStatus("loading_models");
    setLoadProgress({ stage: "Starting...", percent: 0 });
    workerRef.current.postMessage({ type: "LOAD_MODELS" });
  }, []);

  const runOCR = useCallback((imageData: string, pageNum: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) return reject(new Error("Worker not initialized"));
      pendingRef.current.set(`ocr_${pageNum}`, { resolve: resolve as (v: unknown) => void, reject });
      workerRef.current.postMessage({ type: "RUN_OCR", payload: { imageData, pageNum } });
    });
  }, []);

  const runLayout = useCallback((imageData: string, pageNum: number): Promise<Record<string, unknown>> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) return reject(new Error("Worker not initialized"));
      pendingRef.current.set(`layout_${pageNum}`, { resolve: resolve as (v: unknown) => void, reject });
      workerRef.current.postMessage({ type: "RUN_LAYOUT", payload: { imageData, pageNum } });
    });
  }, []);

  const dispose = useCallback(() => {
    workerRef.current?.postMessage({ type: "DISPOSE" });
    setModelsReady(false);
    setStatus("idle");
  }, []);

  return { status, loadProgress, modelsReady, gpuDevice, memoryWarning, loadModels, runOCR, runLayout, dispose };
}
