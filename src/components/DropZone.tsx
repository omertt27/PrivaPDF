"use client";
// DropZone.tsx — drag & drop file upload area

import { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";

const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50 MB

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") {
        setFileError(`"${file.name}" is not a PDF. Please select a .pdf file.`);
        setSelectedFile(null);
        return;
      }
      setFileError(null);
      setSelectedFile({ name: file.name, size: file.size });
      onFile(file);
    },
    [onFile]
  );

  return (
    <>
      <label
        htmlFor="pdf-upload"
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (disabled) return; const file = e.dataTransfer.files[0]; if (file) handleFile(file); }}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          minHeight: selectedFile ? 100 : 220,
          borderRadius: 16,
          border: isDragging
            ? "2px dashed var(--accent)"
            : selectedFile
            ? "2px solid var(--accent)"
            : "2px dashed var(--border)",
          background: isDragging ? "var(--accent-light)" : selectedFile ? "#f0fff4" : "var(--cream)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.15s",
        }}
      >
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf,application/pdf"
          style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
          disabled={disabled}
        />

        {selectedFile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 28px", width: "100%" }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: "var(--accent-light)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <FileText size={22} color="var(--accent)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {fmtSize(selectedFile.size)} · click to change
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 14, padding: "32px 48px", textAlign: "center",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: isDragging ? "var(--accent)" : "var(--paper)",
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}>
              {isDragging ? (
                <FileText size={28} color="#fff" />
              ) : (
                <Upload size={28} color="var(--accent)" />
              )}
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>
                {isDragging ? "Drop your PDF here" : "Drop PDF here or click to browse"}
              </p>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>
                Your file never leaves your device.
              </p>
            </div>
          </div>
        )}
      </label>

      {/* Large-file warning */}
      {selectedFile && selectedFile.size > LARGE_FILE_THRESHOLD && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          marginTop: 10, padding: "12px 16px",
          background: "#fff7ed", border: "1px solid #fbbf72",
          borderRadius: 10, fontSize: 13, color: "#92400e", lineHeight: 1.55,
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Large file ({fmtSize(selectedFile.size)}).</strong> In-browser processing works fine, but may take 15–30 s and needs a free tab or two of RAM. Close other tabs for best results.
          </span>
        </div>
      )}

      {fileError && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginTop: 8, fontSize: 13, color: "#b0392a",
        }}>
          <AlertCircle size={14} />
          {fileError}
        </div>
      )}
    </>
  );
}
