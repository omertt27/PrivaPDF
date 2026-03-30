"use client";
// DropZone.tsx — drag & drop file upload area

import { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") {
        setFileError(`"${file.name}" is not a PDF. Please select a .pdf file.`);
        return;
      }
      setFileError(null);
      onFile(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <>
      <label
        htmlFor="pdf-upload"
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          minHeight: 240,
          borderRadius: 16,
          border: isDragging
            ? "2px dashed var(--accent)"
            : "2px dashed var(--border)",
          background: isDragging ? "var(--accent-light)" : "var(--cream)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.15s",
          transform: isDragging ? "scale(1.005)" : "scale(1)",
        }}
      >
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf,application/pdf"
          style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
          onChange={onInputChange}
          disabled={disabled}
        />

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 16, padding: "32px 48px", textAlign: "center",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16,
            background: isDragging ? "var(--accent)" : "var(--paper)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>
            {isDragging ? (
              <FileText size={32} color="#fff" />
            ) : (
              <Upload size={32} color="var(--accent)" />
            )}
          </div>

          <div>
            <p style={{ fontSize: 18, fontWeight: 500, color: "var(--ink)", marginBottom: 6 }}>
              {isDragging ? "Drop your PDF here" : "Drop PDF here or click to browse"}
            </p>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              Any PDF — digital or scanned. Your file never leaves your device.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
            {["PDF → Word / Excel / Text", "Tables preserved", "Works offline"].map((tag) => (
              <span key={tag} style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, color: "var(--accent)", fontWeight: 500,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </label>

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
