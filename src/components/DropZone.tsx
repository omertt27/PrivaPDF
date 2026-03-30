"use client";
// DropZone.tsx — drag & drop file upload area

import { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

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
      className={clsx(
        "relative flex flex-col items-center justify-center w-full min-h-[280px] rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer group",
        isDragging
          ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
          : "border-white/20 bg-white/5 hover:border-blue-400/60 hover:bg-white/8",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <input
        id="pdf-upload"
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={onInputChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-4 px-8 text-center pointer-events-none">
        <div className={clsx(
          "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-200",
          isDragging ? "bg-blue-500/30" : "bg-white/10 group-hover:bg-blue-500/20"
        )}>
          {isDragging ? (
            <FileText className="w-9 h-9 text-blue-400" />
          ) : (
            <Upload className="w-9 h-9 text-white/60 group-hover:text-blue-400 transition-colors" />
          )}
        </div>

        <div>
          <p className="text-xl font-semibold text-white/90">
            {isDragging ? "Drop your PDF here" : "Drop PDF here or click to browse"}
          </p>
          <p className="mt-2 text-sm text-white/40">
            Any PDF — scanned, digital, or mixed. Your file never leaves your device.
          </p>
        </div>

        <div className="flex items-center gap-6 mt-2">
          {["PDF → DOCX", "Tables preserved", "Works offline"].map((tag) => (
            <span key={tag} className="flex items-center gap-1.5 text-xs text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400/70" />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </label>

    {fileError && (
      <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {fileError}
      </div>
    )}
    </>
  );
}
