"use client";
// BatchQueue.tsx — Batch conversion queue UI (Pro feature)

import { useCallback } from "react";
import { X, CheckCircle, AlertCircle, Loader, FileText, Plus } from "lucide-react";
import type { BatchJob } from "@/hooks/useConverter";

interface BatchQueueProps {
  jobs: BatchJob[];
  onRemove: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onRun: () => void;
  isRunning: boolean;
  isPro: boolean;
}

export function BatchQueue({ jobs, onRemove, onAddFiles, onRun, isRunning, isPro }: BatchQueueProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
      if (files.length) onAddFiles(files);
    },
    [onAddFiles]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length) onAddFiles(files);
    },
    [onAddFiles]
  );

  const queued = jobs.filter((j) => j.status === "queued").length;
  const done = jobs.filter((j) => j.status === "done").length;
  const errored = jobs.filter((j) => j.status === "error").length;

  if (!isPro) {
    return (
      <div style={{
        padding: "20px 24px",
        background: "var(--cream)",
        border: "1.5px dashed var(--border)",
        borderRadius: 12,
        textAlign: "center",
      }}>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>
          🔒 Batch conversion is a <strong style={{ color: "var(--ink)" }}>Pro feature</strong>
        </p>
        <p style={{ fontSize: 12, color: "var(--muted)" }}>
          Convert multiple PDFs in one click. Upgrade for $19 one-time.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Drop area to add more files */}
      <label
        htmlFor="batch-input"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "14px 20px",
          border: "1.5px dashed var(--border)",
          borderRadius: 12,
          background: "var(--cream)",
          cursor: "pointer",
          fontSize: 13,
          color: "var(--muted)",
          transition: "border-color 0.15s",
        }}
      >
        <Plus size={14} />
        Drop PDFs here or click to add files
        <input
          id="batch-input"
          type="file"
          multiple
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={handleInput}
        />
      </label>

      {/* Job list */}
      {jobs.length > 0 && (
        <div style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--paper)",
        }}>
          {jobs.map((job, idx) => (
            <div
              key={job.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderBottom: idx < jobs.length - 1 ? "1px solid var(--border)" : "none",
                background: job.status === "converting" ? "var(--accent-light)" : "transparent",
              }}
            >
              {/* Status icon */}
              <span style={{ flexShrink: 0, color: statusColor(job.status) }}>
                {job.status === "queued" && <FileText size={16} />}
                {job.status === "converting" && (
                  <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                )}
                {job.status === "done" && <CheckCircle size={16} />}
                {job.status === "error" && <AlertCircle size={16} />}
              </span>

              {/* File name */}
              <span style={{ flex: 1, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {job.file.name}
                <span style={{ marginLeft: 8, fontSize: 11, color: "var(--muted)" }}>
                  ({formatBytes(job.file.size)})
                </span>
              </span>

              {/* Output name or error */}
              {job.status === "done" && job.fileName && (
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>
                  ✓ {job.fileName}
                </span>
              )}
              {job.status === "error" && (
                <span style={{ fontSize: 12, color: "#b0392a" }} title={job.error}>
                  ✗ Failed
                </span>
              )}

              {/* Remove */}
              {(job.status === "queued" || job.status === "error") && (
                <button
                  onClick={() => onRemove(job.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--muted)", flexShrink: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats + run button */}
      {jobs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {jobs.length} file{jobs.length !== 1 ? "s" : ""} · {queued} queued · {done} done
            {errored > 0 ? ` · ${errored} failed` : ""}
          </span>
          <button
            onClick={onRun}
            disabled={isRunning || queued === 0}
            style={{
              background: queued > 0 ? "var(--ink)" : "var(--border)",
              color: queued > 0 ? "var(--paper)" : "var(--muted)",
              border: "none",
              padding: "10px 20px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: queued > 0 ? "pointer" : "not-allowed",
              fontFamily: "var(--sans)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isRunning ? (
              <>
                <Loader size={13} style={{ animation: "spin 1s linear infinite" }} />
                Converting…
              </>
            ) : (
              `Convert ${queued} file${queued !== 1 ? "s" : ""} →`
            )}
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function statusColor(status: BatchJob["status"]): string {
  switch (status) {
    case "done": return "var(--accent)";
    case "error": return "#b0392a";
    case "converting": return "var(--accent)";
    default: return "var(--muted)";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
